import { Mat4 } from './math/mat';
import type { Vec3 } from './math/vec';

export abstract class Model {
    private translation: Vec3;
    private rotation: Vec3;
    private scale: Vec3;

    protected verticies: Float32Array;
    protected indexBuffer: Uint16Array;

    private modelMatrix: Mat4;

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
        this.indexBuffer = indexBuffer;
        this.modelMatrix = this.buildModelMatrix();
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

    public render(): void {
        console.log('not yet');
    }
}
