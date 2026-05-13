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

    constructor() {}

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
        this.lastTime = performance.now();
        requestAnimationFrame(this.frame);
    }

    public frame = async (now: number) => {
        if (!this.gameState) return;
        await this.gameState.scene.renderScene(this.graphics.driver);
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta;

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
        console.log('sending this', rotatePlayerMsg);

        this.dataChannel?.channel.send(JSON.stringify(rotatePlayerMsg));
    }
}
