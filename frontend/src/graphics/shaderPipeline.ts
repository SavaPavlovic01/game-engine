import type { WebGPUDriver } from './webGpuDriver';

export const MESH_VERTEX_LAYOUT: GPUVertexBufferLayout = {
    arrayStride: 24,
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 5, offset: 12, format: 'float32x3' },
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

export class ShaderPipeline {
    public readonly pipeline: GPURenderPipeline;

    constructor(
        public readonly name: string,
        driver: WebGPUDriver,
        wgsl: string,
        sharedLayout: GPUPipelineLayout,
    ) {
        const module = driver.device.createShaderModule({ code: wgsl });
        this.pipeline = driver.device.createRenderPipeline({
            layout: sharedLayout,
            vertex: {
                module,
                entryPoint: 'vs_main',
                buffers: [MESH_VERTEX_LAYOUT, INSTANCE_VERTEX_LAYOUT],
            },
            fragment: {
                module,
                entryPoint: 'fs_main',
                targets: [{ format: driver.format }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });
    }
}
