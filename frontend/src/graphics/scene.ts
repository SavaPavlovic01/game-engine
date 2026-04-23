import { Camera } from './camera';
import { Vec3 } from './math/vec';
import type { Model } from './model';

export class Scene {
    public camera: Camera;
    public models: Model[];

    constructor() {
        const pos = new Vec3(0, 0, 0);
        const rot = new Vec3(0, 0, 0);
        this.camera = new Camera(pos, rot);
        this.models = [];
    }
}
