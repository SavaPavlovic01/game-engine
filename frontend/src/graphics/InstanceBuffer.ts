import { compact } from '../generated/shaders';
import type { WebGPUDriver } from './webGpuDriver';

const GPU_THRESHOLD = 1000;
const SLOT_SIZE = 80; // 64 bytes matrix + 16 bytes alive + padding

export class InstanceBuffer {
    public readonly capacity: number;
    public readonly forceCPU: boolean;

    public buffer: GPUBuffer;

    private cpuBuffer: ArrayBuffer;
    private freeList: number[];
    private liveCount: number = 0;

    private cleanBuffer!: GPUBuffer;
    private drawArgsBuffer!: GPUBuffer;
    private compactPipeline!: GPUComputePipeline;
    private compactBindGroup!: GPUBindGroup;

    private cpuCleanBuffer!: GPUBuffer;
    private cpuDrawArgsBuffer!: GPUBuffer;

    constructor(driver: WebGPUDriver, capacity: number, forceCPU: boolean = false) {
        this.capacity = capacity;
        this.forceCPU = forceCPU;
        this.freeList = Array.from({ length: capacity }, (_, i) => i).reverse();
        this.cpuBuffer = new ArrayBuffer(SLOT_SIZE * capacity);

        this.buffer = driver.device.createBuffer({
            size: SLOT_SIZE * capacity,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.initGPUCompaction(driver);
        this.initCPUCompaction(driver);
    }

    private initGPUCompaction(driver: WebGPUDriver) {
        this.cleanBuffer = driver.device.createBuffer({
            size: 64 * this.capacity,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        });

        this.drawArgsBuffer = driver.device.createBuffer({
            size: 5 * 4,
            usage:
                GPUBufferUsage.INDIRECT |
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_DST |
                GPUBufferUsage.COPY_SRC,
        });

        const shader = driver.device.createShaderModule({ code: compact });
        this.compactPipeline = driver.device.createComputePipeline({
            layout: 'auto',
            compute: { module: shader, entryPoint: 'main' },
        });

        this.compactBindGroup = driver.device.createBindGroup({
            layout: this.compactPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.buffer } },
                { binding: 1, resource: { buffer: this.cleanBuffer } },
                { binding: 2, resource: { buffer: this.drawArgsBuffer } },
            ],
        });
    }

    private initCPUCompaction(driver: WebGPUDriver) {
        this.cpuCleanBuffer = driver.device.createBuffer({
            size: 64 * this.capacity,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.cpuDrawArgsBuffer = driver.device.createBuffer({
            size: 5 * 4,
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
        });
    }

    public add(driver: WebGPUDriver, matrix: Float32Array): number {
        const slot = this.freeList.pop()!;
        this.liveCount++;

        new Float32Array(this.cpuBuffer, slot * SLOT_SIZE, 16).set(matrix);
        new Uint32Array(this.cpuBuffer, slot * SLOT_SIZE + 64, 1)[0] = 1;

        driver.device.queue.writeBuffer(
            this.buffer,
            slot * SLOT_SIZE,
            this.cpuBuffer,
            slot * SLOT_SIZE,
            SLOT_SIZE,
        );
        return slot;
    }

    public remove(driver: WebGPUDriver, slot: number) {
        this.liveCount--;
        this.freeList.push(slot);

        new Uint32Array(this.cpuBuffer, slot * SLOT_SIZE + 64, 1)[0] = 0;

        const dead = new Uint32Array([0]);
        driver.device.queue.writeBuffer(this.buffer, slot * SLOT_SIZE + 64, dead);
    }

    public update(driver: WebGPUDriver, slot: number, matrix: Float32Array) {
        new Float32Array(this.cpuBuffer, slot * SLOT_SIZE, 16).set(matrix);

        driver.device.queue.writeBuffer(this.buffer, slot * SLOT_SIZE, matrix);
    }

    public compact(
        driver: WebGPUDriver,
        encoder: GPUCommandEncoder,
        indexCount: number,
    ): {
        drawBuffer: GPUBuffer;
        drawArgsBuffer: GPUBuffer;
    } {
        if (this.forceCPU || this.liveCount < GPU_THRESHOLD) {
            return this.compactCPU(driver, indexCount);
        } else {
            return this.compactGPU(driver, encoder, indexCount);
        }
    }

    private compactCPU(
        driver: WebGPUDriver,
        indexCount: number,
    ): {
        drawBuffer: GPUBuffer;
        drawArgsBuffer: GPUBuffer;
    } {
        const packed = new Float32Array(this.liveCount * 16);
        let writeIndex = 0;

        const aliveFlags = new Uint32Array(this.cpuBuffer);
        const matrices = new Float32Array(this.cpuBuffer);

        for (let slot = 0; slot < this.capacity; slot++) {
            const aliveOffset = (slot * SLOT_SIZE + 64) / 4;
            if (aliveFlags[aliveOffset] === 1) {
                const matOffset = (slot * SLOT_SIZE) / 4;
                packed.set(matrices.subarray(matOffset, matOffset + 16), writeIndex * 16);
                writeIndex++;
            }
        }

        driver.device.queue.writeBuffer(this.cpuCleanBuffer, 0, packed);
        driver.device.queue.writeBuffer(
            this.cpuDrawArgsBuffer,
            0,
            new Uint32Array([indexCount, this.liveCount, 0, 0, 0]),
        );

        return { drawBuffer: this.cpuCleanBuffer, drawArgsBuffer: this.cpuDrawArgsBuffer };
    }

    private compactGPU(
        driver: WebGPUDriver,
        encoder: GPUCommandEncoder,
        indexCount: number,
    ): {
        drawBuffer: GPUBuffer;
        drawArgsBuffer: GPUBuffer;
    } {
        driver.device.queue.writeBuffer(
            this.drawArgsBuffer,
            0,
            new Uint32Array([indexCount, 0, 0, 0, 0]),
        );

        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.compactPipeline);
        computePass.setBindGroup(0, this.compactBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.capacity / 64));
        computePass.end();

        return { drawBuffer: this.cleanBuffer, drawArgsBuffer: this.drawArgsBuffer };
    }
}
