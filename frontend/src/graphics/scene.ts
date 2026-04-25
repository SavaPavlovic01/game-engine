import { simpleFrag, simpleVert } from '../generated/shaders';
import { Camera } from './camera';
import { Vec3 } from './math/vec';
import type { Model } from './model';
import type { WebGPUDriver } from './webGpuDriver';

export class Scene {
    public camera: Camera;
    public models: Model[];

    private inited: boolean = false;

    private pipeline!: GPURenderPipeline;
    private depthTexture!: GPUTexture;

    constructor() {
        const pos = new Vec3(0, 0, 0);
        const rot = new Vec3(0, 0, 0);
        this.camera = new Camera(pos, rot);
        this.models = [];
    }

    private init(driver: WebGPUDriver, w: number, h: number) {
        const format = driver.format;
        const shaderCode = simpleVert + '\n' + simpleFrag;

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

        console.log('projection ', this.camera.getProjection().toColumnMajor());
        console.log('view matrix', this.camera.getView().toColumnMajor());
    }

    public renderScene(driver: WebGPUDriver) {
        if (!this.inited) {
            this.init(driver, driver.ctx.canvas.width, driver.ctx.canvas.height);
            this.inited = true;
        }

        const currentTexture = driver.ctx.getCurrentTexture();
        const colorView = currentTexture.createView();

        const encoder = driver.device.createCommandEncoder();

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

        for (const model of this.models) {
            const mvp = this.camera
                .getProjection()
                .matmul(this.camera.getView())
                .matmul(model.getModelMatrix());

            //console.log(model.getModelMatrix());
            driver.device.queue.writeBuffer(model.getUniform(driver), 0, mvp.toColumnMajor());

            pass.setBindGroup(0, model.getBindGroup(driver, this.pipeline));

            pass.setVertexBuffer(0, model.getVertexBuffer(driver));
            pass.setIndexBuffer(model.getIndexbuffer(driver), 'uint16');

            pass.drawIndexed(model.indecies.length);
        }

        pass.end();
        driver.device.queue.submit([encoder.finish()]);
    }

    public addObject(model: Model) {
        this.models.push(model);
        console.log(this.models.length);
    }
}
