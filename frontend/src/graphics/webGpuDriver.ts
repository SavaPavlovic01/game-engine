export class WebGPUDriver {
    public device: GPUDevice;
    public format: GPUTextureFormat;
    private sampler: GPUSampler;
    public ctx!: GPUCanvasContext;

    constructor(device: GPUDevice, canvasFormat: GPUTextureFormat) {
        this.device = device;
        this.format = canvasFormat;
        this.sampler = device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });
    }

    static async create(): Promise<WebGPUDriver> {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No WebGPU adapter found');
        const device = await adapter.requestDevice();
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        return new WebGPUDriver(device, canvasFormat);
    }

    public fillBuffer(data: ArrayBufferView, usage: number, label?: string) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: usage,
        });

        this.device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    }

    public makeBuffer(size: number, usage: number) {
        return this.device.createBuffer({
            size: size,
            usage: usage,
        });
    }
    public async readBuffer(buffer: GPUBuffer, size: number): Promise<ArrayBuffer> {
        const debugBuffer = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(buffer, 0, debugBuffer, 0, size);
        this.device.queue.submit([encoder.finish()]);

        await debugBuffer.mapAsync(GPUMapMode.READ);
        const result = debugBuffer.getMappedRange().slice(0);
        debugBuffer.unmap();
        debugBuffer.destroy();
        return result;
    }
}
