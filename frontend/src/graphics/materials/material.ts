import type { ShaderPipeline } from '../shaderPipeline';
import type { WebGPUDriver } from '../webGpuDriver';

export interface MaterialUniforms {
    baseColor: [number, number, number];
    roughness: number;
    metallic: number;
}

export const MaterialId = {
    Default: 'default',
} as const;

export class Material {
    private uniformBuffer: GPUBuffer;
    private materialBindGroup: GPUBindGroup;
    private textureBindGroup: GPUBindGroup;

    constructor(
        private driver: WebGPUDriver,
        public readonly shader: ShaderPipeline,
        public readonly materialLayout: GPUBindGroupLayout,
        textureLayout: GPUBindGroupLayout,
        sampler: GPUSampler,
        defaultTexture: GPUTexture,
        texture?: GPUTexture,
        public uniforms: MaterialUniforms = {
            baseColor: [0.8, 0.8, 0.8],
            roughness: 0.5,
            metallic: 0.0,
        },
    ) {
        this.uniformBuffer = driver.makeBuffer(
            32,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.materialBindGroup = driver.device.createBindGroup({
            layout: this.materialLayout,
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
        });

        this.textureBindGroup = driver.device.createBindGroup({
            layout: textureLayout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: (texture ?? defaultTexture).createView() },
            ],
        });

        this.upload();
    }

    public upload() {
        const data = new Float32Array([
            ...this.uniforms.baseColor,
            0,
            this.uniforms.roughness,
            this.uniforms.metallic,
            0,
            0,
        ]);
        this.driver.device.queue.writeBuffer(this.uniformBuffer, 0, data);
    }

    public bind(pass: GPURenderPassEncoder) {
        pass.setBindGroup(1, this.materialBindGroup);
        pass.setBindGroup(2, this.textureBindGroup);
    }
}

export class MaterialLibrary {
    private cache: Map<string, Material> = new Map();
    private defaultTexture: GPUTexture;
    private sampler: GPUSampler;

    constructor(
        private driver: WebGPUDriver,
        private materialLayout: GPUBindGroupLayout,
        private textureLayout: GPUBindGroupLayout,
        private defaultShader: ShaderPipeline,
    ) {
        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        this.defaultTexture = driver.device.createTexture({
            size: [1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        driver.device.queue.writeTexture(
            { texture: this.defaultTexture },
            whitePixel,
            { bytesPerRow: 4 },
            [1, 1],
        );
        this.sampler = driver.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });

        this.register(MaterialId.Default, {
            baseColor: [1.0, 0.2, 0.6],
            roughness: 0.5,
            metallic: 0.0,
        });
    }

    public register(
        id: string,
        uniforms: MaterialUniforms,
        texture?: GPUTexture,
        shader?: ShaderPipeline,
    ): void {
        const material = new Material(
            this.driver,
            shader ?? this.defaultShader,
            this.materialLayout,
            this.textureLayout,
            this.sampler,
            this.defaultTexture,
            texture,
            uniforms,
        );
        this.cache.set(id, material);
    }

    public has(id: string): boolean {
        return this.cache.has(id);
    }

    // Resolve a materialId to a Material. Falls back to default if not found.
    public resolve(id: string): Material {
        const material = this.cache.get(id) ?? this.cache.get(MaterialId.Default);
        if (!material) throw new Error('MaterialLibrary: default material not registered');
        return material;
    }

    public async loadTexture(url: string): Promise<GPUTexture> {
        const img = new Image();
        img.src = url;
        await img.decode();
        const bitmap = await createImageBitmap(img);
        const texture = this.driver.device.createTexture({
            size: [bitmap.width, bitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.driver.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
            bitmap.width,
            bitmap.height,
        ]);
        return texture;
    }
}
