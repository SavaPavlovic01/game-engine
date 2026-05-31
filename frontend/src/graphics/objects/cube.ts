import { STRIDE } from '../../constants';
import type { AABB } from '../collision/ray';
import type { Material } from '../materials/material';
import { Vec3 } from '../math/vec';
import { Mesh, meshLibrary, ModelPart } from '../mesh';
import { Model } from '../model';

export class Cube extends Model {
    // with normals
    public static cubeVertices = new Float32Array([
        // Front (+Z)
        -0.5, -0.5, 0.5, 0, 0, 1, 0, 0, 0.5, -0.5, 0.5, 0, 0, 1, 1, 0, 0.5, 0.5, 0.5, 0, 0, 1, 1, 1,
        -0.5, 0.5, 0.5, 0, 0, 1, 0, 1,
        // Back (-Z)
        0.5, -0.5, -0.5, 0, 0, -1, 0, 0, -0.5, -0.5, -0.5, 0, 0, -1, 1, 0, -0.5, 0.5, -0.5, 0, 0,
        -1, 1, 1, 0.5, 0.5, -0.5, 0, 0, -1, 0, 1,
        // Left (-X)
        -0.5, -0.5, -0.5, -1, 0, 0, 0, 0, -0.5, -0.5, 0.5, -1, 0, 0, 1, 0, -0.5, 0.5, 0.5, -1, 0, 0,
        1, 1, -0.5, 0.5, -0.5, -1, 0, 0, 0, 1,
        // Right (+X)
        0.5, -0.5, 0.5, 1, 0, 0, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0, 1, 0, 0.5, 0.5, -0.5, 1, 0, 0, 1,
        1, 0.5, 0.5, 0.5, 1, 0, 0, 0, 1,
        // Top (+Y)
        -0.5, 0.5, 0.5, 0, 1, 0, 0, 0, 0.5, 0.5, 0.5, 0, 1, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0, 1, 1,
        -0.5, 0.5, -0.5, 0, 1, 0, 0, 1,
        // Bottom (-Y)
        -0.5, -0.5, -0.5, 0, -1, 0, 0, 0, 0.5, -0.5, -0.5, 0, -1, 0, 1, 0, 0.5, -0.5, 0.5, 0, -1, 0,
        1, 1, -0.5, -0.5, 0.5, 0, -1, 0, 0, 1,
    ]);

    public static indices: Uint16Array = new Uint16Array([
        // Front
        0, 1, 2, 0, 2, 3,

        // Back
        4, 5, 6, 4, 6, 7,

        // Left
        8, 9, 10, 8, 10, 11,

        // Right
        12, 13, 14, 12, 14, 15,

        // Top
        16, 17, 18, 16, 18, 19,

        // Bottom
        20, 21, 22, 20, 22, 23,
    ]);

    public static readonly mesh: Mesh = meshLibrary.get(this.cubeVertices, this.indices);

    constructor(
        materialId: string,
        translate: Vec3 = new Vec3(0, 0, 0),
        rotate: Vec3 = new Vec3(0, 0, 0),
        scale: Vec3 = new Vec3(1, 1, 1),
    ) {
        super(translate, rotate, scale, [
            new ModelPart(Cube.cubeVertices, Cube.indices, materialId),
        ]);
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
