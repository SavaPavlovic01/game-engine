import { LobbyOps, type LobbyChannelMsg } from './channel/channels.js';

export class Lobby {
    Id?: string;
    PlayerCnt?: number;
    InLobby: boolean = false;

    constructor(Id: string, PlayerCnt: number) {
        this.Id = Id;
        this.PlayerCnt = PlayerCnt;
        this.InLobby = true;
    }

    // just send message to backend to make a new lobby
    static makeLobbyRequest(plaerId: string, lobbyChannel: RTCDataChannel) {
        const data: LobbyChannelMsg = {
            operation: LobbyOps.makeLobby,
            values: { playerId: plaerId },
        };

        lobbyChannel.send(JSON.stringify(data));
        console.log('sent lobby request');
    }

    static joinLobbyRequest(playerId: string, lobbyId: string, lobbyChannel: RTCDataChannel) {
        const data: LobbyChannelMsg = {
            operation: LobbyOps.joinLobby,
            values: { playerId: playerId, lobbyId: lobbyId },
        };

        lobbyChannel.send(JSON.stringify(data));
        console.log('send lobby join request');
    }

    static startGameRequest(playerId: string, lobbyId: string, lobbyChannel: RTCDataChannel) {
        const data: LobbyChannelMsg = {
            operation: LobbyOps.startGame,
            values: { playerId: playerId, lobbyId: lobbyId },
        };

        lobbyChannel.send(JSON.stringify(data));
        console.log('send game start request');
    }
}
