import { Vec3 } from '../math/vec';
import type { Model } from '../model';
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

export class CharacterController {
    private staticBVH: StaticBVH;

    public velocity: Vec3 = new Vec3(0, 0, 0);
    public grounded: boolean = false;

    private static readonly GRAVITY = -20;
    private static readonly RADIUS = 0.4;
    private static readonly HALF_HEIGHT = 0.8;
    private static readonly SKIN_WIDTH = 0.01;
    private static readonly GROUND_THRESHOLD = 0.7;
    private static readonly JUMP_FORCE = 1;
    private static readonly MAX_ITERATIONS = 1;

    constructor(staticBVH: StaticBVH) {
        this.staticBVH = staticBVH;
    }

    private getCapsulePoints(position: Vec3): { top: Vec3; bottom: Vec3 } {
        return {
            top: position.add(new Vec3(0, CharacterController.HALF_HEIGHT, 0)),
            bottom: position.add(new Vec3(0, -CharacterController.HALF_HEIGHT, 0)),
        };
    }

    private getCapsuleAABB(position: Vec3): AABB {
        const r = CharacterController.RADIUS;
        const h = CharacterController.HALF_HEIGHT;
        return {
            min: new Vec3(position.X - r, position.Y - h - r, position.Z - r),
            max: new Vec3(position.X + r, position.Y + h + r, position.Z + r),
        };
    }

    private gravityVelocity: Vec3 = new Vec3(0, 0, 0);
    private moveVelocity: Vec3 = new Vec3(0, 0, 0);

    public setMoveVelocity(v: Vec3) {
        this.moveVelocity = v;
    }

    public jump() {
        if (this.grounded) {
            this.gravityVelocity = new Vec3(0, CharacterController.JUMP_FORCE, 0);
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
            const aabb = { max: modelAabb.max.add(offset), min: modelAabb.min.add(offset) };
            const collisions = this.test(aabb);

            this.grounded = false;
            if (collisions.length === 0) break;

            let groundedThisFrame = false;
            for (const coll of collisions) {
                newPosition = newPosition.add(coll.normal.scale(coll.penetration));

                const gravDot = this.gravityVelocity.dot(coll.normal);
                if (gravDot < 0) {
                    this.gravityVelocity = this.gravityVelocity.sub(coll.normal.scale(gravDot));
                }

                if (coll.normal.Y > CharacterController.GROUND_THRESHOLD) {
                    groundedThisFrame = true;
                }
            }
            this.grounded = groundedThisFrame;
        }

        if (this.grounded) {
            this.gravityVelocity = new Vec3(0, 0, 0);
        }

        return newPosition;
    }

    public test(aabb: AABB) {
        const collisions = [];
        const candiates = this.staticBVH.query(aabb);
        for (let c of candiates) {
            const hit = aabbVsTriangleMTV(aabb, c);
            if (hit !== null) collisions.push(hit);
        }

        return collisions;
    }

    public move(model: Model) {
        let pos = model.translation;
        let grounded = false;
        const colls = this.test(model.aabb);
        console.log(`start pos ${pos}`);
        for (const coll of colls) {
            console.log(`adding ${coll.normal.scale(coll.penetration)}`);
            pos = pos.add(coll.normal.scale(coll.penetration));
            if (coll.normal.Y > 0.7) grounded = true;
        }

        console.log(`returing ${pos}`);
        return { pos: pos, grounded: grounded };
    }

    private resolveCollisions(position: Vec3): { position: Vec3; grounded: boolean } {
        const aabb = this.getCapsuleAABB(position);
        const candidates = this.staticBVH.query(aabb);

        let grounded = false;
        let resolved = position;

        for (const triangle of candidates) {
            const result = this.resolveTriangle(resolved, triangle);
            if (result === null) continue;

            resolved = result.position;

            if (triangle.normal.Y > 0.7) {
                grounded = true;
            }
        }

        return { position: resolved, grounded };
    }

    private resolveTriangle(position: Vec3, triangle: Triangle): { position: Vec3 } | null {
        const { top, bottom } = this.getCapsulePoints(position);
        const r = CharacterController.RADIUS;

        const closest = this.closestPointOnTriangle(
            this.closestPointOnSegment(triangle.a, top, bottom),
            triangle,
        );

        const onSegment = this.closestPointOnSegment(closest, top, bottom);

        const diff = onSegment.sub(closest);
        const dist = diff.magnitude();

        if (dist >= r + CharacterController.SKIN_WIDTH) return null;

        if (dist < 1e-6) {
            return {
                position: position.add(
                    triangle.normal.scale(r - dist + CharacterController.SKIN_WIDTH),
                ),
            };
        }

        const pushDir = diff.scale(1 / dist);
        const pushAmount = r - dist + CharacterController.SKIN_WIDTH;

        return {
            position: position.add(pushDir.scale(pushAmount)),
        };
    }

    private closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): Vec3 {
        const ab = b.sub(a);
        const lenSq = ab.lengthSquared();
        if (lenSq < 1e-8) return a;

        const t = Math.max(0, Math.min(1, p.sub(a).dot(ab) / lenSq));
        return a.add(ab.scale(t));
    }

    private closestPointOnTriangle(p: Vec3, tri: Triangle): Vec3 {
        const ab = tri.b.sub(tri.a);
        const ac = tri.c.sub(tri.a);
        const ap = p.sub(tri.a);

        const d1 = ab.dot(ap);
        const d2 = ac.dot(ap);
        if (d1 <= 0 && d2 <= 0) return tri.a;

        const bp = p.sub(tri.b);
        const d3 = ab.dot(bp);
        const d4 = ac.dot(bp);
        if (d3 >= 0 && d4 <= d3) return tri.b;

        const cp = p.sub(tri.c);
        const d5 = ab.dot(cp);
        const d6 = ac.dot(cp);
        if (d6 >= 0 && d5 <= d6) return tri.c;

        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
            const v = d1 / (d1 - d3);
            return tri.a.add(ab.scale(v));
        }

        const vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            return tri.a.add(ac.scale(w));
        }

        const va = d3 * d6 - d5 * d4;
        if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
            const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
            return tri.b.add(tri.c.sub(tri.b).scale(w));
        }

        const denom = 1 / (va + vb + vc);
        const v = vb * denom;
        const w = vc * denom;
        return tri.a.add(ab.scale(v)).add(ac.scale(w));
    }
}
