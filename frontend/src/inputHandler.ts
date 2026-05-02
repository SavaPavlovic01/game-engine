import type { Game } from './game';
import { Vec3 } from './graphics/math/vec';
import { Lobby } from './lobby';

export class InputHandler {
    public game: Game;

    constructor(game: Game) {
        this.game = game;
        window.onkeydown = this.onKeydown;
    }

    public makeLobby() {
        console.log('im here');
        if (!this.game.lobbyChannel || !this.game.playerId) return;
        console.log('sending');
        Lobby.makeLobbyRequest(this.game.playerId, this.game.lobbyChannel.channel);
    }

    public joinLobby() {
        console.log('trying to join lobby');
        if (!this.game.playerId || !this.game.lobbyChannel) return;
        if (this.game.lobby && this.game.lobby.InLobby) {
            console.log('already in lobby');
            return;
        }
        const text = document.getElementById('lobbyField') as HTMLInputElement;
        if (text) {
            console.log('found text');
            console.log(text.value);
        }
        Lobby.joinLobbyRequest(this.game.playerId, text.value, this.game.lobbyChannel.channel);
    }

    public startGame() {
        console.log('starting game');
        if (
            !this.game.lobby ||
            !this.game.lobbyChannel ||
            !this.game.playerId ||
            !this.game.lobby.Id
        )
            return;
        Lobby.startGameRequest(
            this.game.playerId,
            this.game.lobby.Id,
            this.game.lobbyChannel.channel,
        );
    }

    public onKeydown = (ev: KeyboardEvent) => {
        console.log('hellos');
        switch (ev.key) {
            case 'w':
                this.game.gameState.scene.camera.translate(new Vec3(0, 0, -1));
                this.game.movePlayer(1, 0);
                break;
            case 'a':
                this.game.gameState.scene.camera.translate(new Vec3(-1, 0, 0));
                this.game.movePlayer(0, 1);
                break;
            case 's':
                this.game.gameState.scene.camera.translate(new Vec3(0, 0, 1));
                this.game.movePlayer(-1, 0);
                break;
            case 'd':
                this.game.gameState.scene.camera.translate(new Vec3(1, 0, 0));
                this.game.movePlayer(0, -1);
            default:
                break;
        }
    };
}
