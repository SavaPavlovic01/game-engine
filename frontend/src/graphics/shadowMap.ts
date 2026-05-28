import { Mat4 } from './math/mat';
import { Vec3 } from './math/vec';
import type { AABB } from './collision/ray';
import { BindGroupLayoutBuilder, VERT, type WebGPUDriver } from './webGpuDriver';
import type { Mesh } from './mesh';
import type { InstanceBuffer } from './InstanceBuffer';
import {
    MESH_VERTEX_LAYOUT,
    INSTANCE_VERTEX_LAYOUT,
    RenderPipelineBuilder,
} from './shaderPipeline';

const SHADOW_WGSL = `
@group(0) @binding(0) var<uniform> lightViewProj: mat4x4<f32>;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) mvp0: vec4<f32>,
    @location(2) mvp1: vec4<f32>,
    @location(3) mvp2: vec4<f32>,
    @location(4) mvp3: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> @builtin(position) vec4<f32> {
    let m = mat4x4<f32>(input.mvp0, input.mvp1, input.mvp2, input.mvp3);
    return lightViewProj * m * vec4<f32>(input.position, 1.0);
}
`;

export interface ShadowCaster {
    mesh: Mesh;
    buffer: InstanceBuffer;
}

export class DirectionalShadowMap {
    public readonly texture: GPUTexture;
    public readonly textureView: GPUTextureView;
    public readonly sampler: GPUSampler;
    public readonly lightViewProjBuffer: GPUBuffer;

    private readonly pipeline: GPURenderPipeline;
    private readonly bindGroup: GPUBindGroup;

    constructor(
        private readonly driver: WebGPUDriver,
        public readonly size: number = 2048,
    ) {
        this.texture = driver.device.createTexture({
            size: [size, size],
            format: 'depth32float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'shadow map',
        });
        this.textureView = this.texture.createView();
        this.sampler = driver.device.createSampler({
            compare: 'less',
            magFilter: 'linear',
            minFilter: 'linear',
        });

        this.lightViewProjBuffer = driver.makeBuffer(
            64,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        const layout = new BindGroupLayoutBuilder(driver.device).uniform(0, VERT).build();

        this.bindGroup = layout.createBindGroup().buffer(0, this.lightViewProjBuffer).build();

        const pipelineLayout = driver.device.createPipelineLayout({
            bindGroupLayouts: [layout.layout],
        });

        this.pipeline = new RenderPipelineBuilder(driver, SHADOW_WGSL, pipelineLayout)
            .cullMode('front')
            .depthCompare('less')
            .vertexBuffers([MESH_VERTEX_LAYOUT, INSTANCE_VERTEX_LAYOUT])
            .depthFormat('depth32float')
            .noFragment()
            .build();
    }

    public buildLightMatrix(direction: Vec3, sceneBounds: AABB): Mat4 {
        const dir = direction.normalize();
        const center = sceneBounds.min.add(sceneBounds.max).scale(0.5);
        const radius = sceneBounds.max.sub(sceneBounds.min).magnitude() * 0.5;
        const lightPos = center.sub(dir.scale(radius));
        const view = Mat4.lookAt(lightPos, center, new Vec3(0, 1, 0));
        const proj = Mat4.orthographic(-radius, radius, -radius, radius, 0, radius * 2);
        return proj.matmul(view);
    }

    public render(
        driver: WebGPUDriver,
        encoder: GPUCommandEncoder,
        direction: Vec3,
        sceneBounds: AABB,
        casters: ShadowCaster[],
    ): Mat4 {
        const lightViewProj = this.buildLightMatrix(direction, sceneBounds);
        driver.device.queue.writeBuffer(this.lightViewProjBuffer, 0, lightViewProj.toColumnMajor());

        const pass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.textureView,
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store',
            },
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);

        for (const { mesh, buffer } of casters) {
            const compacted = buffer.getLastCompacted();
            if (!compacted) continue;
            pass.setVertexBuffer(0, mesh.getVertexBuffer(driver));
            pass.setIndexBuffer(mesh.getIndexBuffer(driver), 'uint16');
            pass.setVertexBuffer(1, compacted.drawBuffer);
            pass.drawIndexedIndirect(compacted.drawArgsBuffer, 0);
        }

        pass.end();
        return lightViewProj;
    }
}
