import { MaterialId } from './graphics/materials/material.js';
import type { Model } from './graphics/model.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';
import { Vec3 } from './graphics/math/vec.js';
import type { IRenderer } from './graphics/renderer';
import type { Quat } from './graphics/math/quat.js';
import { NaivePhysicsWorld } from './graphics/physics/NaivePhysicsWorld.js';
import type { RigidBodyHandle } from './graphics/physics/PhysicsWorld.js';
import type { RigidBodyOptions } from './graphics/physics/rigidBody.js';

export class GameState {
    public scene: Scene;
    public players: Map<string, Model> = new Map();
    private physics: NaivePhysicsWorld = new NaivePhysicsWorld();
    private rigidBodies: Map<Model, RigidBodyHandle> = new Map();

    private renderer: IRenderer;

    constructor(renderer: IRenderer) {
        this.renderer = renderer;
        this.scene = new Scene(new Vec3(10, -2, -4), new Vec3(0, -1.5, 0));
    }

    public addModel(model: Model) {
        this.scene.addObject(model);
        this.renderer.registerObject(model);
    }

    public addStaticModel(model: Model) {
        this.scene.addStaticObject(model);
        this.renderer.registerObject(model);
        this.physics.addStaticMesh(model);
    }

    public addDynamicModel(model: Model, opts: RigidBodyOptions): RigidBodyHandle {
        this.scene.addObject(model);
        this.renderer.registerObject(model);

        const aabb = model.aabb;
        const halfExtents = new Vec3(
            (aabb.max.X - aabb.min.X) / 2,
            (aabb.max.Y - aabb.min.Y) / 2,
            (aabb.max.Z - aabb.min.Z) / 2,
        );

        const handle = this.physics.addBox(model, halfExtents, opts);
        this.rigidBodies.set(model, handle);
        return handle;
    }

    public removeModel(model: Model) {
        this.scene.removeObject(model);
        this.renderer.unregisterObject(model);
    }

    public moveModel(model: Model, position: Vec3) {
        model.setTranslate(position);
        this.renderer.syncTransform(model);
    }

    private setTranslate(model: Model, position: Vec3) {
        model.setTranslate(position);
        this.renderer.syncTransform(model);
    }

    public translate(model: Model, offset: Vec3) {
        model.translate(offset);
        this.renderer.syncTransform(model);
    }

    private rotate(model: Model, rot: Quat) {
        model.rotate(rot);
        this.renderer.syncTransform(model);
    }

    private setRotate(model: Model, rot: Quat) {
        model.setRotate(rot);
        this.renderer.syncTransform(model);
    }

    public setScale(model: Model, scale: Vec3) {
        model.setScale(scale);
        this.renderer.syncTransform(model);
    }

    public addPlayer(playerId: string, materialId: string = MaterialId.Default) {
        const player = new Cube(materialId, new Vec3(0, 0, 0));
        this.players.set(playerId, player);
        this.addModel(player);
        this.setTranslate(player, new Vec3(3 * this.players.size, 0, 0));
    }

    public removePlayer(playerId: string) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.removeModel(player);
        this.players.delete(playerId);
    }

    public movePlayer(playerId: string, position: Vec3) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.setTranslate(player, position);
    }

    public offsetPlayer(playerId: string, offset: Vec3) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.translate(player, offset);
    }

    public rotatePlayer(playerId: string, rot: Quat) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.rotate(player, rot);
    }

    public setPlayerRotate(playerId: string, rot: Quat) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.setRotate(player, rot);
    }

    private getPlayer(playerId: string): Model | undefined {
        const player = this.players.get(playerId);
        if (!player) console.warn(`Player not found: ${playerId}`);
        return player;
    }

    public step(dt: number) {
        this.physics.step(dt);
        for (const model of this.rigidBodies.keys()) {
            this.renderer.syncTransform(model);
        }
    }

    public applyImpulse(model: Model, impulse: Vec3, worldPoint?: Vec3) {
        const handle = this.rigidBodies.get(model);
        if (handle) this.physics.applyImpulse(handle, impulse, worldPoint);
    }

    public applyForce(model: Model, force: Vec3, worldPoint?: Vec3) {
        const handle = this.rigidBodies.get(model);
        if (handle) this.physics.applyForce(handle, force, worldPoint);
    }
}
