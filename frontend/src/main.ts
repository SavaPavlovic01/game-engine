import { Game } from './game.js';

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

window.onload = () => {
    canvas = document.getElementById('canvas') as HTMLCanvasElement;
    initCanvas();
    const button = document.getElementById('makeLobbyButton') as HTMLButtonElement;
    button.onclick = () => game.makeLobby();
};

window.onkeydown = (ev: KeyboardEvent) => {
    switch (ev.key) {
        case 'w':
            playerPos.y -= playerSpeed;
            break;
        case 'a':
            playerPos.x -= playerSpeed;
            break;
        case 's':
            playerPos.y += playerSpeed;
            break;
        case 'd':
            playerPos.x += playerSpeed;
        default:
            break;
    }
    drawPlayers();
};

const game = new Game();
await game.initChannels();
