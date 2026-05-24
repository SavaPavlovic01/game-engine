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
import type { Mesh } from './mesh';
import type { Model } from './model';
import { ShaderPipeline } from './shaderPipeline';
import { DirectionalShadowMap, type ShadowCaster } from './shadowMap';
import { WebGPUDriver } from './webGpuDriver';

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

    private instanceBuffers: Map<Mesh, Map<Material, InstanceBuffer>> = new Map();

    public staticModelsBvh: StaticBVH = new StaticBVH();

    public materials!: MaterialLibrary;

    constructor(cameraPos: Vec3 = new Vec3(0, 0, 0), cameraRot: Vec3 = new Vec3(0, 0, 0)) {
        this.camera = new Camera(cameraPos, cameraRot);
        this.models = [];
    }

    private defaultShader!: ShaderPipeline;

    public sceneBindGroupLayout!: GPUBindGroupLayout;
    public materialBindGroupLayout!: GPUBindGroupLayout;
    public textureBingGroupLayout!: GPUBindGroupLayout;
    public sampler!: GPUSampler;

    private cameraPosBuffer!: GPUBuffer;

    private shadowMap!: DirectionalShadowMap;
    private dsampler!: GPUSampler;

    public init(driver: WebGPUDriver, w: number, h: number) {
        this.inited = true;
        this.sampler = driver.makeSampler();
        this.sceneBindGroupLayout = driver.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' },
                },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' },
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'comparison' },
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'depth' },
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'non-filtering' },
                },
            ],
        });

        this.materialBindGroupLayout = driver.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
            ],
        });

        this.textureBingGroupLayout = driver.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' },
                },
            ],
        });

        const pipelineLayout = driver.device.createPipelineLayout({
            bindGroupLayouts: [
                this.sceneBindGroupLayout,
                this.materialBindGroupLayout,
                this.textureBingGroupLayout,
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

        this.vpBindGroup = driver.device.createBindGroup({
            layout: this.sceneBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.vpBuffer } },
                { binding: 1, resource: { buffer: this.directionalLightBuffer } },
                { binding: 2, resource: { buffer: this.pointLightBuffer } },
                { binding: 3, resource: { buffer: this.cameraPosBuffer } },
                { binding: 4, resource: { buffer: this.shadowMap.lightViewProjBuffer } },
                { binding: 5, resource: this.shadowMap.sampler },
                { binding: 6, resource: this.shadowMap.textureView },
                { binding: 7, resource: this.dsampler },
            ],
        });

        this.materials = new MaterialLibrary(
            driver,
            this.materialBindGroupLayout,
            this.textureBingGroupLayout,
            this.defaultShader,
        );
    }

    private compactInstanceBuffers(driver: WebGPUDriver, encoder: GPUCommandEncoder) {
        const drawCalls = [];
        for (const [mesh, byMaterial] of this.instanceBuffers) {
            for (const [material, buffer] of byMaterial) {
                const compacted = buffer.compact(driver, encoder, mesh.indices.length);
                drawCalls.push({ mesh, material, rawBuffer: buffer, ...compacted });
            }
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
            mesh: d.mesh,
            buffer: d.rawBuffer,
        }));

        const tightBounds: AABB = {
            min: new Vec3(-10, -2, -10),
            max: new Vec3(10, 10, 10),
        };

        this.shadowMap.render(
            driver,
            encoder,
            this.directionalLightSlots[0]!.direction,
            tightBounds,
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
        for (const { mesh, material, drawBuffer, drawArgsBuffer } of drawCalls) {
            if (material.shader !== currentShader) {
                pass.setPipeline(material.shader.pipeline);
                pass.setBindGroup(0, this.vpBindGroup);
                currentShader = material.shader;
            }
            material.bind(pass);
            pass.setVertexBuffer(0, mesh.getVertexBuffer(driver));
            pass.setIndexBuffer(mesh.getIndexBuffer(driver), 'uint16');
            pass.setVertexBuffer(1, drawBuffer);
            pass.drawIndexedIndirect(drawArgsBuffer, 0);
        }

        pass.end();
        driver.device.queue.submit([encoder.finish()]);
    }

    private setAndGetInstanceBuffer(driver: WebGPUDriver, mesh: Mesh, material: Material) {
        let byMaterial = this.instanceBuffers.get(mesh);
        if (!byMaterial) {
            byMaterial = new Map();
            this.instanceBuffers.set(mesh, byMaterial);
        }
        let buffer = byMaterial.get(material);
        if (!buffer) {
            buffer = new InstanceBuffer(driver, 10000);
            byMaterial.set(material, buffer);
        }
        return buffer;
    }

    public addObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!;

        model.slot = instanceBuffer.add(driver, model.getModelMatrix().toColumnMajor());

        //this.models[model.slot] = model;
        this.models.push(model);
        this.interceptor.update(this.models);
    }

    public addStaticObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!;

        model.slot = instanceBuffer.add(driver, model.getModelMatrix().toColumnMajor());

        this.models.push(model);
        this.interceptor.update(this.models);
        this.staticModelsBvh.addModel(model);
    }

    // TODO: fix removing
    // remove the model from this.models
    public removeObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!;
        instanceBuffer.remove(driver, model.slot!);
        this.interceptor.update(this.models);
    }

    public shoot(): HitResult | null {
        return this.interceptor.hitFirst(this.camera.shootRay());
    }

    public rotateObject(driver: WebGPUDriver, model: Model, rot: Vec3 = new Vec3(0.1, 0.1, 0.1)) {
        if (model.slot === undefined) return;
        if (this.models.length <= model.slot) return;
        model.rotate(rot);
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!;
        instanceBuffer.update(driver, model.slot, model.getModelMatrix().toColumnMajor());
        this.interceptor.update(this.models);
    }

    public setObjectTranslate(driver: WebGPUDriver, model: Model, position: Vec3) {
        if (model.slot === undefined) {
            console.log('slot not set');
            return;
        }
        model.setTranslate(position);

        this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!.update(
            driver,
            model.slot,
            model.getModelMatrix().toColumnMajor(),
        );

        this.interceptor.update(this.models);
    }

    public setObjectRotate(driver: WebGPUDriver, model: Model, rot: Vec3) {
        if (model.slot === undefined) {
            console.log('slot not set');
            return;
        }
        model.setRotate(rot);

        this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!.update(
            driver,
            model.slot,
            model.getModelMatrix().toColumnMajor(),
        );

        this.interceptor.update(this.models);
    }

    public offsetObject(driver: WebGPUDriver, model: Model, offset: Vec3) {
        if (model.slot === undefined) {
            console.log('slot not set');
            return;
        }
        model.translate(offset);
        this.setAndGetInstanceBuffer(driver, model.mesh, model.material)!.update(
            driver,
            model.slot,
            model.getModelMatrix().toColumnMajor(),
        );
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
