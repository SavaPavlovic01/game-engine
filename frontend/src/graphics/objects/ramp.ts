import type { AABB } from '../collision/ray';
import { Vec3 } from '../math/vec';
import { Mesh } from '../mesh';
import { Model } from '../model';

export class Ramp extends Model {
    public static rampVertices = new Float32Array([
        // Bottom (-Y)
        -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5,
        0.5, 0, -1, 0,

        // Back (+Z)
        -0.5, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0.5,
        0, 0, 1,

        // Left (-X)
        -0.5, -0.5, 0.5, -1, 0, 0, -0.5, -0.5, -0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0,

        // Right (+X)
        0.5, -0.5, -0.5, 1, 0, 0, 0.5, -0.5, 0.5, 1, 0, 0, 0.5, 0.5, 0.5, 1, 0, 0,

        // Front slope (-Z facing)
        -0.5, -0.5, -0.5, 0, 0.7071, -0.7071, -0.5, 0.5, 0.5, 0, 0.7071, -0.7071, 0.5, 0.5, 0.5, 0,
        0.7071, -0.7071, 0.5, -0.5, -0.5, 0, 0.7071, -0.7071,
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

    public static readonly mesh: Mesh = new Mesh(Ramp.rampVertices, Ramp.indices);

    constructor(
        translate: Vec3 = new Vec3(0, 0, 0),
        rotate: Vec3 = new Vec3(0, 0, 0),
        scale: Vec3 = new Vec3(1, 1, 1),
    ) {
        super(translate, rotate, scale, Ramp.mesh);
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
