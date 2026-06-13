import { Vec3 } from '../math/vec';
import type { Model } from '../model';
import { BVH } from './BVH';
import type { Interceptor } from './interceptor';
import { aabbOverlapsAABB, Ray, type AABB } from './ray';

export interface HitResult {
    model: Model;
    distance: number;
}

export class BVHInterceptor implements Interceptor {
    private bvh: BVH = new BVH();

    public update(models: Model[]): void {
        this.bvh.build(models);
    }

    // TODO: if you fire from a model, you will alway get that model, give a way to filter out itself
    public hitFirst(ray: Ray): HitResult | null {
        const result = this.bvh.raycast(ray);
        if (!result) return null;
        return { model: result.item as Model, distance: result.distance };
    }

    public hitAll(ray: Ray): HitResult[] {
        return this.bvh
            .raycastAll(ray)
            .map((r) => ({ model: r.item as Model, distance: r.distance }));
    }

    public overlapping(model: Model): Model[] {
        return this.bvh
            .query(model.aabb)
            .filter((b) => b !== model)
            .map((b) => b as Model);
    }

    public getWorldBounds(): AABB {
        return this.bvh.getWorldBounds()!;
    }
}
