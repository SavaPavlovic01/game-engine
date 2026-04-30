import { LobbyOps, type ChannelOps, type LobbyRequestResponse } from './channels';
import type { Game } from '../game';
import { GameStateChannel } from './gameStateChannel';
import { Lobby } from '../lobby';
import { WebRtcHandler } from '../webrtcHandler';

export class LobbyChannel {
    public channel!: RTCDataChannel;
    public game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public static async create(game: Game) {
        const channel = new LobbyChannel(game);
        const dataChannel = await WebRtcHandler.openChannel(
            'lobby',
            channel.lobbyChannelOps,
            true,
            5,
        );

        channel.channel = dataChannel;
        return channel;
    }

    lobbyChannelOps: ChannelOps = {
        onMessage: (e) => {
            console.log(e.data);
            const resp = JSON.parse(e.data as string) as LobbyRequestResponse;
            console.log(`got respone ${resp}`);
            this.handleJoinLobbyResp(resp);
            this.handleMakeLobbyResp(resp);
            this.handleReciveId(resp);
            this.handleOtherPlayerJoined(resp);
            this.handleStartGameResponse(resp);
        },

        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened lobby channel');
            const channel = e.target as RTCDataChannel;
        },
    };

    handleJoinLobbyResp = (msg: LobbyRequestResponse) => {
        interface respValue {
            lobbyId: string;
            playerCnt: number;
        }

        if (msg.operation != LobbyOps.joinLobby) return;
        const data = msg.values as respValue;
        if (msg.status != 0) {
            console.log('failed to join lobby');
        }

        const lobby = new Lobby(data.lobbyId, data.playerCnt);
        this.game.setLobby(lobby);
        console.log('joined lobby');
    };

    // TODO: after you add game state class, fuck around with it here
    handleOtherPlayerJoined = (msg: LobbyRequestResponse) => {
        interface respValue {
            playerId: string;
            playerCnt: number;
        }

        if (msg.operation != LobbyOps.otherPlayerJoined) return;
        if (!this.game.lobby) return;
        const data = msg.values as respValue;
        this.game.lobby.PlayerCnt = data.playerCnt;
        this.game.gameState.addPlayer(data.playerId);
        this.game.gameState.addPlayer(data.playerId!);
        console.log(`changed the player count to ${data.playerCnt}`);
    };

    handleReciveId = async (msg: LobbyRequestResponse) => {
        interface receiveIdValue {
            playerId: string;
        }

        if (msg.operation != LobbyOps.playerConnected) return;
        const data = msg.values as receiveIdValue;
        this.game.playerId = data.playerId;
        console.log('put the id in its place');
    };

    handleMakeLobbyResp = (msg: LobbyRequestResponse) => {
        interface lobbyCreatedValue {
            lobbyId: string;
        }

        if (msg.operation != LobbyOps.makeLobby) return;
        const data = msg.values as lobbyCreatedValue;
        this.game.lobby = new Lobby(data.lobbyId, 0);
        console.log(this.game.lobby);
        this.game.gameState.addPlayer(this.game.playerId!);
        console.log('made lobby');
    };

    handleStartGameResponse = async (msg: LobbyRequestResponse) => {
        if (msg.operation != LobbyOps.startGame) return;
        if (msg.status != 0) {
            console.log('failed to start game');
        }

        console.log('opening data channel');
        const channel = await GameStateChannel.create(this.game);
        this.game.setGameStateChannel(channel);

        alert('game started');
    };
}
