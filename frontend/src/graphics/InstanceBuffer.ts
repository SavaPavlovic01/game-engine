import type { WebGPUDriver } from './webGpuDriver';

export class InstanceBuffer {
    public buffer: GPUBuffer;
    private freeList: number[];
    public capacity: number;

    private static readonly slotSize = 80;

    constructor(device: GPUDevice, capacity: number) {
        this.capacity = capacity;
        this.buffer = device.createBuffer({
            size: InstanceBuffer.slotSize * capacity,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        });
        this.freeList = Array.from({ length: capacity }, (_, i) => i).reverse();
    }

    add(driver: WebGPUDriver, m: Float32Array): number {
        const slot = this.freeList.pop()!;
        const data = new ArrayBuffer(80);

        new Float32Array(data, 0, 16).set(m);

        new Uint32Array(data, 64, 1)[0] = 1;

        driver.device.queue.writeBuffer(this.buffer, slot * 80, data);
        return slot;
    }

    remove(driver: WebGPUDriver, slot: number) {
        const dead = new Uint32Array([0]);
        driver.device.queue.writeBuffer(this.buffer, slot * InstanceBuffer.slotSize + 64, dead);
        this.freeList.push(slot);
    }

    update(driver: WebGPUDriver, slot: number, m: Float32Array) {
        driver.device.queue.writeBuffer(this.buffer, slot * InstanceBuffer.slotSize, m);
    }
}
