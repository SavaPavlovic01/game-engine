import { simpleFrag, simpleVert } from '../generated/shaders';
import type { Camera } from './camera';
import { Mat4 } from './math/mat';
import { Vec3 } from './math/vec';
import type { WebGPUDriver } from './webGpuDriver';

export abstract class Model {
    public translation: Vec3;
    public rotation: Vec3;
    private scale: Vec3;

    protected verticies: Float32Array;
    public indecies: Uint16Array;

    private modelMatrix: Mat4;

    private vertexBuffer?: GPUBuffer;
    private indexBuffer?: GPUBuffer;
    private uniformBuffer?: GPUBuffer;
    private bindGroup?: GPUBindGroup;

    public slot?: number;

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

    get forward() {
        return new Vec3(
            this.modelMatrix.values[8]!,
            this.modelMatrix.values[9]!,
            this.modelMatrix.values[10]!,
        ).normalize();
    }

    get right() {
        return new Vec3(
            this.modelMatrix.values[0]!,
            this.modelMatrix.values[1]!,
            this.modelMatrix.values[2]!,
        ).normalize();
    }

    get up() {
        return new Vec3(
            this.modelMatrix.values[4]!,
            this.modelMatrix.values[5]!,
            this.modelMatrix.values[6]!,
        ).normalize();
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

    public setTranslate(trans: Vec3) {
        this.translation = trans;
        this.modelMatrix = this.buildModelMatrix();
    }

    public setRotate(rot: Vec3) {
        this.rotation = rot;
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
