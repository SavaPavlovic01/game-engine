import { Vec3 } from '../math/vec';
import { Model } from '../model';

export class Cube extends Model {
    public static vertices: Vec3[] = [
        // Front (+Z)
        new Vec3(-0.5, -0.5, 0.5),
        new Vec3(0.5, -0.5, 0.5),
        new Vec3(0.5, 0.5, 0.5),
        new Vec3(-0.5, 0.5, 0.5),

        // Back (-Z)
        new Vec3(0.5, -0.5, -0.5),
        new Vec3(-0.5, -0.5, -0.5),
        new Vec3(-0.5, 0.5, -0.5),
        new Vec3(0.5, 0.5, -0.5),

        // Left (-X)
        new Vec3(-0.5, -0.5, -0.5),
        new Vec3(-0.5, -0.5, 0.5),
        new Vec3(-0.5, 0.5, 0.5),
        new Vec3(-0.5, 0.5, -0.5),

        // Right (+X)
        new Vec3(0.5, -0.5, 0.5),
        new Vec3(0.5, -0.5, -0.5),
        new Vec3(0.5, 0.5, -0.5),
        new Vec3(0.5, 0.5, 0.5),

        // Top (+Y)
        new Vec3(-0.5, 0.5, 0.5),
        new Vec3(0.5, 0.5, 0.5),
        new Vec3(0.5, 0.5, -0.5),
        new Vec3(-0.5, 0.5, -0.5),

        // Bottom (-Y)
        new Vec3(-0.5, -0.5, -0.5),
        new Vec3(0.5, -0.5, -0.5),
        new Vec3(0.5, -0.5, 0.5),
        new Vec3(-0.5, -0.5, 0.5),
    ];

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

    constructor(translate: Vec3, rotate: Vec3, scale: Vec3) {
        super(translate, rotate, scale, Cube.vertices, Cube.indices);
    }
}
