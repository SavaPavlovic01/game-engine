import { Vec3 } from '../math/vec';
import { Model } from '../model';

export class Cube extends Model {
    // with normals
    public static cubeVertices = new Float32Array([
        // Front (+Z)  normal: 0, 0, 1
        -0.5, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0.5,
        0, 0, 1,
        // Back (-Z)  normal: 0, 0, -1
        0.5, -0.5, -0.5, 0, 0, -1, -0.5, -0.5, -0.5, 0, 0, -1, -0.5, 0.5, -0.5, 0, 0, -1, 0.5, 0.5,
        -0.5, 0, 0, -1,
        // Left (-X)  normal: -1, 0, 0
        -0.5, -0.5, -0.5, -1, 0, 0, -0.5, -0.5, 0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0, -0.5, 0.5,
        -0.5, -1, 0, 0,
        // Right (+X)  normal: 1, 0, 0
        0.5, -0.5, 0.5, 1, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0, 0.5, 0.5, 0.5,
        1, 0, 0,
        // Top (+Y)  normal: 0, 1, 0
        -0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0, -0.5, 0.5, -0.5,
        0, 1, 0,
        // Bottom (-Y)  normal: 0, -1, 0
        -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5,
        0.5, 0, -1, 0,
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

    constructor(
        translate: Vec3 = new Vec3(0, 0, 0),
        rotate: Vec3 = new Vec3(0, 0, 0),
        scale: Vec3 = new Vec3(1, 1, 1),
    ) {
        super(translate, rotate, scale, Cube.cubeVertices, Cube.indices);
    }
}
