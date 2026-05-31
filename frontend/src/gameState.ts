import { MaterialId } from './graphics/materials/material.js';
import type { Model } from './graphics/model.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';
import { Vec3 } from './graphics/math/vec.js';
import type { IRenderer } from './graphics/renderer';

export class GameState {
    public scene: Scene;
    public players: Map<string, Model> = new Map();

    private renderer: IRenderer;

    constructor(renderer: IRenderer) {
        this.renderer = renderer;
        this.scene = new Scene(new Vec3(10, -2, -4), new Vec3(0, -1.5, 0));
    }

    // --- Generic model helpers ---

    public addModel(model: Model) {
        this.scene.addObject(model);
        this.renderer.registerObject(model);
    }

    public addStaticModel(model: Model) {
        this.scene.addStaticObject(model);
        this.renderer.registerObject(model);
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

    private translate(model: Model, offset: Vec3) {
        model.translate(offset);
        this.renderer.syncTransform(model);
    }

    private rotate(model: Model, rot: Vec3) {
        model.rotate(rot);
        this.renderer.syncTransform(model);
    }

    private setRotate(model: Model, rot: Vec3) {
        model.setRotate(rot);
        this.renderer.syncTransform(model);
    }

    // --- Player API ---

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

    public rotatePlayer(playerId: string, rot: Vec3) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.rotate(player, rot);
    }

    public setPlayerRotate(playerId: string, rot: Vec3) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        this.setRotate(player, rot);
    }

    private getPlayer(playerId: string): Model | undefined {
        const player = this.players.get(playerId);
        if (!player) console.warn(`Player not found: ${playerId}`);
        return player;
    }
}
