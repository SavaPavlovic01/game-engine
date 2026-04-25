import type { WebGPUDriver } from './webGpuDriver';

export class InstanceBuffer {
    public buffer: GPUBuffer;
    private freeList: number[];
    private capacity: number;

    constructor(device: GPUDevice, capacity: number) {
        this.capacity = capacity;
        this.buffer = device.createBuffer({
            size: 64 * capacity,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.freeList = Array.from({ length: capacity }, (_, i) => i).reverse();
    }

    add(driver: WebGPUDriver, m: Float32Array): number {
        const slot = this.freeList.pop()!;
        driver.device.queue.writeBuffer(this.buffer, slot * 64, m);
        return slot;
    }

    remove(slot: number) {
        this.freeList.push(slot);
    }

    update(driver: WebGPUDriver, slot: number, m: Float32Array) {
        driver.device.queue.writeBuffer(this.buffer, slot * 64, m);
    }
}
