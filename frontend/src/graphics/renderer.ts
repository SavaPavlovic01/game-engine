import { test } from '../generated/shaders';
import type { Scene } from './scene';
import { LightManager } from './lightManager';
import { ObjectRegistry } from './objectRegistry';
import { MaterialLibrary } from './materials/material';
import { ShaderPipeline } from './shaderPipeline';
import { DirectionalShadowMap, type ShadowCaster } from './shadowMap';
import type { Model } from './model';
import type { Vec3 } from './math/vec';
import { BindGroupLayoutBuilder, FRAG, VERT_FRAG, type WebGPUDriver } from './webGpuDriver';

export interface IRenderer {
    registerObject(model: Model): void;
    unregisterObject(model: Model): void;

    syncTransform(model: Model): void;

    render(scene: Scene): void;
}

export class Renderer implements IRenderer {
    private lights: LightManager;
    private objects: ObjectRegistry;
    public materials!: MaterialLibrary;

    private vpBuffer!: GPUBuffer;
    private cameraPosBuffer!: GPUBuffer;
    private vpBindGroup!: GPUBindGroup;

    private depthTexture!: GPUTexture;
    private shadowMap!: DirectionalShadowMap;
    private dsampler!: GPUSampler;

    private defaultShader!: ShaderPipeline;

    private inited = false;

    constructor(private driver: WebGPUDriver) {
        this.lights = new LightManager(driver);
        this.objects = new ObjectRegistry(driver);
    }

    public init(w: number, h: number) {
        this.inited = true;

        const sceneBindGroupLayout = new BindGroupLayoutBuilder(this.driver.device)
            .uniform(0, VERT_FRAG)
            .uniform(1, FRAG)
            .uniform(2, FRAG)
            .uniform(3, FRAG)
            .uniform(4, VERT_FRAG)
            .sampler(5, FRAG, 'comparison')
            .texture(6, FRAG, 'depth')
            .sampler(7, FRAG, 'non-filtering')
            .build();

        const materialBindGroupLayout = new BindGroupLayoutBuilder(this.driver.device)
            .uniform(0, FRAG)
            .build();

        const textureBindGroupLayout = new BindGroupLayoutBuilder(this.driver.device)
            .sampler(0, FRAG, 'filtering')
            .texture(1, FRAG, 'float')
            .build();

        const pipelineLayout = this.driver.device.createPipelineLayout({
            bindGroupLayouts: [
                sceneBindGroupLayout.layout,
                materialBindGroupLayout.layout,
                textureBindGroupLayout.layout,
            ],
        });

        this.defaultShader = new ShaderPipeline('default', this.driver, test, pipelineLayout);

        this.depthTexture = this.driver.device.createTexture({
            size: [w, h],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.vpBuffer = this.driver.makeBuffer(
            64,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );
        this.cameraPosBuffer = this.driver.makeBuffer(
            16,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.shadowMap = new DirectionalShadowMap(this.driver);

        this.dsampler = this.driver.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        });

        this.vpBindGroup = sceneBindGroupLayout
            .createBindGroup()
            .buffer(0, this.vpBuffer)
            .buffer(1, this.lights.directionalBuffer)
            .buffer(2, this.lights.pointBuffer)
            .buffer(3, this.cameraPosBuffer)
            .buffer(4, this.shadowMap.lightViewProjBuffer)
            .sampler(5, this.shadowMap.sampler)
            .textureView(6, this.shadowMap.textureView)
            .sampler(7, this.dsampler)
            .build();

        this.materials = new MaterialLibrary(
            this.driver,
            materialBindGroupLayout.layout,
            textureBindGroupLayout.layout,
            this.defaultShader,
        );
    }

    public registerObject(model: Model) {
        this.objects.register(model);
    }

    public unregisterObject(model: Model) {
        this.objects.unregister(model);
    }

    public syncTransform(model: Model) {
        this.objects.updateTransform(model);
    }

    public render(scene: Scene) {
        if (!this.inited) {
            this.init(this.driver.ctx.canvas.width, this.driver.ctx.canvas.height);
        }
        if (scene.models.length === 0) return;

        const vp = scene.camera.getProjection().matmul(scene.camera.getView());
        const vpRaw = vp.toColumnMajor();
        this.driver.device.queue.writeBuffer(this.vpBuffer, 0, vpRaw);
        this.driver.device.queue.writeBuffer(this.cameraPosBuffer, 0, scene.camera.position.values);

        this.lights.sync(scene);

        const encoder = this.driver.device.createCommandEncoder();
        const drawCalls = this.objects.compactAndGetDrawCalls(encoder, this.materials);

        const primaryLight = this.lights.getPrimaryDirectionalLight();
        if (primaryLight) {
            const casters: ShadowCaster[] = drawCalls.map((d) => ({
                mesh: d.part,
                buffer: d.rawBuffer,
            }));
            this.shadowMap.render(
                this.driver,
                encoder,
                primaryLight.direction,
                scene.interceptor.getWorldBounds(),
                casters,
            );
        }

        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: this.driver.ctx.getCurrentTexture().createView(),
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store',
            },
        });

        scene.skybox?.render(this.driver, pass, vpRaw);

        let currentMaterialId: string | null = null;
        let currentShader: ShaderPipeline | null = null;

        for (const { part, drawBuffer, drawArgsBuffer } of drawCalls) {
            if (part.materialId !== currentMaterialId) {
                const material = this.materials.resolve(part.materialId);

                if (material.shader !== currentShader) {
                    pass.setPipeline(material.shader.pipeline);
                    pass.setBindGroup(0, this.vpBindGroup);
                    currentShader = material.shader;
                }

                material.bind(pass);
                currentMaterialId = part.materialId;
            }

            pass.setVertexBuffer(0, part.getVertexBuffer(this.driver));
            pass.setIndexBuffer(part.getIndexBuffer(this.driver), 'uint16');
            pass.setVertexBuffer(1, drawBuffer);
            pass.drawIndexedIndirect(drawArgsBuffer, 0);
        }

        pass.end();
        this.driver.device.queue.submit([encoder.finish()]);
    }
}
