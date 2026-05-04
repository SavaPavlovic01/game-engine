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
            type Player = {
                playerId: string;
                x: number;
                y: number;
            };

            type GameState = {
                tick: number;
                players: Record<string, Player>;
            };

            const data = JSON.parse(e.data) as GameState;
            if (!data || !data.players) return;
            console.log(data);
            for (const [playerId, player] of Object.entries(data.players)) {
                if (playerId != this.game.playerId) {
                    this.game.gameState.movePlayer(playerId, new Vec3(-player.y, 0, -player.x));
                } else {
                    this.game.actionBuffer.discardUpTo(data.tick);
                    const state = this.game.actionBuffer.replay({ x: player.x, y: player.y });
                    const trans = this.game.gameState.players.get(this.game.playerId!)?.translation;
                    if (-state.y != trans?.x() || -state.x != trans.z()) {
                        console.log(
                            'diff',
                            `simulated position ${-state.y}:${-state.x}; where he at right now ${trans?.x()}:${trans?.z()}`,
                        );
                    }
                    this.game.gameState.movePlayer(playerId, new Vec3(-state.y, 0, -state.x));
                }
            }
        },

        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened game state channel');
        },
    };
}
