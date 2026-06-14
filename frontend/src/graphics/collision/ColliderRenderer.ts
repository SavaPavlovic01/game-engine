import type { WebGPUDriver } from '../webGpuDriver';
import type { Collider } from './Collider';

const DEBUG_WGSL = /* wgsl */ `
struct Scene {
    vp: mat4x4f,
};

@group(0) @binding(0) var<uniform> scene: Scene;

struct VSIn {
    @location(0) pos: vec3f,
};

struct VSOut {
    @builtin(position) clip: vec4f,
};

@vertex
fn vs(in: VSIn) -> VSOut {
    var out: VSOut;
    out.clip = scene.vp * vec4f(in.pos, 1.0);
    return out;
}

@fragment
fn fs() -> @location(0) vec4f {
    return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

export type DepthMode = 'always' | 'normal';

export class ColliderDebugRenderer {
    private pipeline!: GPURenderPipeline;
    private vpBuffer!: GPUBuffer;
    private vpBindGroup!: GPUBindGroup;
    private inited = false;

    constructor(
        private driver: WebGPUDriver,
        public depthMode: DepthMode = 'normal',
    ) {}

    private init(colorFormat: GPUTextureFormat) {
        this.inited = true;
        const device = this.driver.device;

        const shader = device.createShaderModule({ code: DEBUG_WGSL });

        const vpBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' },
                },
            ],
        });

        const layout = device.createPipelineLayout({
            bindGroupLayouts: [vpBindGroupLayout],
        });

        this.pipeline = device.createRenderPipeline({
            layout,
            vertex: {
                module: shader,
                entryPoint: 'vs',
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                    },
                ],
            },
            fragment: {
                module: shader,
                entryPoint: 'fs',
                targets: [{ format: colorFormat }],
            },
            primitive: {
                topology: 'line-list',
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: false,
                depthCompare: this.depthMode === 'always' ? 'always' : 'less-equal',
            },
        });

        this.vpBuffer = this.driver.makeBuffer(
            64,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.vpBindGroup = device.createBindGroup({
            layout: vpBindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: this.vpBuffer } }],
        });
    }

    public render(
        colliders: Collider[],
        pass: GPURenderPassEncoder,
        vpMatrix: Float32Array,
        colorFormat: GPUTextureFormat = 'bgra8unorm',
    ) {
        if (!this.inited) this.init(colorFormat);

        this.driver.device.queue.writeBuffer(this.vpBuffer, 0, vpMatrix);
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.vpBindGroup);

        for (const collider of colliders) {
            const lines = collider.getDebugLines();
            if (lines.length === 0) continue;

            const data = new Float32Array(lines.length * 6);
            let i = 0;
            for (const [a, b] of lines) {
                data[i++] = a.X;
                data[i++] = a.Y;
                data[i++] = a.Z;
                data[i++] = b.X;
                data[i++] = b.Y;
                data[i++] = b.Z;
            }

            const buf = this.driver.makeBuffer(
                data.byteLength,
                GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            );
            this.driver.device.queue.writeBuffer(buf, 0, data);

            pass.setVertexBuffer(0, buf);
            pass.draw(lines.length * 2);
        }
    }
}
