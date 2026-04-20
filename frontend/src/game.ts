import { LobbyOps, type ChannelOps, type LobbyChannelMsg } from './channels.js';
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
        this.dataChannel = await WebRtcHandler.openChannel(
            'data',
            { onClose: null, onError: null, onMessage: null, onOpen: null },
            false,
            0,
        );
    }

    lobbyChannelOps: ChannelOps = {
        onMessage: (e) => {
            console.log(`got into lobby, info: ${e.data}`);
        },

        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened lobby channel');
            const channel = e.target as RTCDataChannel;
        },
    };

    handleLobbyCreated = (msg: LobbyChannelMsg) => {
        interface lobbyCreatedValue {
            Id: string;
            PlayerCnt: number;
        }

        if (msg.operation != LobbyOps.makeLobby) return;
        const data = msg.values as lobbyCreatedValue;
        this.lobby = new Lobby(data.Id, data.PlayerCnt);
        console.log('made lobby');
    };

    public makeLobby() {
        console.log('im here');
        if (!this.lobbyChannel) return;
        Lobby.makeLobby('someId', this.lobbyChannel);
    }
}
