import type { Mesh } from '../mesh';
import type { Model } from '../model';
import { BVH } from './BVH';
import type { AABB, Ray } from './ray';
import { Triangle } from './triangle';

export class StaticBVH {
    private bvh: BVH = new BVH();
    private triangles: Triangle[] = [];

    public addModel(model: Model) {
        this.triangles = this.triangles.concat(
            Triangle.extractFromMesh(model.mesh, model.getModelMatrix()),
        );
        this.bvh.build(this.triangles);
    }

    public raycast(ray: Ray): { triangle: Triangle; distance: number } | null {
        const result = this.bvh.raycast(ray);
        if (!result) return null;
        return { triangle: result.item as Triangle, distance: result.distance };
    }

    public query(aabb: AABB): Triangle[] {
        return this.bvh.query(aabb).map((b) => b as Triangle);
    }
}
