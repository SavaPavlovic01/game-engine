import { STRIDE } from '../../constants';
import type { AABB } from '../collision/ray';
import type { Material } from '../materials/material';
import { Quat } from '../math/quat';
import { Vec3 } from '../math/vec';
import { Mesh, meshLibrary, ModelPart } from '../mesh';
import { Model } from '../model';

export class Ramp extends Model {
    public static rampVertices = new Float32Array([
        // Bottom (-Y)
        -0.5, -0.5, -0.5, 0, -1, 0, 0, 0, 0.5, -0.5, -0.5, 0, -1, 0, 1, 0, 0.5, -0.5, 0.5, 0, -1, 0,
        1, 1, -0.5, -0.5, 0.5, 0, -1, 0, 0, 1,
        // Back (+Z)
        -0.5, -0.5, 0.5, 0, 0, 1, 0, 0, 0.5, -0.5, 0.5, 0, 0, 1, 1, 0, 0.5, 0.5, 0.5, 0, 0, 1, 1, 1,
        -0.5, 0.5, 0.5, 0, 0, 1, 0, 1,
        // Left (-X) triangle
        -0.5, -0.5, 0.5, -1, 0, 0, 0, 0, -0.5, -0.5, -0.5, -1, 0, 0, 1, 0, -0.5, 0.5, 0.5, -1, 0, 0,
        0, 1,
        // Right (+X) triangle
        0.5, -0.5, -0.5, 1, 0, 0, 1, 0, 0.5, -0.5, 0.5, 1, 0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 0, 0, 0, 1,
        // Slope
        -0.5, -0.5, -0.5, 0, 0.7071, -0.7071, 0, 0, -0.5, 0.5, 0.5, 0, 0.7071, -0.7071, 0, 1, 0.5,
        0.5, 0.5, 0, 0.7071, -0.7071, 1, 1, 0.5, -0.5, -0.5, 0, 0.7071, -0.7071, 1, 0,
    ]);

    public static indices: Uint16Array = new Uint16Array([
        // Bottom
        0, 1, 2, 0, 2, 3,

        // Back
        4, 5, 6, 4, 6, 7,

        // Left
        8, 10, 9,

        // Right
        11, 13, 12,

        // Front slope
        14, 15, 16, 14, 16, 17,
    ]);

    public static readonly mesh: Mesh = meshLibrary.get(this.rampVertices, this.indices);

    constructor(
        material: string,
        translate: Vec3 = new Vec3(0, 0, 0),
        rotate: Quat = Quat.identity(),
        scale: Vec3 = new Vec3(1, 1, 1),
    ) {
        super(translate, rotate, scale, [new ModelPart(Ramp.rampVertices, Ramp.indices, material)]);
    }

    public get center(): Vec3 {
        return this.translation;
    }

    public getLocalAABB(): AABB {
        return {
            min: new Vec3(-0.5, -0.5, -0.5),
            max: new Vec3(0.5, 0.5, 0.5),
        };
    }
}
