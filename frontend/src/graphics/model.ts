import { simpleFrag, simpleVert } from '../generated/shaders';
import type { Camera } from './camera';
import type { Bounded } from './collision/BVH';
import { Ray, type AABB } from './collision/ray';
import { Material } from './materials/material';
import { Mat4 } from './math/mat';
import { Vec3 } from './math/vec';
import { Mesh, ModelPart } from './mesh';
import type { WebGPUDriver } from './webGpuDriver';

export abstract class Model implements Bounded {
    public translation: Vec3;
    public rotation: Vec3;
    private scale: Vec3;

    private modelMatrix: Mat4;

    private uniformBuffer?: GPUBuffer;
    private bindGroup?: GPUBindGroup;

    public slot?: number;

    public parts: ModelPart[];

    constructor(translate: Vec3, rotate: Vec3, scale: Vec3, parts: ModelPart[]) {
        this.translation = translate;
        this.rotation = rotate;
        this.scale = scale;
        this.parts = parts;
        this.modelMatrix = this.buildModelMatrix();
    }

    public getModelMatrix() {
        return this.modelMatrix;
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

    abstract get center(): Vec3;

    abstract getLocalAABB(): AABB;

    get aabb(): AABB {
        const local = this.getLocalAABB();
        const m = this.modelMatrix.values;

        const he = [
            (local.max.X - local.min.X) / 2,
            (local.max.Y - local.min.Y) / 2,
            (local.max.Z - local.min.Z) / 2,
        ];

        const whx = Math.abs(m[0]!) * he[0]! + Math.abs(m[4]!) * he[1]! + Math.abs(m[8]!) * he[2]!;
        const why = Math.abs(m[1]!) * he[0]! + Math.abs(m[5]!) * he[1]! + Math.abs(m[9]!) * he[2]!;
        const whz = Math.abs(m[2]!) * he[0]! + Math.abs(m[6]!) * he[1]! + Math.abs(m[10]!) * he[2]!;

        const c = this.center;
        return {
            min: new Vec3(c.X - whx, c.Y - why, c.Z - whz),
            max: new Vec3(c.X + whx, c.Y + why, c.Z + whz),
        };
    }

    rayIntersects(ray: Ray): number | null {
        const inv = this.modelMatrix.invertTRS();
        const localRay = new Ray(
            inv.transformPoint(ray.origin),
            inv.transformDir(ray.direction).normalize(),
        );
        return localRay.intersectsAABB(this.getLocalAABB());
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
