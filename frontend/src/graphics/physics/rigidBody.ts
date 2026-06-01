// physics/RigidBody.ts

import { Quat } from '../math/quat';
import { Vec3 } from '../math/vec';
import { Mat3 } from '../math/mat3';
import type { Model } from '../model';

export interface RigidBodyOptions {
    mass: number;
    restitution: number; // 0 = inelastic, 1 = perfectly elastic
    friction: number; // 0–1
    linearDamping: number; // 0 = no damping
    angularDamping: number;
}

export class RigidBody {
    public readonly handle: symbol;
    public model: Model;

    public position: Vec3;
    public velocity: Vec3 = Vec3.zeros();
    public forceAccum: Vec3 = Vec3.zeros();

    public orientation: Quat;
    public angularVelocity: Vec3 = Vec3.zeros();
    public torqueAccum: Vec3 = Vec3.zeros();

    public readonly inverseMass: number; // 0 = infinite mass (static)
    public readonly localInertiaTensorInv: Mat3; // in body space

    public readonly restitution: number;
    public readonly friction: number;
    public readonly linearDamping: number;
    public readonly angularDamping: number;

    constructor(model: Model, halfExtents: Vec3, opts: RigidBodyOptions) {
        this.handle = Symbol();
        this.model = model;
        this.position = model.translation;
        this.orientation = model.rotation;

        this.restitution = opts.restitution;
        this.friction = opts.friction;
        this.linearDamping = opts.linearDamping;
        this.angularDamping = opts.angularDamping;

        if (opts.mass <= 0) {
            this.inverseMass = 0;
            this.localInertiaTensorInv = Mat3.zero();
        } else {
            this.inverseMass = 1 / opts.mass;
            this.localInertiaTensorInv = RigidBody.boxInertiaTensorInv(opts.mass, halfExtents);
        }
    }

    private static boxInertiaTensorInv(mass: number, half: Vec3): Mat3 {
        const w = half.X * 2,
            h = half.Y * 2,
            d = half.Z * 2;
        const factor = mass / 12;
        const ix = factor * (h * h + d * d);
        const iy = factor * (w * w + d * d);
        const iz = factor * (w * w + h * h);
        return Mat3.diagonal(1 / ix, 1 / iy, 1 / iz);
    }

    public worldInertiaTensorInv(): Mat3 {
        return this.localInertiaTensorInv.rotateByQuat(this.orientation);
    }

    public applyForce(force: Vec3, worldPoint?: Vec3): void {
        this.forceAccum = this.forceAccum.add(force);
        if (worldPoint) {
            const r = worldPoint.sub(this.position);
            this.torqueAccum = this.torqueAccum.add(r.cross(force));
        }
    }

    public applyImpulse(impulse: Vec3, worldPoint?: Vec3): void {
        this.velocity = this.velocity.add(impulse.scale(this.inverseMass));
        if (worldPoint) {
            const r = worldPoint.sub(this.position);
            const angularImpulse = this.worldInertiaTensorInv().mulVec(r.cross(impulse));
            this.angularVelocity = this.angularVelocity.add(angularImpulse);
        }
    }

    public integrate(dt: number): void {
        if (this.inverseMass === 0) return;

        const linearAccel = this.forceAccum.scale(this.inverseMass);
        this.velocity = this.velocity
            .add(linearAccel.scale(dt))
            .scale(Math.pow(1 - this.linearDamping, dt));

        this.position = this.position.add(this.velocity.scale(dt));

        const worldInvI = this.worldInertiaTensorInv();
        const angularAccel = worldInvI.mulVec(this.torqueAccum);
        this.angularVelocity = this.angularVelocity
            .add(angularAccel.scale(dt))
            .scale(Math.pow(1 - this.angularDamping, dt));

        this.orientation = this.orientation.integrateAngularVelocity(this.angularVelocity, dt);

        this.forceAccum = Vec3.zeros();
        this.torqueAccum = Vec3.zeros();

        this.model.setTranslate(this.position);
        this.model.setRotate(this.orientation);
    }
}
