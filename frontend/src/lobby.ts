import { LobbyOps, type LobbyChannelMsg } from './channels.js';

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
    static makeLobby(plaerId: string, lobbyChannel: RTCDataChannel) {
        const data: LobbyChannelMsg = {
            operation: LobbyOps.makeLobby,
            values: { playerId: plaerId },
        };

        lobbyChannel.send(JSON.stringify(data));
        console.log('sent lobby request');
    }
}
