import { BVH } from './BVH';
import type { AABB, Ray } from './ray';
import type { Triangle } from './triangle';

export class StaticBVH {
    private bvh: BVH = new BVH();

    public build(triangles: Triangle[]): void {
        this.bvh.build(triangles);
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
