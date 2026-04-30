import { Game } from './game.js';
import { Graphics } from './graphics/graphics.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';

const game = new Game();

window.onload = async () => {
    await game.init();

    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => game.makeLobby();

    const joinButton = document.getElementById('joinLobby') as HTMLButtonElement;
    joinButton.onclick = () => game.joinLobby();

    const startGameButton = document.getElementById('startGame') as HTMLButtonElement;
    startGameButton.onclick = () => game.startGame();

    async function frame() {
        await game.gameState.scene.renderScene(game.graphics.driver);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

window.onkeydown = (ev: KeyboardEvent) => {
    console.log('hellos');
    switch (ev.key) {
        case 'w':
            game.gameState.scene.camera.translate(new Vec3(0, 0, -1));
            game.movePlayer(1, 0);
            break;
        case 'a':
            game.gameState.scene.camera.translate(new Vec3(-1, 0, 0));
            break;
        case 's':
            game.gameState.scene.camera.translate(new Vec3(0, 0, 1));
            break;
        case 'd':
            game.gameState.scene.camera.translate(new Vec3(1, 0, 0));
        default:
            break;
    }
};
