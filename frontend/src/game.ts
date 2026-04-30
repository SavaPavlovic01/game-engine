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

export class Game {
    public lobbyChannel?: LobbyChannel;
    public dataChannel?: GameStateChannel;

    public graphics!: Graphics;
    public canvas!: HTMLCanvasElement;

    public gameState!: GameState;

    public lobby?: Lobby;
    public playerId?: string;

    constructor() {}

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

    public movePlayer(dirX: number, dirY: number) {
        if (!this.dataChannel) return;
        const moveActionMsg = {
            playerId: this.playerId,
            actionType: 0,
            tick: 0,
            dirx: dirX,
            diry: dirY,
        };

        if (!this.dataChannel || !this.dataChannel.channel) return;
        this.dataChannel.channel.send(JSON.stringify(moveActionMsg));
    }

    public makeLobby() {
        console.log('im here');
        if (!this.lobbyChannel || !this.playerId) return;
        console.log('sending');
        Lobby.makeLobbyRequest(this.playerId, this.lobbyChannel.channel);
    }

    public joinLobby() {
        console.log('trying to join lobby');
        if (!this.playerId || !this.lobbyChannel) return;
        if (this.lobby && this.lobby.InLobby) {
            console.log('already in lobby');
            return;
        }
        const text = document.getElementById('lobbyField') as HTMLInputElement;
        if (text) {
            console.log('found text');
            console.log(text.value);
        }
        Lobby.joinLobbyRequest(this.playerId, text.value, this.lobbyChannel.channel);
    }

    public startGame() {
        console.log('starting game');
        if (!this.lobby || !this.lobbyChannel || !this.playerId || !this.lobby.Id) return;
        Lobby.startGameRequest(this.playerId, this.lobby.Id, this.lobbyChannel.channel);
    }
}
