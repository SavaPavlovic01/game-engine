import { Vec3 } from '../math/vec';
import type { Model } from '../model';
import { AABBCollider } from './Collider';
import type { StaticBVH } from './StaticBVH';
import type { AABB } from './ray';
import { Triangle } from './triangle';

export interface AABBCollision {
    normal: Vec3;
    penetration: number;
}

const EPSILON = 1e-6;

const project = (v: Vec3, axis: Vec3) => v.dot(axis);

const getRadius = (extents: Vec3, axis: Vec3) =>
    extents.X * Math.abs(axis.X) + extents.Y * Math.abs(axis.Y) + extents.Z * Math.abs(axis.Z);

const testAxis = (
    axis: Vec3,
    v0: Vec3,
    v1: Vec3,
    v2: Vec3,
    extents: Vec3,
    best: { pen: number; normal: Vec3 },
) => {
    if (axis.lengthSquared() < EPSILON) return true;

    const n = axis.normalize();

    const p0 = project(v0, n);
    const p1 = project(v1, n);
    const p2 = project(v2, n);

    const minP = Math.min(p0, p1, p2);
    const maxP = Math.max(p0, p1, p2);

    const r = getRadius(extents, n);

    const boxMin = -r;
    const boxMax = r;

    if (minP > boxMax || maxP < boxMin) {
        return false;
    }

    const overlap = Math.min(boxMax - minP, maxP - boxMin);

    if (overlap < best.pen) {
        best.pen = overlap;
        best.normal = n;
    }

    return true;
};

export const aabbVsTriangleMTV = (aabb: AABB, triangle: Triangle): AABBCollision | null => {
    const center = aabb.min.add(aabb.max).scale(0.5);
    const extents = aabb.max.sub(aabb.min).scale(0.5);
    const v0 = triangle.a.sub(center);
    const v1 = triangle.b.sub(center);
    const v2 = triangle.c.sub(center);
    const e0 = v1.sub(v0);
    const e1 = v2.sub(v1);
    const e2 = v0.sub(v2);

    const best = { pen: Infinity, normal: new Vec3(0, 0, 0) };

    for (const axis of [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)]) {
        if (!testAxis(axis, v0, v1, v2, extents, best)) return null;
    }

    if (!testAxis(e0.cross(e1), v0, v1, v2, extents, best)) return null;

    const boxAxes = [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)];
    for (const ba of boxAxes) {
        for (const te of [e0, e1, e2]) {
            if (!testAxis(ba.cross(te), v0, v1, v2, extents, best)) return null;
        }
    }

    if (best.normal.dot(v0) > 0) {
        best.normal = best.normal.negate();
    }

    return { normal: best.normal, penetration: best.pen };
};

// collision/CharacterController.ts

export class CharacterController {
    private staticBVH: StaticBVH;
    private gravityVelocity: Vec3 = Vec3.zeros();
    private moveVelocity: Vec3 = Vec3.zeros();

    public grounded: boolean = false;

    private static readonly GRAVITY = -20;
    private static readonly GROUND_THRESHOLD = 0.7;
    private static readonly MAX_ITERATIONS = 1;

    constructor(staticBVH: StaticBVH) {
        this.staticBVH = staticBVH;
    }

    public setMoveVelocity(v: Vec3) {
        this.moveVelocity = v;
    }

    public jump() {
        if (this.grounded) {
            this.gravityVelocity = new Vec3(0, 5, 0);
            this.grounded = false;
        }
    }

    public update(model: Model, dt: number): Vec3 {
        if (!this.grounded) {
            this.gravityVelocity = this.gravityVelocity.add(
                new Vec3(0, CharacterController.GRAVITY * dt, 0),
            );
        }

        const velocity = this.gravityVelocity.add(this.moveVelocity);
        let newPosition = model.translation.add(velocity.scale(dt));

        for (let i = 0; i < CharacterController.MAX_ITERATIONS; i++) {
            const offset = newPosition.sub(model.translation);
            const modelAabb = model.aabb;

            const collider = new AABBCollider(
                new Vec3(
                    (modelAabb.min.X + modelAabb.max.X) / 2 + offset.X,
                    (modelAabb.min.Y + modelAabb.max.Y) / 2 + offset.Y,
                    (modelAabb.min.Z + modelAabb.max.Z) / 2 + offset.Z,
                ),
                new Vec3(
                    (modelAabb.max.X - modelAabb.min.X) / 2,
                    (modelAabb.max.Y - modelAabb.min.Y) / 2,
                    (modelAabb.max.Z - modelAabb.min.Z) / 2,
                ),
            );

            const contacts = this.staticBVH.query(collider);

            this.grounded = false;
            if (contacts.length === 0) break;

            let groundedThisFrame = false;
            for (const { hit } of contacts) {
                newPosition = newPosition.add(hit.normal.scale(hit.penetration));

                const gravDot = this.gravityVelocity.dot(hit.normal);
                if (gravDot < 0) {
                    this.gravityVelocity = this.gravityVelocity.sub(hit.normal.scale(gravDot));
                }

                if (hit.normal.Y > CharacterController.GROUND_THRESHOLD) {
                    groundedThisFrame = true;
                }
            }
            this.grounded = groundedThisFrame;
        }

        if (this.grounded) {
            this.gravityVelocity = Vec3.zeros();
        }

        return newPosition;
    }
}
