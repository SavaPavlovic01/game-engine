import { BindGroupLayoutBuilder, FRAG, VERT, WebGPUDriver } from './webGpuDriver';
import type { MaterialLibrary } from './materials/material';
import { RenderPipelineBuilder } from './shaderPipeline';
import { skybox } from '../generated/shaders';

export class Skybox {
    private pipeline!: GPURenderPipeline;
    private vpBuffer!: GPUBuffer;
    private vpBindGroup!: GPUBindGroup;
    private skyBindGroup!: GPUBindGroup;
    private inited = false;

    // face order: +X, -X, +Y, -Y, +Z, -Z
    public async init(
        driver: WebGPUDriver,
        faceUrls: [string, string, string, string, string, string],
    ) {
        const device = driver.device;

        const images = await Promise.all(
            faceUrls.map(async (url) => {
                const img = new Image();
                img.src = url;
                await img.decode();
                return createImageBitmap(img);
            }),
        );

        const width = images[0]!.width;
        const height = images[0]!.height;

        const cubeTexture = device.createTexture({
            size: [width, height, 6],
            format: 'rgba8unorm',
            dimension: '2d',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        for (let i = 0; i < 6; i++) {
            device.queue.copyExternalImageToTexture(
                { source: images[i]! },
                { texture: cubeTexture, origin: [0, 0, i] },
                [width, height],
            );
        }

        const vpLayout = new BindGroupLayoutBuilder(device).uniform(0, VERT).build();

        const skyLayout = new BindGroupLayoutBuilder(device)
            .cubeTexture(0, FRAG)
            .sampler(1, FRAG, 'filtering')
            .build();

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [vpLayout.layout, skyLayout.layout],
        });

        this.pipeline = new RenderPipelineBuilder(driver, skybox, pipelineLayout)
            .cullMode('front')
            .depthWrite(false)
            .depthCompare('less-equal')
            .noVertexBuffers()
            .build();

        this.vpBuffer = driver.makeBuffer(64, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

        this.vpBindGroup = vpLayout.createBindGroup().buffer(0, this.vpBuffer).build();

        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        this.skyBindGroup = skyLayout
            .createBindGroup()
            .textureView(0, cubeTexture.createView({ dimension: 'cube' }))
            .sampler(1, sampler)
            .build();

        this.inited = true;
    }

    public render(driver: WebGPUDriver, pass: GPURenderPassEncoder, vp: Float32Array) {
        if (!this.inited) return;
        driver.device.queue.writeBuffer(this.vpBuffer, 0, vp);
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.vpBindGroup);
        pass.setBindGroup(1, this.skyBindGroup);
        pass.draw(36);
    }
}
