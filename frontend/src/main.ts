import { Game } from './game.js';
import { test } from './generated/shaders.js';
import { Graphics } from './graphics/graphics.js';
import { DirectionalLight } from './graphics/lightSource.js';
import { Material } from './graphics/materials/material.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { LightCube } from './graphics/objects/lightCube.js';
import { Ramp } from './graphics/objects/ramp.js';
import { Scene } from './graphics/scene.js';
import { ShaderPipeline } from './graphics/shaderPipeline.js';
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

    const texture = await game.gameState.scene.materials.loadTexture('tex.avif');

    const material = game.gameState.scene.materials.default;
    const wallMat = game.gameState.scene.materials.getWithDefaultShader(
        {
            baseColor: [1, 0.2, 0.9],
            metallic: 0.1,
            roughness: 0.1,
        },
        texture,
    );

    const cube = new Cube(material);
    const cube2 = new Cube(material, new Vec3(1, 0, 0));
    const ramp = new Ramp(wallMat, new Vec3(0, -2, 0), new Vec3(0, 0, 0), new Vec3(10, 5, 10));
    const wall = new Cube(wallMat, new Vec3(0, 0, 6.9), new Vec3(0, 0, 0), new Vec3(10, 10, 5));

    const light = new LightCube(material, new Vec3(0, 10, -2));
    const dirLight = new DirectionalLight(new Vec3(0, 0, 1), new Vec3(1, 1, 1));
    game.gameState.scene.addPointLight(game.graphics.driver, light);
    // game.gameState.scene.addObject(game.graphics.driver, cube);
    game.gameState.scene.addStaticObject(game.graphics.driver, ramp);
    game.gameState.scene.addStaticObject(game.graphics.driver, wall);
    // game.gameState.scene.addObject(game.graphics.driver, cube2);
    const floor = new Cube(material, new Vec3(0, -5, 0), new Vec3(0, 0, 0), new Vec3(20, 1, 20));
    game.addPlayer();
    game.gameState.scene.addStaticObject(game.graphics.driver, floor);
    //game.gameState.scene.addDirectionalLight(game.graphics.driver, dirLight);

    //setInterval(() => {
    //function update() {
    //angle += 0.01;
    //const x = Math.cos(angle) * radius;
    //const z = Math.sin(angle) * radius;
    //light.lightColor = new Vec3(
    //1, //Math.max(Math.cos(angle), 0),
    //1, //Math.max(Math.sin(angle), 0),
    //1, //Math.max(1 - Math.sin(angle), 0),
    //);
    //game.gameState.scene.setObjectTranslate(game.graphics.driver, light, new Vec3(x, 0, z));
    //game.gameState.scene.updatePointLight(game.graphics.driver, light);
    //}

    //update();
    //}, 20);

    game.startRender();
};
