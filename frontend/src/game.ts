import {
    LobbyOps,
    type ChannelOps,
    type LobbyChannelMsg,
    type LobbyRequestResponse,
} from './channel/channels.js';
import type { GameStateChannel } from './channel/gameStateChannel.js';
import { Graphics } from './graphics/graphics.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';
import { Lobby } from './lobby.js';
import { LobbyChannel } from './channel/lobbyChannel.js';
import { WebRtcHandler } from './webrtcHandler.js';
import { GameState } from './gameState.js';
import { TICK_PERIOD } from './constants.js';
import { ActionBuffer } from './actions/actionBuffer.js';
import { CharacterController } from './graphics/collision/CharacterController.js';
import type { Model } from './graphics/model.js';
import { Material } from './graphics/materials/material.js';
import { ShaderPipeline } from './graphics/shaderPipeline.js';
import { test } from './generated/shaders.js';
import { ObjModel } from './graphics/objects/objLoader.js';

export class Game {
    public lobbyChannel?: LobbyChannel;
    public dataChannel?: GameStateChannel;

    public graphics!: Graphics;
    public canvas!: HTMLCanvasElement;

    public gameState!: GameState;

    public lobby?: Lobby;
    public playerId?: string;

    public tick: number = 0;
    private lastTime: number = 0;
    private accumulator: number = 0;

    public actionBuffer: ActionBuffer = new ActionBuffer();

    public gameStarted: boolean = false;

    public playerControllers: CharacterController[] = [];
    public playerModels: Model[] = [];

    constructor() {}

    public async addPlayer() {
        const controller = new CharacterController(this.gameState.scene.staticModelsBvh);
        const { mesh, aabb } = await ObjModel.fetch('test.obj');
        const player = new ObjModel(
            mesh,
            aabb,
            this.gameState.scene.materials.default,
            new Vec3(-5, -3, -10),
            Vec3.zeros(),
            new Vec3(1, 1, 1),
        );
        this.playerModels.push(player);
        this.playerControllers.push(controller);

        this.gameState.scene.addObject(this.graphics.driver, player);
    }

    public static async create() {
        const game = new Game();
        game.canvas = document.getElementById('canvas') as HTMLCanvasElement;
        game.graphics = await Graphics.create(game.canvas);
        game.gameState = new GameState(game.graphics);

        game.lobbyChannel = await LobbyChannel.create(game);

        return game;
    }

    async init() {
        this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.graphics = await Graphics.create(this.canvas);
        this.gameState = new GameState(this.graphics);

        this.lobbyChannel = await LobbyChannel.create(this);
    }

    public setLobby(lobby: Lobby) {
        this.lobby = lobby;
    }

    public setGameStateChannel(channel: GameStateChannel) {
        this.dataChannel = channel;
    }

    public startRender() {
        this.lastTime = -1;
        requestAnimationFrame(this.frame);
    }

    public frame = async (now: number) => {
        if (!this.gameState) return;

        if (this.lastTime === -1) {
            this.lastTime = now;
            requestAnimationFrame(this.frame);
            return;
        }

        await this.gameState.scene.renderScene(this.graphics.driver);
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta;

        if (this.playerModels.length > 0) {
            const player = this.playerModels[0];
            const controller = this.playerControllers[0]!;
            const pos = controller.update(player!, delta / 1000);

            console.log(`moving player ${pos}`);
            this.gameState.scene.setObjectTranslate(this.graphics.driver, player!, pos);
        }

        while (this.accumulator >= TICK_PERIOD) {
            this.tick++;
            this.accumulator -= TICK_PERIOD;
        }

        requestAnimationFrame(this.frame);
    };

    public movePlayer(dirX: number, dirY: number) {
        this.gameState.offsetPlayer(this.playerId!, new Vec3(-dirY, 0, -dirX));
        if (!this.dataChannel || !this.dataChannel.channel || !this.playerId) {
            console.log('not ready to send');
            return;
        }

        const moveActionMsg = {
            playerId: this.playerId,
            actionType: 0,
            tick: this.tick,
            dirx: dirX,
            diry: dirY,
        };

        this.dataChannel.channel.send(JSON.stringify(moveActionMsg));
    }

    public setPlayerRotate(dirX: number, dirY: number) {
        this.gameState.setPlayerRotate(this.playerId!, new Vec3(dirX, dirY, 0));
    }

    public rotatePlayer(dirX: number, dirY: number) {
        this.gameState.rotatePlayer(this.playerId!, new Vec3(dirX, dirY, 0));

        // TODO: move this shit out to the action, when we invoke it send the message
        const rot = this.gameState.players.get(this.playerId!)?.rotation;

        const rotatePlayerMsg = {
            playerId: this.playerId,
            actionType: 1,
            tick: this.tick,
            xrot: rot?.X,
            yrot: rot?.Y,
        };
        //console.log('sending this', rotatePlayerMsg);

        this.dataChannel?.channel.send(JSON.stringify(rotatePlayerMsg));
    }
}
