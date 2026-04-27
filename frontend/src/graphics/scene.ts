import { compact, simpleFrag, simpleVert } from '../generated/shaders';
import { Camera } from './camera';
import { InstanceBuffer } from './InstanceBuffer';
import { Vec3 } from './math/vec';
import type { Model } from './model';
import { WebGPUDriver } from './webGpuDriver';

export class Scene {
    public camera: Camera;
    public models: Model[];

    private inited: boolean = false;

    private pipeline!: GPURenderPipeline;
    private depthTexture!: GPUTexture;

    private cubeInstanceBuffer!: InstanceBuffer;

    private vpBuffer!: GPUBuffer;
    private vpBindGroup!: GPUBindGroup;

    constructor() {
        const pos = new Vec3(0, 0, 0);
        const rot = new Vec3(0, 0, 0);
        this.camera = new Camera(pos, rot);
        this.models = [];
    }

    public init(driver: WebGPUDriver, w: number, h: number) {
        this.inited = true;
        const format = driver.format;
        const shaderCode = simpleVert + '\n' + simpleFrag;

        this.cubeInstanceBuffer = new InstanceBuffer(driver.device, 10000);

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
                        arrayStride: 12,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
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

        this.vpBuffer = driver.makeBuffer(64, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        this.vpBindGroup = driver.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.vpBuffer } }],
        });

        this.initCompactPipeline(driver);
    }

    private cleanBuffer!: GPUBuffer;
    private drawArgsBuffer!: GPUBuffer;
    private compactPipeline!: GPUComputePipeline;
    private compactBindGroup!: GPUBindGroup;

    private initCompactPipeline(driver: WebGPUDriver) {
        this.cleanBuffer = driver.device.createBuffer({
            size: 64 * this.cubeInstanceBuffer.capacity,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        });

        this.drawArgsBuffer = driver.device.createBuffer({
            size: 5 * 4,
            usage:
                GPUBufferUsage.INDIRECT |
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_DST |
                GPUBufferUsage.COPY_SRC,
        });

        const compactShader = driver.device.createShaderModule({ code: compact });
        this.compactPipeline = driver.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: compactShader,
                entryPoint: 'main',
            },
        });

        this.compactBindGroup = driver.device.createBindGroup({
            layout: this.compactPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.cubeInstanceBuffer.buffer } },
                { binding: 1, resource: { buffer: this.cleanBuffer } },
                { binding: 2, resource: { buffer: this.drawArgsBuffer } },
            ],
        });
    }

    public async renderScene(driver: WebGPUDriver) {
        if (!this.inited) {
            this.init(driver, driver.ctx.canvas.width, driver.ctx.canvas.height);
            this.inited = true;
        }

        driver.device.queue.writeBuffer(this.drawArgsBuffer, 0, new Uint32Array([36, 0, 0, 0, 0]));
        const encoder = driver.device.createCommandEncoder();

        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.compactPipeline);
        computePass.setBindGroup(0, this.compactBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.cubeInstanceBuffer.capacity / 64));
        computePass.end();

        const vp = this.camera.getProjection().matmul(this.camera.getView());
        driver.device.queue.writeBuffer(this.vpBuffer, 0, vp.toColumnMajor());

        const currentTexture = driver.ctx.getCurrentTexture();
        const colorView = currentTexture.createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: colorView,
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

        pass.setVertexBuffer(0, this.models[0]!.getVertexBuffer(driver));
        pass.setIndexBuffer(this.models[0]!.getIndexbuffer(driver), 'uint16');

        pass.setVertexBuffer(1, this.cleanBuffer);

        pass.drawIndexedIndirect(this.drawArgsBuffer, 0);

        pass.end();
        driver.device.queue.submit([encoder.finish()]);
    }

    public addObject(driver: WebGPUDriver, model: Model) {
        model.slot = this.cubeInstanceBuffer.add(driver, model.getModelMatrix().toColumnMajor());
        this.models[model.slot] = model;
    }

    public removeObject(driver: WebGPUDriver, slot: number) {
        this.cubeInstanceBuffer.remove(driver, slot);
    }

    public rotateObject(
        driver: WebGPUDriver,
        modelSlot: number,
        rot: Vec3 = new Vec3(0.1, 0.1, 0.1),
    ) {
        if (this.models.length <= modelSlot) return;
        const model = this.models[modelSlot]!;
        if (model.slot === undefined) return;
        model.rotate(rot);
        this.cubeInstanceBuffer.update(driver, model.slot, model.getModelMatrix().toColumnMajor());
    }
}
