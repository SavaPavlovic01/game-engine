import { simpleFrag, simpleVert } from '../generated/shaders';
import type { Camera } from './camera';
import { Mat4 } from './math/mat';
import type { Vec3 } from './math/vec';
import type { WebGPUDriver } from './webGpuDriver';

export abstract class Model {
    private translation: Vec3;
    private rotation: Vec3;
    private scale: Vec3;

    protected verticies: Float32Array;
    public indecies: Uint16Array;

    private modelMatrix: Mat4;

    private vertexBuffer?: GPUBuffer;
    private indexBuffer?: GPUBuffer;
    private uniformBuffer?: GPUBuffer;
    private bindGroup?: GPUBindGroup;

    constructor(
        translate: Vec3,
        rotate: Vec3,
        scale: Vec3,
        verticies: Float32Array,
        indexBuffer: Uint16Array,
    ) {
        this.translation = translate;
        this.rotation = rotate;
        this.scale = scale;
        this.verticies = verticies;
        this.indecies = indexBuffer;
        this.modelMatrix = this.buildModelMatrix();
    }

    public getModelMatrix() {
        return this.modelMatrix;
    }

    public getVertexBuffer(driver: WebGPUDriver) {
        if (!this.vertexBuffer) {
            this.vertexBuffer = driver.fillBuffer(
                this.verticies,
                GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            );
        }

        return this.vertexBuffer;
    }

    public getIndexbuffer(driver: WebGPUDriver) {
        if (!this.indexBuffer) {
            this.indexBuffer = driver.fillBuffer(
                this.indecies,
                GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            );
        }

        return this.indexBuffer;
    }

    public getUniform(driver: WebGPUDriver) {
        if (!this.uniformBuffer) {
            this.uniformBuffer = driver.makeBuffer(
                64,
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            );
        }
        return this.uniformBuffer;
    }

    public getBindGroup(driver: WebGPUDriver, pipeline: GPURenderPipeline) {
        const buffer = this.getUniform(driver);
        if (!this.bindGroup) {
            this.bindGroup = driver.device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: { buffer: buffer } }],
            });
        }
        return this.bindGroup;
    }

    private buildModelMatrix(): Mat4 {
        return Mat4.translationMatrix(this.translation)
            .matmul(Mat4.rotationMatrix(this.rotation))
            .matmul(Mat4.scaleMatrix(this.scale));
    }

    public translate(dir: Vec3) {
        this.translation = this.translation.add(dir);
        this.modelMatrix = this.buildModelMatrix();
    }

    public rotate(dir: Vec3) {
        this.rotation = this.rotation.add(dir);
        this.modelMatrix = this.buildModelMatrix();
    }

    public changeScale(sc: Vec3) {
        this.scale = this.scale.add(sc);
        this.modelMatrix = this.buildModelMatrix();
    }
}
