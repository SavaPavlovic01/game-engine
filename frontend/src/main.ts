import { Game } from './game.js';
import { Graphics } from './graphics/graphics.js';
import { DirectionalLight } from './graphics/lightSource.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { LightCube } from './graphics/objects/lightCube.js';
import { Ramp } from './graphics/objects/ramp.js';
import { Scene } from './graphics/scene.js';
import { InputHandler } from './inputHandler.js';

var game: Game;
var inputHandler: InputHandler;

setInterval(() => {});

let angle = 0;
const radius = 3;

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

    const cube = new Cube();
    const ramp = new Ramp(new Vec3(5, 0, 0));

    const light = new LightCube();
    const dirLight = new DirectionalLight(new Vec3(0, 0, -1), new Vec3(1, 1, 1));
    game.gameState.scene.addPointLight(game.graphics.driver, light);
    game.gameState.scene.addObject(game.graphics.driver, cube);
    game.gameState.scene.addObject(game.graphics.driver, ramp);
    //game.gameState.scene.addDirectionalLight(game.graphics.driver, dirLight);

    setInterval(() => {
        function update() {
            angle += 0.01;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            light.lightColor = new Vec3(
                Math.max(Math.cos(angle), 0),
                Math.max(Math.sin(angle), 0),
                Math.max(1 - Math.sin(angle), 0),
            );
            game.gameState.scene.setObjectTranslate(game.graphics.driver, light, new Vec3(x, 0, z));
            game.gameState.scene.updatePointLight(game.graphics.driver, light);
        }

        update();
    }, 20);

    game.startRender();
};
