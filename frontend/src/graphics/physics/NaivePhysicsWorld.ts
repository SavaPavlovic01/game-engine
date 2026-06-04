import { Vec3 } from '../math/vec';
import { StaticBVH } from '../collision/StaticBVH';
import { aabbVsTriangleMTV } from '../collision/CharacterController';
import type { Model } from '../model';
import type {
    IPhysicsWorld,
    RigidBodyHandle,
    RigidBodyOptions,
    RigidBodyState,
    IStaticBody,
    RaycastHit,
} from './PhysicsWorld';
import { RigidBody } from './rigidBody';
import { Ray } from '../collision/ray';

const GRAVITY = new Vec3(0, -9.81, 0);

export class NaivePhysicsWorld implements IPhysicsWorld {
    private bodies: Map<symbol, RigidBody> = new Map();
    private staticBVH: StaticBVH = new StaticBVH();
    private staticSurfaceFriction: number = 0.6;

    public addStaticMesh(model: Model): IStaticBody {
        this.staticBVH.addModel(model);
        const handle = Symbol() as RigidBodyHandle;
        return { handle };
    }

    public removeStaticMesh(_body: IStaticBody): void {
        console.warn('removeStaticMesh: not yet implemented');
    }

    public addBox(model: Model, halfExtents: Vec3, opts: RigidBodyOptions): RigidBodyHandle {
        const body = new RigidBody(model, halfExtents, opts);
        this.bodies.set(body.handle, body);
        return body.handle as RigidBodyHandle;
    }

    public removeBody(handle: RigidBodyHandle): void {
        this.bodies.delete(handle as symbol);
    }

    public getState(handle: RigidBodyHandle): RigidBodyState {
        const body = this.get(handle);
        return {
            position: body.position,
            orientation: body.orientation,
            linearVelocity: body.velocity,
            angularVelocity: body.angularVelocity,
        };
    }

    public setState(handle: RigidBodyHandle, state: Partial<RigidBodyState>): void {
        const body = this.get(handle);
        if (state.position) body.position = state.position;
        if (state.orientation) body.orientation = state.orientation;
        if (state.linearVelocity) body.velocity = state.linearVelocity;
        if (state.angularVelocity) body.angularVelocity = state.angularVelocity;
    }

    public applyForce(handle: RigidBodyHandle, force: Vec3, worldPoint?: Vec3): void {
        this.get(handle).applyForce(force, worldPoint);
    }

    public applyImpulse(handle: RigidBodyHandle, impulse: Vec3, worldPoint?: Vec3): void {
        this.get(handle).applyImpulse(impulse, worldPoint);
    }

    public applyTorque(handle: RigidBodyHandle, torque: Vec3): void {
        this.get(handle).torqueAccum = this.get(handle).torqueAccum.add(torque);
    }

    public step(dt: number): void {
        for (const body of this.bodies.values()) {
            if (body.inverseMass === 0) continue;

            body.applyForce(GRAVITY.scale(1 / body.inverseMass));
            body.integrate(dt);
            this.resolveCollisions(body);

            if (body.velocity.magnitude() < 0.05) {
                body.velocity = Vec3.zeros();
            }
            if (body.angularVelocity.magnitude() < 0.5) {
                body.angularVelocity = Vec3.zeros();
            }
        }
    }

    private resolveCollisions(body: RigidBody): void {
        const aabb = body.model.aabb;
        const candidates = this.staticBVH.query(aabb);

        for (const triangle of candidates) {
            const hit = aabbVsTriangleMTV(aabb, triangle);
            if (!hit) continue;

            body.position = body.position.add(hit.normal.scale(hit.penetration));
            body.model.setTranslate(body.position);

            const aabbCenter = body.position;
            const halfExtents = new Vec3(
                (aabb.max.X - aabb.min.X) / 2,
                (aabb.max.Y - aabb.min.Y) / 2,
                (aabb.max.Z - aabb.min.Z) / 2,
            );
            const contactPoint = new Vec3(
                aabbCenter.X - hit.normal.X * halfExtents.X,
                aabbCenter.Y - hit.normal.Y * halfExtents.Y,
                aabbCenter.Z - hit.normal.Z * halfExtents.Z,
            );

            const r = contactPoint.sub(body.position);

            const velAtContact = body.velocity.add(body.angularVelocity.cross(r));
            const velAlongNormal = velAtContact.dot(hit.normal);

            if (velAlongNormal > 0) continue;

            const worldInvI = body.worldInertiaTensorInv();
            const rCrossN = r.cross(hit.normal);
            const angularEffect = worldInvI.mulVec(rCrossN).cross(r).dot(hit.normal);
            const denom = body.inverseMass + angularEffect;

            const j = (-(1 + body.restitution) * velAlongNormal) / denom;
            body.applyImpulse(hit.normal.scale(j), contactPoint);

            const combinedFriction = Math.sqrt(body.friction * this.staticSurfaceFriction);
            const tangent = velAtContact.sub(hit.normal.scale(velAlongNormal));
            const tangentLen = tangent.magnitude();
            if (tangentLen > 1e-6) {
                const tangentDir = tangent.scale(1 / tangentLen);
                const jt = -velAtContact.dot(tangentDir) / denom;
                const frictionClamp = j * combinedFriction;
                const frictionImpulse = tangentDir.scale(
                    Math.max(-frictionClamp, Math.min(frictionClamp, jt)),
                );
                body.applyImpulse(frictionImpulse, contactPoint);
            }
        }
    }

    public raycast(origin: Vec3, direction: Vec3, maxDist: number): RaycastHit | null {
        const ray = new Ray(origin, direction);
        const result = this.staticBVH.raycast(ray);
        if (!result || result.distance > maxDist) return null;
        return {
            handle: null,
            point: origin.add(direction.scale(result.distance)),
            normal: result.triangle.normal,
            distance: result.distance,
        };
    }

    private get(handle: RigidBodyHandle): RigidBody {
        const body = this.bodies.get(handle as symbol);
        if (!body) throw new Error('invalid RigidBodyHandle');
        return body;
    }
}
