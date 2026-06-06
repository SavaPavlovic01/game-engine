import { Game } from './game.js';
import { DirectionalLight } from './graphics/lightSource.js';
import { MaterialId } from './graphics/materials/material.js';
import { Quat } from './graphics/math/quat.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
//import { LightCube } from './graphics/objects/lightCube.js';
import { Ramp } from './graphics/objects/ramp.js';
import { Skybox } from './graphics/skybox.js';
import { InputHandler } from './inputHandler.js';
import { MaterialEditor } from './ui/materialEditor.js';
import { SceneEditor } from './ui/sceneEditor.js';

let game: Game;
let inputHandler: InputHandler;

setInterval(() => {});

//let angle = 0;
//const radius = 3;

window.onload = async () => {
    game = await Game.create();
    game.renderer.init(
        game.graphics.driver.ctx.canvas.width,
        game.graphics.driver.ctx.canvas.height,
    );
    inputHandler = new InputHandler(game);

    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => inputHandler.makeLobby();
    const joinButton = document.getElementById('joinLobby') as HTMLButtonElement;
    joinButton.onclick = () => inputHandler.joinLobby();
    const startGameButton = document.getElementById('startGame') as HTMLButtonElement;
    startGameButton.onclick = () => inputHandler.startGame();

    const skybox = new Skybox();
    await skybox.init(game.graphics.driver, [
        'sky/px.png', // +X
        'sky/nx.png', // -X
        'sky/py.png', // +Y
        'sky/ny.png', // -Y
        'sky/pz.png', // +Z
        'sky/nz.png', // -Z
    ]);
    game.gameState.scene.skybox = skybox;

    const texture = await game.renderer.materials.loadTexture('tex.avif');
    game.renderer.materials.register(
        'wall',
        { baseColor: [1, 0.2, 0.9], metallic: 0.1, roughness: 0.1 },
        texture,
    );

    const ramp = new Ramp('wall', new Vec3(0, -2, 0), Quat.identity(), new Vec3(10, 5, 10));
    const wall = new Cube('wall', new Vec3(0, 0, 6.9), Quat.identity(), new Vec3(10, 10, 5));
    const floor = new Cube(
        MaterialId.Default,
        new Vec3(0, -5, 0),
        Quat.identity(),
        new Vec3(50, 1, 50),
    );
    game.gameState.addStaticModel(ramp);
    game.gameState.addStaticModel(wall);
    game.gameState.addStaticModel(floor);

    const movingCube = new Cube('wall', new Vec3(0, 10, 0));
    game.gameState.addDynamicModel(movingCube, {
        mass: 10,
        restitution: 0.1,
        friction: 0.6,
        linearDamping: 0.1,
        angularDamping: 0.9,
    });

    //const cube = new Cube(MaterialId.Default);
    //const cube2 = new Cube(MaterialId.Default, new Vec3(1, 0, 0));
    //game.gameState.addModel(cube);
    //game.gameState.addModel(cube2);

    const dirLight = new DirectionalLight(new Vec3(0.3, -0.5, 0.3), new Vec3(1, 1, 1), 0.5);
    game.gameState.scene.addDirectionalLight(dirLight);

    //const light = new LightCube(MaterialId.Default, new Vec3(0, 10, -2));
    //game.gameState.scene.addPointLight(light);

    await game.addPlayer();

    //setInterval(() => {
    //    angle += 0.01;
    //    const x = Math.cos(angle) * radius;
    //    const z = Math.sin(angle) * radius;
    //    //light.lightColor = new Vec3(
    //    //    1, //Math.max(Math.cos(angle), 0),
    //    //    1, //Math.max(Math.sin(angle), 0),
    //    //    1, //Math.max(1 - Math.sin(angle), 0),
    //    //);
    //    game.gameState.moveModel(light, new Vec3(x, 0, z));
    //    game.gameState.scene.updatePointLight(light);
    //}, 20);

    game.startRender();

    const editor = new SceneEditor(game);
    const materialEditor = new MaterialEditor(game);
};
