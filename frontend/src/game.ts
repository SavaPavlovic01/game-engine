import type { GameStateChannel } from './channel/gameStateChannel.js';
import { Graphics } from './graphics/graphics.js';
import { Vec3 } from './graphics/math/vec.js';
import { MaterialId } from './graphics/materials/material.js';
import { CharacterController } from './graphics/collision/CharacterController.js';
import { ObjModel } from './graphics/objects/objLoader.js';
import type { Model } from './graphics/model.js';
import { Renderer } from './graphics/renderer.js';
import { GameState } from './gameState.js';
import { Lobby } from './lobby.js';
import { LobbyChannel } from './channel/lobbyChannel.js';
import { ActionBuffer } from './actions/actionBuffer.js';
import { TICK_PERIOD } from './constants.js';
import { Quat } from './graphics/math/quat.js';
import { ScriptSystem } from './scriptSystem.js';

interface Player {
    model: Model;
    controller: CharacterController;
}

export class Game {
    public lobbyChannel?: LobbyChannel;
    public dataChannel?: GameStateChannel;

    public graphics!: Graphics;
    public canvas!: HTMLCanvasElement;
    public renderer!: Renderer;

    public gameState!: GameState;
    public lobby?: Lobby;
    public playerId?: string;

    public tick: number = 0;
    private lastTime: number = -1;
    private accumulator: number = 0;

    public actionBuffer: ActionBuffer = new ActionBuffer();
    public gameStarted: boolean = false;

    public players: Player[] = [];

    public scriptSystem = new ScriptSystem();

    private constructor() {}

    public static async create(): Promise<Game> {
        const game = new Game();
        game.canvas = document.getElementById('canvas') as HTMLCanvasElement;
        game.graphics = await Graphics.create(game.canvas);
        game.renderer = new Renderer(game.graphics.driver);
        game.gameState = new GameState(game.renderer);
        game.lobbyChannel = await LobbyChannel.create(game);
        return game;
    }

    public setLobby(lobby: Lobby) {
        this.lobby = lobby;
    }

    public setGameStateChannel(channel: GameStateChannel) {
        this.dataChannel = channel;
    }

    public async addPlayer() {
        await this.registerPlayerMaterials();

        const { parts, aabb } = await ObjModel.fetch(
            'test.obj',
            ['player-skin', 'player-skin', 'player-skin'],
            MaterialId.Default,
        );

        const model = new ObjModel(
            parts,
            aabb,
            new Vec3(-5, -3, -10),
            Quat.identity(),
            new Vec3(1, 1, 1).scale(5),
        );

        const controller = new CharacterController(this.gameState.scene.staticModelsBvh);

        this.players.push({ model, controller });
        this.gameState.addModel(model);
    }

    private async registerPlayerMaterials() {
        if (this.renderer.materials.has('player-skin')) return;

        const texture = await this.renderer.materials.loadTexture('tex.avif');
        this.renderer.materials.register(
            'player-skin',
            { baseColor: [1, 0.2, 0.9], metallic: 0.1, roughness: 0.1 },
            texture,
        );
    }

    public startRender() {
        this.lastTime = -1;
        requestAnimationFrame(this.frame);
    }

    private frame = (now: number) => {
        if (this.lastTime === -1) {
            this.lastTime = now;
            requestAnimationFrame(this.frame);
            return;
        }

        const delta = now - this.lastTime;
        this.lastTime = now;

        this.scriptSystem.update(delta, this.gameState.scene, this.gameState);
        this.scriptSystem.input.flush();
        this.update(delta);

        this.renderer.render(this.gameState.scene);

        this.accumulator += delta;
        while (this.accumulator >= TICK_PERIOD) {
            this.tick++;
            this.accumulator -= TICK_PERIOD;
        }

        requestAnimationFrame(this.frame);
    };

    private update(delta: number) {
        const dt = delta / 1000;
        for (const { model, controller } of this.players) {
            const newPos = controller.update(model, dt);
            this.gameState.moveModel(model, newPos);
        }

        this.gameState.step(dt);
    }

    public movePlayer(dirX: number, dirY: number) {
        this.gameState.offsetPlayer(this.playerId!, new Vec3(-dirY, 0, -dirX));

        if (!this.dataChannel?.channel || !this.playerId) return;

        this.dataChannel.channel.send(
            JSON.stringify({
                playerId: this.playerId,
                actionType: 0,
                tick: this.tick,
                dirx: dirX,
                diry: dirY,
            }),
        );
    }

    public setPlayerRotate(dirX: number, dirY: number) {
        this.gameState.setPlayerRotate(this.playerId!, Quat.fromEuler(new Vec3(dirX, dirY, 0)));
    }

    public rotatePlayer(dirX: number, dirY: number) {
        this.gameState.rotatePlayer(this.playerId!, Quat.fromEuler(new Vec3(dirX, dirY, 0)));

        const rot = this.gameState.players.get(this.playerId!)?.rotation;
        // TODO: move to action system
        this.dataChannel?.channel.send(
            JSON.stringify({
                playerId: this.playerId,
                actionType: 1,
                tick: this.tick,
                xrot: rot?.X,
                yrot: rot?.Y,
            }),
        );
    }
}
