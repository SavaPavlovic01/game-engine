import {
    LobbyOps,
    type ChannelOps,
    type LobbyChannelMsg,
    type LobbyRequestResponse,
} from './channels.js';
import { Lobby } from './lobby.js';
import { WebRtcHandler } from './webrtcHandler.js';

export class Game {
    public lobbyChannel?: RTCDataChannel;
    public dataChannel?: RTCDataChannel;

    public lobby?: Lobby;
    public playerId?: string;

    constructor() {}

    async initChannels() {
        if (this.lobbyChannel && this.dataChannel) return;
        this.lobbyChannel = await WebRtcHandler.openChannel('lobby', this.lobbyChannelOps, true, 5);
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

    gameStateChannelOps: ChannelOps = {
        onMessage: (e) => {
            console.log('got game state message', e.data);
        },

        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened game state channel');
        },
    };

    handleMakeLobbyResp = (msg: LobbyRequestResponse) => {
        interface lobbyCreatedValue {
            lobbyId: string;
        }

        if (msg.operation != LobbyOps.makeLobby) return;
        const data = msg.values as lobbyCreatedValue;
        this.lobby = new Lobby(data.lobbyId, 0);
        console.log(this.lobby);
        console.log('made lobby');
    };

    handleReciveId = async (msg: LobbyRequestResponse) => {
        interface receiveIdValue {
            playerId: string;
        }

        if (msg.operation != LobbyOps.playerConnected) return;
        const data = msg.values as receiveIdValue;
        this.playerId = data.playerId;
        console.log('put the id in its place');
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

        this.lobby = new Lobby(data.lobbyId, data.playerCnt);
        console.log('joined lobby');
    };

    handleOtherPlayerJoined = (msg: LobbyRequestResponse) => {
        interface respValue {
            playerCnt: number;
        }

        if (msg.operation != LobbyOps.otherPlayerJoined) return;
        if (!this.lobby) return;
        const data = msg.values as respValue;
        this.lobby.PlayerCnt = data.playerCnt;
        console.log(`changed the player count to ${data.playerCnt}`);
    };

    handleStartGameResponse = async (msg: LobbyRequestResponse) => {
        if (msg.operation != LobbyOps.startGame) return;
        if (msg.status != 0) {
            console.log('failed to start game');
        }

        console.log('opening data channel');
        this.dataChannel = await WebRtcHandler.openChannel(
            `data--${this.lobby?.Id}--${this.playerId}`,
            this.gameStateChannelOps,
            false,
            0,
        );

        alert('game started');
    };

    public makeLobby() {
        console.log('im here');
        if (!this.lobbyChannel || !this.playerId) return;
        console.log('sending');
        Lobby.makeLobbyRequest(this.playerId, this.lobbyChannel);
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
        Lobby.joinLobbyRequest(this.playerId, text.value, this.lobbyChannel);
    }

    public startGame() {
        console.log('starting game');
        if (!this.lobby || !this.lobbyChannel || !this.playerId || !this.lobby.Id) return;
        Lobby.startGameRequest(this.playerId, this.lobby.Id, this.lobbyChannel);
    }
}
