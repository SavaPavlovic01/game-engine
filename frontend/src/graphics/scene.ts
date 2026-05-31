import { BVHInterceptor, type HitResult } from './collision/BVHInterceptor';
import type { Interceptor } from './collision/interceptor';
import { StaticBVH } from './collision/StaticBVH';
import type { DirectionalLight, LightSource } from './lightSource';
import { Vec3 } from './math/vec';
import type { Model } from './model';
import type { Skybox } from './skybox';
import { Camera } from './camera';

export class Scene {
    public camera: Camera;
    public models: Model[] = [];
    public skybox?: Skybox;

    public interceptor: Interceptor = new BVHInterceptor();
    public staticModelsBvh: StaticBVH = new StaticBVH();

    public directionalLights: DirectionalLight[] = [];
    public pointLights: (Model & LightSource)[] = [];

    constructor(cameraPos: Vec3 = new Vec3(0, 0, 0), cameraRot: Vec3 = new Vec3(0, 0, 0)) {
        this.camera = new Camera(cameraPos, cameraRot);
    }

    public addObject(model: Model) {
        this.models.push(model);
        this.interceptor.update(this.models);
    }

    public addStaticObject(model: Model) {
        this.models.push(model);
        this.interceptor.update(this.models);
        this.staticModelsBvh.addModel(model);
    }

    public removeObject(model: Model) {
        this.models = this.models.filter((m) => m !== model);
        this.interceptor.update(this.models);
    }

    public addDirectionalLight(light: DirectionalLight) {
        this.directionalLights.push(light);
    }

    public removeDirectionalLight(light: DirectionalLight) {
        this.directionalLights = this.directionalLights.filter((l) => l !== light);
    }

    public addPointLight(light: Model & LightSource) {
        this.pointLights.push(light);
        this.addObject(light);
    }

    public removePointLight(light: Model & LightSource) {
        this.pointLights = this.pointLights.filter((l) => l !== light);
        this.removeObject(light);
    }

    public shoot(): HitResult | null {
        return this.interceptor.hitFirst(this.camera.shootRay());
    }
}
