// physics/IPhysicsWorld.ts

import { Quat } from '../math/quat';
import { Vec3 } from '../math/vec';
import type { Model } from '../model';

export interface RigidBodyState {
    position: Vec3;
    orientation: Quat;
    linearVelocity: Vec3;
    angularVelocity: Vec3;
}

export interface RigidBodyOptions {
    mass: number;
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
}

export type RigidBodyHandle = symbol;

export interface IStaticBody {
    readonly handle: RigidBodyHandle;
}

export interface RaycastHit {
    handle: RigidBodyHandle | null; // null = static geometry
    point: Vec3;
    normal: Vec3;
    distance: number;
}

export interface IPhysicsWorld {
    step(dt: number): void;

    addStaticMesh(model: Model): IStaticBody;
    removeStaticMesh(body: IStaticBody): void;

    addBox(model: Model, halfExtents: Vec3, opts: RigidBodyOptions): RigidBodyHandle;

    removeBody(handle: RigidBodyHandle): void;

    getState(handle: RigidBodyHandle): RigidBodyState;
    setState(handle: RigidBodyHandle, state: Partial<RigidBodyState>): void;

    applyForce(handle: RigidBodyHandle, force: Vec3, worldPoint?: Vec3): void;
    applyImpulse(handle: RigidBodyHandle, impulse: Vec3, worldPoint?: Vec3): void;
    applyTorque(handle: RigidBodyHandle, torque: Vec3): void;

    raycast(origin: Vec3, direction: Vec3, maxDist: number): RaycastHit | null;
}
