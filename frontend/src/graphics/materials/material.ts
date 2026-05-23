import type { ShaderPipeline } from '../shaderPipeline';
import type { WebGPUDriver } from '../webGpuDriver';

export interface MaterialUniforms {
    baseColor: [number, number, number];
    roughness: number;
    metallic: number;
}

export class Material {
    private uniformBuffer: GPUBuffer;
    private bindGroup: GPUBindGroup;

    constructor(
        private driver: WebGPUDriver,
        public readonly shader: ShaderPipeline,
        public readonly layout: GPUBindGroupLayout,
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
        this.bindGroup = driver.device.createBindGroup({
            layout: this.layout, // explicit, not from pipeline
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
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
        pass.setBindGroup(1, this.bindGroup);
    }
}

export class MaterialLibrary {
    private cache: Map<string, Material> = new Map();
    private _default?: Material;

    constructor(
        private driver: WebGPUDriver,
        private materialLayout: GPUBindGroupLayout,
        private defaultShader: ShaderPipeline,
    ) {}

    public get default(): Material {
        if (!this._default) {
            this._default = this.get(this.defaultShader, {
                baseColor: [1.0, 0.2, 0.6],
                roughness: 0.5,
                metallic: 0.0,
            });
        }
        return this._default;
    }

    public get(shader: ShaderPipeline, uniforms: MaterialUniforms): Material {
        const key = `${shader.name}:${uniforms.baseColor}:${uniforms.roughness}:${uniforms.metallic}`;
        let material = this.cache.get(key);
        if (!material) {
            material = new Material(this.driver, shader, this.materialLayout, uniforms);
            this.cache.set(key, material);
        }
        return material;
    }
}
