import { Game } from './game.js';
import { Graphics } from './graphics/graphics.js';
import { DirectionalLight } from './graphics/lightSource.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';
import { InputHandler } from './inputHandler.js';

var game: Game;
var inputHandler: InputHandler;

window.onload = async () => {
    game = await Game.create();
    await game.init();
    inputHandler = new InputHandler(game);

    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => inputHandler.makeLobby();

    const joinButton = document.getElementById('joinLobby') as HTMLButtonElement;
    joinButton.onclick = () => inputHandler.joinLobby();

    const startGameButton = document.getElementById('startGame') as HTMLButtonElement;
    startGameButton.onclick = () => inputHandler.startGame();

    const light = new DirectionalLight(new Vec3(-1, -1, -1), new Vec3(1, 0, 0), 1);
    game.gameState.scene.addDirectionalLight(game.graphics.driver, light);

    game.startRender();
};
