import { Vec3 } from '../math/vec';
import type { AABB } from './ray';
import { aabbOverlapsAABB } from './ray';
import type { Ray } from './ray';

export interface Bounded {
    get aabb(): AABB;
    rayIntersects(ray: Ray): number | null;
}

class BVHNode {
    public aabb: AABB;
    public left: BVHNode | null = null;
    public right: BVHNode | null = null;
    public item: Bounded | null = null;

    constructor(aabb: AABB) {
        this.aabb = aabb;
    }

    public isLeaf(): boolean {
        return this.item !== null;
    }
}

export class BVH {
    private root: BVHNode | null = null;

    public build(items: Bounded[]): void {
        this.root = items.length === 0 ? null : this.buildNode(items);
    }

    public raycast(ray: Ray): { item: Bounded; distance: number } | null {
        return this.traverseRay(this.root, ray);
    }

    public query(aabb: AABB): Bounded[] {
        const results: Bounded[] = [];
        this.traverseQuery(this.root, aabb, results);
        return results;
    }

    private buildNode(items: Bounded[]): BVHNode {
        const aabb = this.mergeAABBs(items.map((i) => i.aabb));
        const node = new BVHNode(aabb);

        if (items.length === 1) {
            node.item = items[0]!;
            return node;
        }

        const axis = this.longestAxis(aabb);
        items.sort((a, b) => this.center(a.aabb).index(axis) - this.center(b.aabb).index(axis));

        const mid = Math.floor(items.length / 2);
        node.left = this.buildNode(items.slice(0, mid));
        node.right = this.buildNode(items.slice(mid));

        return node;
    }

    public raycastAll(ray: Ray): { item: Bounded; distance: number }[] {
        const results: { item: Bounded; distance: number }[] = [];
        this.traverseRayAll(this.root, ray, results);
        return results.sort((a, b) => a.distance - b.distance);
    }

    public getWorldBounds() {
        return this.root?.aabb;
    }

    private traverseRayAll(
        node: BVHNode | null,
        ray: Ray,
        results: { item: Bounded; distance: number }[],
    ): void {
        if (node === null) return;
        if (ray.intersectsAABB(node.aabb) === null) return;

        if (node.isLeaf()) {
            const t = node.item!.rayIntersects(ray);
            if (t !== null) results.push({ item: node.item!, distance: t });
            return;
        }

        this.traverseRayAll(node.left, ray, results);
        this.traverseRayAll(node.right, ray, results);
    }

    private traverseRay(
        node: BVHNode | null,
        ray: Ray,
    ): { item: Bounded; distance: number } | null {
        if (node === null) return null;
        if (ray.intersectsAABB(node.aabb) === null) return null;

        if (node.isLeaf()) {
            const t = node.item!.rayIntersects(ray);
            return t !== null ? { item: node.item!, distance: t } : null;
        }

        const left = this.traverseRay(node.left, ray);
        const right = this.traverseRay(node.right, ray);

        if (!left) return right;
        if (!right) return left;
        return left.distance < right.distance ? left : right;
    }

    private traverseQuery(node: BVHNode | null, aabb: AABB, results: Bounded[]): void {
        if (node === null) return;
        if (!aabbOverlapsAABB(aabb, node.aabb)) return;

        if (node.isLeaf()) {
            results.push(node.item!);
            return;
        }

        this.traverseQuery(node.left, aabb, results);
        this.traverseQuery(node.right, aabb, results);
    }

    private mergeAABBs(aabbs: AABB[]): AABB {
        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;
        for (const a of aabbs) {
            minX = Math.min(minX, a.min.X);
            minY = Math.min(minY, a.min.Y);
            minZ = Math.min(minZ, a.min.Z);
            maxX = Math.max(maxX, a.max.X);
            maxY = Math.max(maxY, a.max.Y);
            maxZ = Math.max(maxZ, a.max.Z);
        }
        return { min: new Vec3(minX, minY, minZ), max: new Vec3(maxX, maxY, maxZ) };
    }

    private longestAxis(aabb: AABB): number {
        const dx = aabb.max.X - aabb.min.X;
        const dy = aabb.max.Y - aabb.min.Y;
        const dz = aabb.max.Z - aabb.min.Z;
        if (dx > dy && dx > dz) return 0;
        if (dy > dz) return 1;
        return 2;
    }

    private center(aabb: AABB): Vec3 {
        return new Vec3(
            (aabb.min.X + aabb.max.X) / 2,
            (aabb.min.Y + aabb.max.Y) / 2,
            (aabb.min.Z + aabb.max.Z) / 2,
        );
    }
}
