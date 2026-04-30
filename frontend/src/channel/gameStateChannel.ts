import type { ChannelOps } from './channels';
import type { Game } from '../game';
import { Vec3 } from '../graphics/math/vec';
import { WebRtcHandler } from '../webrtcHandler';

export class GameStateChannel {
    public channel!: RTCDataChannel;
    public game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public static async create(game: Game) {
        const channel = new GameStateChannel(game);
        const dataChannel = await WebRtcHandler.openChannel(
            `data--${game.lobby?.Id}--${game.playerId}`,
            channel.gameStateChannelOps,
            false,
            0,
        );

        channel.channel = dataChannel;
        return channel;
    }

    gameStateChannelOps: ChannelOps = {
        onMessage: (e) => {
            const data = JSON.parse(e.data);
            interface state {
                playerId: string;
                x: number;
                y: number;
            }
            const players = Object.values(data.players);
            const player = players[0] as state;
            console.log(player);
            this.game.gameState.movePlayer(player.playerId, new Vec3(0, 0, -player.x));
            console.log('got game state message', players);
        },

        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened game state channel');
        },
    };
}
