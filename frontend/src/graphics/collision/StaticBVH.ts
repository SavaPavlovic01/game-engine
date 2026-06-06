import { BVH } from './BVH';
import type { Collider, CollisionHit } from './Collider';
import { Triangle } from './triangle';
import type { Model } from '../model';
import type { Ray } from './ray';

export class StaticBVH {
    private bvh: BVH = new BVH();
    private triangles: Triangle[] = [];

    public addModel(model: Model): void {
        for (const part of model.parts) {
            this.triangles = this.triangles.concat(
                Triangle.extractFromMesh(part, model.getModelMatrix()),
            );
        }
        this.bvh.build(this.triangles);
    }

    public raycast(ray: Ray): { triangle: Triangle; distance: number } | null {
        const result = this.bvh.raycast(ray);
        if (!result) return null;
        return { triangle: result.item as Triangle, distance: result.distance };
    }

    public query(collider: Collider): { triangle: Triangle; hit: CollisionHit }[] {
        const candidates = this.bvh.query(collider.getBroadphaseAABB());
        const results: { triangle: Triangle; hit: CollisionHit }[] = [];

        for (const bounded of candidates) {
            const triangle = bounded as Triangle;
            const hit = collider.testTriangle(triangle);
            if (hit) results.push({ triangle, hit });
        }

        return results;
    }
}
