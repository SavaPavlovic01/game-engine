import { MoveAction } from './actions/action';
import type { Game } from './game';
import { Vec3 } from './graphics/math/vec';
import { Lobby } from './lobby';

export class InputHandler {
    public game: Game;

    constructor(game: Game) {
        this.game = game;
        window.onkeydown = this.onKeydown;
        window.onmousemove = this.onMouseMove;
        window.onmousedown = this.onMouseClick;
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
        let dx = 0;
        let dy = 0;
        let px = 0;
        let py = 0;
        const cameraForward = this.game.gameState.scene.camera.getForwardVector().zeroIndex(1);
        const rightVector = this.game.gameState.scene.camera.getRightVector().zeroIndex(1);
        switch (ev.key) {
            case 'w':
                this.game.gameState.scene.camera.translate(cameraForward);
                dx = 1;
                dy = 0;
                break;
            case 'a':
                this.game.gameState.scene.camera.translate(rightVector.negate());
                dx = 0;
                dy = 1;
                break;
            case 's':
                this.game.gameState.scene.camera.translate(cameraForward.negate());
                dx = -1;
                dy = 0;
                break;
            case 'd':
                this.game.gameState.scene.camera.translate(rightVector);
                dx = 0;
                dy = -1;
                break;
            case 'e':
                this.game.gameState.scene.camera.rotate(new Vec3(0.1, 0.1, 0));
                break;
            case 'q':
                this.game.gameState.scene.camera.rotate(new Vec3(0, -0.1, 0.5));
                break;

            case 'i':
                px = 1;
                py = 0;
                break;
            case 'j':
                px = 0;
                py = 1;
                break;
            case 'k':
                px = -1;
                py = 0;
                break;
            case 'l':
                px = 0;
                py = -1;
                break;

            default:
                return;
        }

        const action = new MoveAction(this.game.tick, dx, dy);
        const model = this.game.playerModels[0]!;
        console.log(dy, 0, dx);
        this.game.gameState.scene.offsetObject(
            this.game.graphics.driver,
            model,
            new Vec3(-py, 0, -px),
        );
        action.invoke(this.game);
        this.game.actionBuffer.push(action);
    };

    // TODO: keep rotating when mouse is at the edges
    public onMouseMove = (ev: MouseEvent) => {
        //if (!this.game.gameStarted) return;
        const sens = 0.005;
        const dx = ev.movementX;
        const dy = ev.movementY;
        this.game.rotatePlayer(-dy * sens, dx * sens);
        this.game.gameState.scene.camera.rotate(new Vec3(-dy * sens, dx * sens, 0));
    };

    public onMouseClick = (ev: MouseEvent) => {
        const hit = this.game.gameState.scene.shoot();
        console.log(hit);
    };
}
