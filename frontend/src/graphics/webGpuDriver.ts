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

    public async loadTexture(path: string): Promise<GPUTexture> {
        const img = new Image();
        img.src = 'stone.png';
        await img.decode();
        const bitmap = await createImageBitmap(img);

        const texture = this.device.createTexture({
            size: [bitmap.width, bitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
            bitmap.width,
            bitmap.height,
        ]);

        return texture;
    }

    public makeSampler() {
        return this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });
    }
}

type BufferBindingType = 'uniform' | 'storage' | 'read-only-storage';
type SamplerBindingType = 'filtering' | 'non-filtering' | 'comparison';
type TextureSampleType = 'float' | 'unfilterable-float' | 'depth' | 'sint' | 'uint';
type StorageTextureAccess = 'write-only' | 'read-only' | 'read-write';
type Visibility = GPUShaderStageFlags;

const VERT_FRAG = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
const VERT = GPUShaderStage.VERTEX;
const FRAG = GPUShaderStage.FRAGMENT;

type TypedEntry<B extends number> = { binding: B } & (
    | { buffer: GPUBufferBindingLayout }
    | { sampler: GPUSamplerBindingLayout }
    | { texture: GPUTextureBindingLayout }
    | { storageTexture: GPUStorageTextureBindingLayout }
) & { visibility: Visibility };

type UnfilledBindings<
    TEntries extends readonly TypedEntry<number>[],
    TFilled extends number,
> = Exclude<TEntries[number]['binding'], TFilled>;

class BindGroupLayoutBuilder<TEntries extends readonly TypedEntry<number>[] = []> {
    private readonly entries: GPUBindGroupLayoutEntry[] = [];

    constructor(private readonly device: GPUDevice) {}

    private add<E extends TypedEntry<number>>(
        entry: E,
    ): BindGroupLayoutBuilder<readonly [...TEntries, E]> {
        this.entries.push(entry);
        return this as any;
    }

    uniform<B extends number>(
        binding: B,
        visibility: Visibility,
        type: BufferBindingType = 'uniform',
    ) {
        return this.add({ binding, visibility, buffer: { type } });
    }

    sampler<B extends number>(
        binding: B,
        visibility: Visibility,
        type: SamplerBindingType = 'filtering',
    ) {
        return this.add({ binding, visibility, sampler: { type } });
    }

    texture<B extends number>(
        binding: B,
        visibility: Visibility,
        sampleType: TextureSampleType = 'float',
    ) {
        return this.add({ binding, visibility, texture: { sampleType } });
    }

    storageTexture<B extends number>(
        binding: B,
        visibility: Visibility,
        format: GPUTextureFormat,
        access: StorageTextureAccess = 'write-only',
    ) {
        return this.add({ binding, visibility, storageTexture: { format, access } });
    }

    build(): TypedBindGroupLayout<TEntries> {
        const layout = this.device.createBindGroupLayout({ entries: this.entries });
        return new TypedBindGroupLayout(this.device, layout, this.entries as unknown as TEntries);
    }
}

export class TypedBindGroupLayout<TEntries extends readonly TypedEntry<number>[]> {
    constructor(
        private readonly device: GPUDevice,
        readonly layout: GPUBindGroupLayout,
        private readonly entries: TEntries,
    ) {}

    createBindGroup(): BindGroupBuilder<TEntries> {
        return new BindGroupBuilder(this.device, this, this.entries);
    }
}

export class BindGroupBuilder<
    TEntries extends readonly TypedEntry<number>[],
    TFilled extends number = never,
> {
    private readonly entries: GPUBindGroupEntry[] = [];

    constructor(
        private readonly device: GPUDevice,
        private readonly layout: TypedBindGroupLayout<TEntries>,
        private readonly layoutEntries: TEntries,
    ) {}

    buffer<B extends UnfilledBindings<TEntries, TFilled>>(
        binding: B,
        buffer: GPUBuffer,
    ): BindGroupBuilder<TEntries, TFilled | B> {
        this.entries.push({ binding, resource: { buffer } });
        return this as unknown as BindGroupBuilder<TEntries, TFilled | B>;
    }

    sampler<B extends UnfilledBindings<TEntries, TFilled>>(
        binding: B,
        sampler: GPUSampler,
    ): BindGroupBuilder<TEntries, TFilled | B> {
        this.entries.push({ binding, resource: sampler });
        return this as unknown as BindGroupBuilder<TEntries, TFilled | B>;
    }

    textureView<B extends UnfilledBindings<TEntries, TFilled>>(
        binding: B,
        view: GPUTextureView,
    ): BindGroupBuilder<TEntries, TFilled | B> {
        this.entries.push({ binding, resource: view });
        return this as unknown as BindGroupBuilder<TEntries, TFilled | B>;
    }

    build(..._: UnfilledBindings<TEntries, TFilled> extends never ? [] : [never]): GPUBindGroup {
        return this.device.createBindGroup({
            layout: this.layout.layout,
            entries: this.entries,
        });
    }
}

export { VERT_FRAG, VERT, FRAG };
export { BindGroupLayoutBuilder };
