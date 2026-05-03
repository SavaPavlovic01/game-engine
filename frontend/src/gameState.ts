import { Game } from './game';
import type { Graphics } from './graphics/graphics';
import { Vec3 } from './graphics/math/vec';
import type { Model } from './graphics/model';
import { Cube } from './graphics/objects/cube';
import { Scene } from './graphics/scene';

export class GameState {
    public scene!: Scene;
    public graphics!: Graphics;
    public players: Map<string, Model> = new Map();

    constructor(graphics: Graphics) {
        this.graphics = graphics;
        this.scene = new Scene(new Vec3(0, 0, 5));
        this.scene.init(graphics.driver, graphics.canvas?.width, graphics.canvas?.height);
    }

    public addPlayer(playerId: string) {
        const player = new Cube(new Vec3(0, 0, 0));
        this.players.set(playerId, player);
        this.scene.addObject(this.graphics.driver, player);
        this.scene.setObjectTranslate(
            this.graphics.driver,
            player,
            new Vec3(3 * player.slot!, 0, 0),
        );
    }

    public movePlayer(playerId: string, position: Vec3) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`player with id = ${playerId} does not exist`);
            return;
        }
        this.scene.setObjectTranslate(this.graphics.driver, player, position);
    }

    public offsetPlayer(playerId: string, offset: Vec3) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`player with id = ${playerId} does not exist`);
            return;
        }

        console.log(`offseting player x = ${offset.x()}, y = ${offset.z()}`);

        this.scene.offsetObject(this.graphics.driver, player, offset);
    }
}
