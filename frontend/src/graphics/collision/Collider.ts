import type { Quat } from '../math/quat';
import { Vec3 } from '../math/vec';
import type { Model } from '../model';
import { aabbVsTriangleMTV } from './CharacterController';
import type { AABB } from './ray';
import type { Triangle } from './triangle';

export interface CollisionHit {
    normal: Vec3;
    penetration: number;
}

export interface Collider {
    getBroadphaseAABB(): AABB;
    testTriangle(triangle: Triangle): CollisionHit | null;
    update(center: Vec3, orientation: Quat): void;
    getContactPoint(normal: Vec3): Vec3;
}

export class AABBCollider implements Collider {
    public center: Vec3;
    public halfExtents: Vec3;

    constructor(center: Vec3, halfExtents: Vec3) {
        this.center = center;
        this.halfExtents = halfExtents;
    }

    public static fromModel(model: Model): AABBCollider {
        const local = model.getLocalAABB();
        const localHalf = new Vec3(
            (local.max.X - local.min.X) / 2,
            (local.max.Y - local.min.Y) / 2,
            (local.max.Z - local.min.Z) / 2,
        );
        const scale = model.scale;
        return new AABBCollider(
            model.center,
            new Vec3(localHalf.X * scale.X, localHalf.Y * scale.Y, localHalf.Z * scale.Z),
        );
    }

    public update(center: Vec3, _orientation: Quat): void {
        this.center = center;
    }

    public getBroadphaseAABB(): AABB {
        return {
            min: this.center.sub(this.halfExtents),
            max: this.center.add(this.halfExtents),
        };
    }

    public testTriangle(triangle: Triangle): CollisionHit | null {
        return aabbVsTriangleMTV(this.getBroadphaseAABB(), triangle);
    }

    public getContactPoint(normal: Vec3): Vec3 {
        return new Vec3(
            this.center.X - normal.X * this.halfExtents.X,
            this.center.Y - normal.Y * this.halfExtents.Y,
            this.center.Z - normal.Z * this.halfExtents.Z,
        );
    }
}
const EPSILON = 1e-6;

export class OBBCollider implements Collider {
    public center: Vec3;
    public halfExtents: Vec3;
    public orientation: Quat;
    private axes: [Vec3, Vec3, Vec3];

    constructor(center: Vec3, halfExtents: Vec3, orientation: Quat) {
        this.center = center;
        this.halfExtents = halfExtents;
        this.orientation = orientation;
        this.axes = [
            orientation.rotateVec(new Vec3(1, 0, 0)),
            orientation.rotateVec(new Vec3(0, 1, 0)),
            orientation.rotateVec(new Vec3(0, 0, 1)),
        ];
    }

    public static fromModel(model: Model): OBBCollider {
        const local = model.getLocalAABB();
        const localHalf = new Vec3(
            (local.max.X - local.min.X) / 2,
            (local.max.Y - local.min.Y) / 2,
            (local.max.Z - local.min.Z) / 2,
        );
        const scale = model.scale;
        return new OBBCollider(
            model.center,
            new Vec3(localHalf.X * scale.X, localHalf.Y * scale.Y, localHalf.Z * scale.Z),
            model.rotation,
        );
    }

    public update(center: Vec3, orientation: Quat): void {
        this.center = center;
        this.orientation = orientation;
        this.axes[0] = orientation.rotateVec(new Vec3(1, 0, 0));
        this.axes[1] = orientation.rotateVec(new Vec3(0, 1, 0));
        this.axes[2] = orientation.rotateVec(new Vec3(0, 0, 1));
    }

    public getBroadphaseAABB(): AABB {
        const [ax, ay, az] = this.axes;
        const he = this.halfExtents;
        const wx = Math.abs(ax.X) * he.X + Math.abs(ay.X) * he.Y + Math.abs(az.X) * he.Z;
        const wy = Math.abs(ax.Y) * he.X + Math.abs(ay.Y) * he.Y + Math.abs(az.Y) * he.Z;
        const wz = Math.abs(ax.Z) * he.X + Math.abs(ay.Z) * he.Y + Math.abs(az.Z) * he.Z;
        return {
            min: new Vec3(this.center.X - wx, this.center.Y - wy, this.center.Z - wz),
            max: new Vec3(this.center.X + wx, this.center.Y + wy, this.center.Z + wz),
        };
    }

    public testTriangle(triangle: Triangle): CollisionHit | null {
        const [ax, ay, az] = this.axes;

        const v0 = triangle.a.sub(this.center);
        const v1 = triangle.b.sub(this.center);
        const v2 = triangle.c.sub(this.center);

        const e0 = v1.sub(v0);
        const e1 = v2.sub(v1);
        const e2 = v0.sub(v2);

        const best = { pen: Infinity, normal: new Vec3(0, 0, 0) };

        for (const axis of [ax, ay, az]) {
            if (!this.testAxis(axis, v0, v1, v2, best)) return null;
        }

        if (!this.testAxis(e0.cross(e1), v0, v1, v2, best)) return null;

        for (const obbAxis of [ax, ay, az]) {
            for (const triEdge of [e0, e1, e2]) {
                if (!this.testAxis(obbAxis.cross(triEdge), v0, v1, v2, best)) return null;
            }
        }

        if (best.normal.dot(v0) > 0) {
            best.normal = best.normal.negate();
        }

        return { normal: best.normal, penetration: best.pen };
    }

    private testAxis(
        axis: Vec3,
        v0: Vec3,
        v1: Vec3,
        v2: Vec3,
        best: { pen: number; normal: Vec3 },
    ): boolean {
        if (axis.lengthSquared() < EPSILON) return true;

        const n = axis.normalize();

        const p0 = v0.dot(n);
        const p1 = v1.dot(n);
        const p2 = v2.dot(n);
        const minP = Math.min(p0, p1, p2);
        const maxP = Math.max(p0, p1, p2);

        const r =
            this.halfExtents.X * Math.abs(this.axes[0].dot(n)) +
            this.halfExtents.Y * Math.abs(this.axes[1].dot(n)) +
            this.halfExtents.Z * Math.abs(this.axes[2].dot(n));

        if (minP > r || maxP < -r) return false;

        const overlap = Math.min(r - minP, maxP + r);
        if (overlap < best.pen) {
            best.pen = overlap;
            best.normal = n;
        }

        return true;
    }

    public getContactPoint(normal: Vec3): Vec3 {
        return new Vec3(
            this.center.X - normal.X * this.halfExtents.X,
            this.center.Y - normal.Y * this.halfExtents.Y,
            this.center.Z - normal.Z * this.halfExtents.Z,
        );
    }
}

export class NullCollider implements Collider {
    public getBroadphaseAABB(): AABB {
        return { min: Vec3.zeros(), max: Vec3.zeros() };
    }
    public testTriangle(_triangle: Triangle): CollisionHit | null {
        return null;
    }
    public update(_center: Vec3, _orientation: Quat): void {}
    public getContactPoint(_normal: Vec3): Vec3 {
        return Vec3.zeros();
    }
}
