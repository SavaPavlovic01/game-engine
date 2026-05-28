import { STRIDE } from '../constants';
import type { WebGPUDriver } from './webGpuDriver';

export const MESH_VERTEX_LAYOUT: GPUVertexBufferLayout = {
    arrayStride: STRIDE * 4,
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 5, offset: 12, format: 'float32x3' },
        { shaderLocation: 6, offset: 24, format: 'float32x2' },
    ],
};

export const INSTANCE_VERTEX_LAYOUT: GPUVertexBufferLayout = {
    arrayStride: 64,
    stepMode: 'instance',
    attributes: [
        { shaderLocation: 1, offset: 0, format: 'float32x4' },
        { shaderLocation: 2, offset: 16, format: 'float32x4' },
        { shaderLocation: 3, offset: 32, format: 'float32x4' },
        { shaderLocation: 4, offset: 48, format: 'float32x4' },
    ],
};

export class RenderPipelineBuilder {
    private _cullMode: GPUCullMode = 'back';
    private _depthWrite: boolean = true;
    private _depthCompare: GPUCompareFunction = 'less';
    private _topology: GPUPrimitiveTopology = 'triangle-list';
    private _vertexBuffers: GPUVertexBufferLayout[] = [MESH_VERTEX_LAYOUT, INSTANCE_VERTEX_LAYOUT];
    private _blend?: GPUBlendState;
    private _depthFormat: GPUTextureFormat = 'depth24plus';
    private _hasFragment: boolean = true;

    public depthFormat(format: GPUTextureFormat): this {
        this._depthFormat = format;
        return this;
    }

    public noFragment(): this {
        this._hasFragment = false;
        return this;
    }

    constructor(
        private readonly driver: WebGPUDriver,
        private readonly wgsl: string,
        private readonly layout: GPUPipelineLayout,
    ) {}

    public cullMode(mode: GPUCullMode): this {
        this._cullMode = mode;
        return this;
    }

    public depthWrite(enabled: boolean): this {
        this._depthWrite = enabled;
        return this;
    }

    public depthCompare(fn: GPUCompareFunction): this {
        this._depthCompare = fn;
        return this;
    }

    public topology(t: GPUPrimitiveTopology): this {
        this._topology = t;
        return this;
    }

    public noVertexBuffers(): this {
        this._vertexBuffers = [];
        return this;
    }

    public vertexBuffers(buffers: GPUVertexBufferLayout[]): this {
        this._vertexBuffers = buffers;
        return this;
    }

    public blend(state: GPUBlendState): this {
        this._blend = state;
        return this;
    }

    public build(): GPURenderPipeline {
        const module = this.driver.device.createShaderModule({ code: this.wgsl });
        return this.driver.device.createRenderPipeline({
            layout: this.layout,
            vertex: {
                module,
                entryPoint: 'vs_main',
                buffers: this._vertexBuffers,
            },
            ...(this._hasFragment
                ? {
                      fragment: {
                          module,
                          entryPoint: 'fs_main',
                          targets: [{ format: this.driver.format }],
                      },
                  }
                : {}),
            primitive: {
                topology: this._topology,
                cullMode: this._cullMode,
            },
            depthStencil: {
                format: this._depthFormat,
                depthWriteEnabled: this._depthWrite,
                depthCompare: this._depthCompare,
            },
        });
    }
}

export class ShaderPipeline {
    public readonly pipeline: GPURenderPipeline;

    constructor(
        public readonly name: string,
        driver: WebGPUDriver,
        wgsl: string,
        sharedLayout: GPUPipelineLayout,
    ) {
        this.pipeline = new RenderPipelineBuilder(driver, wgsl, sharedLayout).build();
    }
}
