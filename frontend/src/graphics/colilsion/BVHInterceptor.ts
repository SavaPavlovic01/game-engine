import { Vec3 } from '../math/vec';
import type { Model } from '../model';
import type { Interceptor } from './interceptor';
import { Ray } from './ray';

interface HitResult {
    model: Model;
    distance: number;
}

class BVHNode {
    public aabb: { min: Vec3; max: Vec3 };
    public left: BVHNode | null = null;
    public right: BVHNode | null = null;
    public model: Model | null = null;

    constructor(aabb: { min: Vec3; max: Vec3 }) {
        this.aabb = aabb;
    }

    public isLeaf(): boolean {
        return this.model !== null;
    }
}

class BVHInterceptor implements Interceptor {
    private root: BVHNode | null = null;

    public update(models: Model[]): void {
        if (models.length === 0) {
            this.root = null;
            return;
        }
        this.root = this.build(models);
    }

    public hitFirst(ray: Ray): HitResult | null {
        return this.traverse(this.root, ray);
    }

    public hitAll(ray: Ray): HitResult[] {
        const results: HitResult[] = [];
        this.traverseAll(this.root, ray, results);
        return results.sort((a, b) => a.distance - b.distance);
    }

    private build(models: Model[]): BVHNode {
        const aabb = this.mergeAABBs(models.map((m) => m.getWorldAABB()));
        const node = new BVHNode(aabb);

        if (models.length === 1) {
            node.model = models[0]!;
            return node;
        }

        const axis = this.longestAxis(aabb);
        models.sort((a, b) => a.center.index(axis) - b.center.index(axis));

        const mid = Math.floor(models.length / 2);
        node.left = this.build(models.slice(0, mid));
        node.right = this.build(models.slice(mid));

        return node;
    }

    private traverse(node: BVHNode | null, ray: Ray): HitResult | null {
        if (node === null) return null;
        if (ray.intersectsAABB(node.aabb) === null) return null;

        if (node.isLeaf()) {
            return this.exactTest(ray, node.model!);
        }

        const leftHit = this.traverse(node.left, ray);
        const rightHit = this.traverse(node.right, ray);

        if (!leftHit) return rightHit;
        if (!rightHit) return leftHit;
        return leftHit.distance < rightHit.distance ? leftHit : rightHit;
    }

    private traverseAll(node: BVHNode | null, ray: Ray, results: HitResult[]): void {
        if (node === null) return;

        if (ray.intersectsAABB(node.aabb) === null) return;

        if (node.isLeaf()) {
            const hit = this.exactTest(ray, node.model!);
            if (hit) results.push(hit);
            return;
        }

        this.traverseAll(node.left, ray, results);
        this.traverseAll(node.right, ray, results);
    }

    private exactTest(ray: Ray, model: Model): HitResult | null {
        const inv = model.getModelMatrix().invertTRS();
        const localRay: Ray = new Ray(
            inv.transformPoint(ray.origin),
            inv.transformDir(ray.direction).normalize(),
        );

        const local = model.getLocalAABB();
        const t = localRay.intersectsAABB(local);
        if (t === null) return null;
        return { model, distance: t };
    }

    private mergeAABBs(aabbs: { min: Vec3; max: Vec3 }[]): { min: Vec3; max: Vec3 } {
        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

        for (const aabb of aabbs) {
            minX = Math.min(minX, aabb.min.x());
            minY = Math.min(minY, aabb.min.y());
            minZ = Math.min(minZ, aabb.min.z());
            maxX = Math.max(maxX, aabb.max.x());
            maxY = Math.max(maxY, aabb.max.y());
            maxZ = Math.max(maxZ, aabb.max.z());
        }

        return {
            min: new Vec3(minX, minY, minZ),
            max: new Vec3(maxX, maxY, maxZ),
        };
    }

    private longestAxis(aabb: { min: Vec3; max: Vec3 }): number {
        const dx = aabb.max.x() - aabb.min.x();
        const dy = aabb.max.y() - aabb.min.y();
        const dz = aabb.max.z() - aabb.min.z();
        if (dx > dy && dx > dz) return 0;
        if (dy > dz) return 1;
        return 2;
    }
}
