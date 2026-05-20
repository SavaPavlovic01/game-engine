import { compact, simpleFrag, simpleVert, test } from '../generated/shaders';
import { Camera } from './camera';
import { BVHInterceptor, type HitResult } from './collision/BVHInterceptor';
import type { Interceptor } from './collision/interceptor';
import { StaticBVH } from './collision/StaticBVH';
import { InstanceBuffer } from './InstanceBuffer';
import type { DirectionalLight, LightSource } from './lightSource';
import { Vec3 } from './math/vec';
import type { Mesh } from './mesh';
import type { Model } from './model';
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

    private instanceBuffers: Map<Mesh, InstanceBuffer> = new Map();

    public staticModelsBvh: StaticBVH = new StaticBVH();

    constructor(cameraPos: Vec3 = new Vec3(0, 0, 0), cameraRot: Vec3 = new Vec3(0, 0, 0)) {
        this.camera = new Camera(cameraPos, cameraRot);
        this.models = [];
    }

    public init(driver: WebGPUDriver, w: number, h: number) {
        this.inited = true;
        const format = driver.format;
        const shaderCode = test;

        const shaderModule = driver.device.createShaderModule({
            code: shaderCode,
        });

        this.pipeline = driver.device.createRenderPipeline({
            layout: 'auto',

            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [
                    {
                        arrayStride: 24,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3',
                            },
                            {
                                shaderLocation: 5,
                                offset: 12,
                                format: 'float32x3',
                            },
                        ],
                    },
                    {
                        arrayStride: 64,
                        stepMode: 'instance',
                        attributes: [
                            {
                                shaderLocation: 1,
                                offset: 0,
                                format: 'float32x4',
                            },
                            {
                                shaderLocation: 2,
                                offset: 16,
                                format: 'float32x4',
                            },
                            {
                                shaderLocation: 3,
                                offset: 32,
                                format: 'float32x4',
                            },
                            {
                                shaderLocation: 4,
                                offset: 48,
                                format: 'float32x4',
                            },
                        ],
                    },
                ],
            },

            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [
                    {
                        format,
                    },
                ],
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
        this.vpBindGroup = driver.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.vpBuffer } },
                { binding: 1, resource: { buffer: this.directionalLightBuffer } },
                { binding: 2, resource: { buffer: this.pointLightBuffer } },
            ],
        });
    }

    public async renderScene(driver: WebGPUDriver) {
        if (!this.inited) {
            this.init(driver, driver.ctx.canvas.width, driver.ctx.canvas.height);
            this.inited = true;
        }
        if (this.models.length === 0) return;

        const vp = this.camera.getProjection().matmul(this.camera.getView());
        driver.device.queue.writeBuffer(this.vpBuffer, 0, vp.toColumnMajor());

        const encoder = driver.device.createCommandEncoder();

        const drawCalls: { mesh: Mesh; drawBuffer: GPUBuffer; drawArgsBuffer: GPUBuffer }[] = [];
        for (const [mesh, instanceBuffer] of this.instanceBuffers) {
            const buffers = instanceBuffer.compact(driver, encoder, mesh.indices.length);
            drawCalls.push({
                mesh,
                drawBuffer: buffers.drawBuffer,
                drawArgsBuffer: buffers.drawArgsBuffer,
            });
        }

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

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.vpBindGroup);

        for (const { mesh, drawBuffer, drawArgsBuffer } of drawCalls) {
            pass.setVertexBuffer(0, mesh.getVertexBuffer(driver));
            pass.setIndexBuffer(mesh.getIndexBuffer(driver), 'uint16');
            pass.setVertexBuffer(1, drawBuffer);
            pass.drawIndexedIndirect(drawArgsBuffer, 0);
        }

        pass.end();
        driver.device.queue.submit([encoder.finish()]);
    }

    private setAndGetInstanceBuffer(driver: WebGPUDriver, mesh: Mesh) {
        if (!this.instanceBuffers.has(mesh)) {
            this.instanceBuffers.set(mesh, new InstanceBuffer(driver, 10000));
        }

        return this.instanceBuffers.get(mesh);
    }

    public addObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh)!;

        model.slot = instanceBuffer.add(driver, model.getModelMatrix().toColumnMajor());

        //this.models[model.slot] = model;
        this.models.push(model);
        this.interceptor.update(this.models);
    }

    public addStaticObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh)!;

        model.slot = instanceBuffer.add(driver, model.getModelMatrix().toColumnMajor());

        this.models.push(model);
        this.interceptor.update(this.models);
        this.staticModelsBvh.addModel(model);
    }

    // TODO: fix removing
    // remove the model from this.models
    public removeObject(driver: WebGPUDriver, model: Model) {
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh)!;
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
        const instanceBuffer = this.setAndGetInstanceBuffer(driver, model.mesh)!;
        instanceBuffer.update(driver, model.slot, model.getModelMatrix().toColumnMajor());
        this.interceptor.update(this.models);
    }

    public setObjectTranslate(driver: WebGPUDriver, model: Model, position: Vec3) {
        if (model.slot === undefined) {
            console.log('slot not set');
            return;
        }
        model.setTranslate(position);

        this.setAndGetInstanceBuffer(driver, model.mesh)!.update(
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

        this.setAndGetInstanceBuffer(driver, model.mesh)!.update(
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
        this.setAndGetInstanceBuffer(driver, model.mesh)!.update(
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
