import { Game } from './game.js';
import { Graphics } from './graphics/graphics.js';
import { Vec3 } from './graphics/math/vec.js';
import { Cube } from './graphics/objects/cube.js';
import { Scene } from './graphics/scene.js';

interface LobbyInfo {
    id: string;
    playerCnt: number;
}

var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D | null;

interface position {
    x: number;
    y: number;
}

let playerPos: position = { x: 0, y: 0 };
let otherPlayerPos: position = { x: 25, y: 25 };

const playerSize = 25;
const playerSpeed = 5;

function drawPlayer(pos: position, color: string = 'red') {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const canvasX = pos.x + w / 2 - playerSize / 2;
    const canvasY = pos.y + h / 2 - playerSize / 2;

    ctx.fillStyle = color;
    ctx.fillRect(canvasX, canvasY, playerSize, playerSize);
}

function drawPlayers() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer(playerPos);
    drawPlayer(otherPlayerPos, 'blue');
}

function initCanvas() {
    ctx = canvas.getContext('2d');
    if (!canvas) {
        console.log('canvas is null');
        return;
    }
    if (!ctx) {
        console.log('ctx is null');
        return;
    }
    ctx.fillStyle = 'red';
    drawPlayers();
}

var graphics: Graphics;
var scene: Scene;
const cube = new Cube(new Vec3(0, 0, -5));
const cube1 = new Cube(new Vec3(2, 0, -10));

setInterval(() => {
    cube.rotate(new Vec3(0.1, 0.1, 0.1));
}, 50);

window.onload = async () => {
    canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => game.makeLobby();

    const joinButton = document.getElementById('joinLobby') as HTMLButtonElement;
    joinButton.onclick = () => game.joinLobby();

    graphics = await Graphics.create(canvas);
    scene = new Scene();

    scene.addObject(cube);
    scene.addObject(cube1);

    function frame() {
        scene.renderScene(graphics.driver);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

window.onkeydown = (ev: KeyboardEvent) => {
    console.log('hellos');
    switch (ev.key) {
        case 'w':
            scene.camera.translate(new Vec3(0, 0, -1));
            break;
        case 'a':
            scene.camera.translate(new Vec3(-1, 0, 0));
            break;
        case 's':
            scene.camera.translate(new Vec3(0, 0, 1));
            break;
        case 'd':
            scene.camera.translate(new Vec3(1, 0, 0));
        default:
            break;
    }
};

const game = new Game();
await game.initChannels();
