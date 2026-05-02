import { Game } from './game.js';
import { Graphics } from './graphics/graphics.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';
import { InputHandler } from './inputHandler.js';

const game = new Game();
const inputHandler = new InputHandler(game);

window.onload = async () => {
    await game.init();

    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => inputHandler.makeLobby();

    const joinButton = document.getElementById('joinLobby') as HTMLButtonElement;
    joinButton.onclick = () => inputHandler.joinLobby();

    const startGameButton = document.getElementById('startGame') as HTMLButtonElement;
    startGameButton.onclick = () => inputHandler.startGame();

    game.startRender();
};
