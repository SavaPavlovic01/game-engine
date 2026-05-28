import { compact, simpleFrag, simpleVert, test } from '../generated/shaders';
import { Camera } from './camera';
import { BVHInterceptor, type HitResult } from './collision/BVHInterceptor';
import type { Interceptor } from './collision/interceptor';
import type { AABB } from './collision/ray';
import { StaticBVH } from './collision/StaticBVH';
import { Graphics } from './graphics';
import { InstanceBuffer } from './InstanceBuffer';
import type { DirectionalLight, LightSource } from './lightSource';
import { Material, MaterialLibrary } from './materials/material';
import { Vec3 } from './math/vec';
import type { Mesh, ModelPart } from './mesh';
import type { Model } from './model';
import { ShaderPipeline } from './shaderPipeline';
import { DirectionalShadowMap, type ShadowCaster } from './shadowMap';
import {
    BindGroupBuilder,
    BindGroupLayoutBuilder,
    FRAG,
    TypedBindGroupLayout,
    VERT_FRAG,
    WebGPUDriver,
} from './webGpuDriver';

export class Scene {
    public camera: Camera;
    public models: Model[];

    private inited: boolean = false;

    private pipeline!: GPURenderPipeline;
    private depthTexture!: GPUTexture;

    private vpBuffer!: GPUBuffer;
    private vpBindGroup!: GPUBindGroup;

    private static readonly MAX_DIRECTIONAL_LIGHTS = 4;
    private directionalLightSlots: (DirectionalLight | null)[] = new Array(
        Scene.MAX_DIRECTIONAL_LIGHTS,
    ).fill(null);

    private directionalLightBuffer!: GPUBuffer;

    private static readonly MAX_POINT_LIGHTS = 16;
    private pointLightSlots: ((Model & LightSource) | null)[] = new Array(
        Scene.MAX_POINT_LIGHTS,
    ).fill(null);
    private pointLightBuffer!: GPUBuffer;

    public interceptor: Interceptor = new BVHInterceptor();

    private instanceBuffers: Map<ModelPart, InstanceBuffer> = new Map();

    public staticModelsBvh: StaticBVH = new StaticBVH();

    public materials!: MaterialLibrary;

    constructor(cameraPos: Vec3 = new Vec3(0, 0, 0), cameraRot: Vec3 = new Vec3(0, 0, 0)) {
        this.camera = new Camera(cameraPos, cameraRot);
        this.models = [];
    }

    private defaultShader!: ShaderPipeline;

    public materialBindGroupLayout!: GPUBindGroupLayout;
    public textureBingGroupLayout!: GPUBindGroupLayout;
    public sampler!: GPUSampler;

    private cameraPosBuffer!: GPUBuffer;

    private shadowMap!: DirectionalShadowMap;
    private dsampler!: GPUSampler;

    public init(driver: WebGPUDriver, w: number, h: number) {
        this.inited = true;
        this.sampler = driver.makeSampler();

        const sceneBindGroupLayout = new BindGroupLayoutBuilder(driver.device)
            .uniform(0, VERT_FRAG)
            .uniform(1, FRAG)
            .uniform(2, FRAG)
            .uniform(3, FRAG)
            .uniform(4, VERT_FRAG)
            .sampler(5, FRAG, 'comparison')
            .texture(6, FRAG, 'depth')
            .sampler(7, FRAG, 'non-filtering')
            .build();

        const materialBindGroupLayout = new BindGroupLayoutBuilder(driver.device)
            .uniform(0, FRAG)
            .build();

        const textureBingGroupLayout = new BindGroupLayoutBuilder(driver.device)
            .sampler(0, FRAG, 'filtering')
            .texture(1, FRAG, 'float')
            .build();

        const pipelineLayout = driver.device.createPipelineLayout({
            bindGroupLayouts: [
                sceneBindGroupLayout.layout,
                materialBindGroupLayout.layout,
                textureBingGroupLayout.layout,
            ],
        });

        this.defaultShader = new ShaderPipeline('default', driver, test, pipelineLayout);

        this.depthTexture = driver.device.createTexture({
            size: [w, h],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.directionalLightBuffer = driver.makeBuffer(
            32 * Scene.MAX_DIRECTIONAL_LIGHTS,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.pointLightBuffer = driver.makeBuffer(
            32 * Scene.MAX_POINT_LIGHTS,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.vpBuffer = driver.makeBuffer(64, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

        this.cameraPosBuffer = driver.makeBuffer(
            16,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.shadowMap = new DirectionalShadowMap(driver);

        this.dsampler = driver.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        });

        this.vpBindGroup = sceneBindGroupLayout
            .createBindGroup()
            .buffer(0, this.vpBuffer)
            .buffer(1, this.directionalLightBuffer)
            .buffer(2, this.pointLightBuffer)
            .buffer(3, this.cameraPosBuffer)
            .buffer(4, this.shadowMap.lightViewProjBuffer)
            .sampler(5, this.shadowMap.sampler)
            .textureView(6, this.shadowMap.textureView)
            .sampler(7, this.dsampler)
            .build();

        this.materials = new MaterialLibrary(
            driver,
            materialBindGroupLayout.layout,
            textureBingGroupLayout.layout,
            this.defaultShader,
        );
    }

    private compactInstanceBuffers(driver: WebGPUDriver, encoder: GPUCommandEncoder) {
        const drawCalls = [];
        for (const [part, buffer] of this.instanceBuffers) {
            const compacted = buffer.compact(driver, encoder, part.indices.length);
            drawCalls.push({ part, rawBuffer: buffer, ...compacted });
        }
        return drawCalls;
    }

    public async renderScene(driver: WebGPUDriver) {
        if (!this.inited) {
            this.init(driver, driver.ctx.canvas.width, driver.ctx.canvas.height);
            this.inited = true;
        }
        if (this.models.length === 0) return;

        const vp = this.camera.getProjection().matmul(this.camera.getView());
        driver.device.queue.writeBuffer(this.vpBuffer, 0, vp.toColumnMajor());
        driver.device.queue.writeBuffer(this.cameraPosBuffer, 0, this.camera.position.values);

        const encoder = driver.device.createCommandEncoder();
        const drawCalls = this.compactInstanceBuffers(driver, encoder);

        const casters: ShadowCaster[] = drawCalls.map((d) => ({
            mesh: d.part,
            buffer: d.rawBuffer,
        }));

        this.shadowMap.render(
            driver,
            encoder,
            this.directionalLightSlots[0]!.direction,
            this.interceptor.getWorldBounds(),
            casters,
        );

        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: driver.ctx.getCurrentTexture().createView(),
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store',
            },
        });

        let currentShader: ShaderPipeline | null = null;
        for (const { part, drawBuffer, drawArgsBuffer } of drawCalls) {
            if (part.material.shader !== currentShader) {
                pass.setPipeline(part.material.shader.pipeline);
                pass.setBindGroup(0, this.vpBindGroup);
                currentShader = part.material.shader;
            }
            part.material.bind(pass);
            pass.setVertexBuffer(0, part.getVertexBuffer(driver));
            pass.setIndexBuffer(part.getIndexBuffer(driver), 'uint16');
            pass.setVertexBuffer(1, drawBuffer);
            pass.drawIndexedIndirect(drawArgsBuffer, 0);
        }

        pass.end();
        driver.device.queue.submit([encoder.finish()]);
    }

    private setAndGetInstanceBuffer(driver: WebGPUDriver, part: ModelPart): InstanceBuffer {
        let buffer = this.instanceBuffers.get(part);
        if (!buffer) {
            buffer = new InstanceBuffer(driver, 10000);
            this.instanceBuffers.set(part, buffer);
        }
        return buffer;
    }

    public addObject(driver: WebGPUDriver, model: Model) {
        for (const part of model.parts) {
            part.slot = this.setAndGetInstanceBuffer(driver, part).add(
                driver,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.models.push(model);
        this.interceptor.update(this.models);
    }

    public addStaticObject(driver: WebGPUDriver, model: Model) {
        for (const part of model.parts) {
            part.slot = this.setAndGetInstanceBuffer(driver, part).add(
                driver,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.models.push(model);
        this.interceptor.update(this.models);
        this.staticModelsBvh.addModel(model);
    }

    // TODO: fix removing
    // remove the model from this.models
    public removeObject(driver: WebGPUDriver, model: Model) {
        for (const part of model.parts) {
            this.setAndGetInstanceBuffer(driver, part).remove(driver, part.slot!);
        }
        this.interceptor.update(this.models);
    }

    public shoot(): HitResult | null {
        return this.interceptor.hitFirst(this.camera.shootRay());
    }

    public rotateObject(driver: WebGPUDriver, model: Model, rot: Vec3 = new Vec3(0.1, 0.1, 0.1)) {
        model.rotate(rot);
        for (const part of model.parts) {
            this.setAndGetInstanceBuffer(driver, part).update(
                driver,
                part.slot!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.interceptor.update(this.models);
    }

    public setObjectTranslate(driver: WebGPUDriver, model: Model, position: Vec3) {
        model.setTranslate(position);
        for (const part of model.parts) {
            this.setAndGetInstanceBuffer(driver, part).update(
                driver,
                part.slot!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.interceptor.update(this.models);
    }

    public setObjectRotate(driver: WebGPUDriver, model: Model, rot: Vec3) {
        model.setRotate(rot);
        for (const part of model.parts) {
            this.setAndGetInstanceBuffer(driver, part).update(
                driver,
                part.slot!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.interceptor.update(this.models);
    }

    public offsetObject(driver: WebGPUDriver, model: Model, offset: Vec3) {
        model.translate(offset);
        for (const part of model.parts) {
            this.setAndGetInstanceBuffer(driver, part).update(
                driver,
                part.slot!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
        this.interceptor.update(this.models);
    }

    public addDirectionalLight(driver: WebGPUDriver, light: DirectionalLight) {
        const slot = this.directionalLightSlots.findIndex((s) => s === null);
        if (slot === -1) throw new Error('Max directional lights reached');
        this.directionalLightSlots[slot] = light;
        light.lightSlot = slot;
        this.updateDirectionalLight(driver, light);
    }

    public updateDirectionalLight(driver: WebGPUDriver, light: DirectionalLight) {
        driver.device.queue.writeBuffer(
            this.directionalLightBuffer,
            light.lightSlot * 32,
            light.toFloat32Array(),
        );
    }

    public removeDirectionalLight(driver: WebGPUDriver, light: DirectionalLight) {
        this.directionalLightSlots[light.lightSlot] = null;
        driver.device.queue.writeBuffer(
            this.directionalLightBuffer,
            light.lightSlot * 32,
            new Float32Array(8),
        );
    }

    public addPointLight(driver: WebGPUDriver, light: Model & LightSource) {
        this.addObject(driver, light);
        const slot = this.pointLightSlots.findIndex((s) => s === null);
        if (slot === -1) throw new Error('Max point lights reached');
        this.pointLightSlots[slot] = light;
        light.lightSlot = slot;
        this.updatePointLight(driver, light);
    }

    public updatePointLight(driver: WebGPUDriver, light: Model & LightSource) {
        driver.device.queue.writeBuffer(
            this.pointLightBuffer,
            light.lightSlot * 32,
            light.toFloat32Array(),
        );
    }

    public removePointLight(driver: WebGPUDriver, light: Model & LightSource) {
        this.pointLightSlots[light.lightSlot] = null;
        this.removeObject(driver, light);
        driver.device.queue.writeBuffer(
            this.pointLightBuffer,
            light.lightSlot * 32,
            new Float32Array(8),
        );
    }
}
