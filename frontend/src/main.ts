const backendUrl = 'http://localhost:8080';

interface DataChannelOps {
    onMessage: ((e: MessageEvent<any>) => any) | null;
    onOpen: ((e: Event) => any) | null;
    onError: ((e: RTCErrorEvent) => any) | null;
    onClose: ((e: Event) => any) | null;
}

interface LobbyInfo {
    id: string;
    playerCnt: number;
}

async function openChannel(
    label: string,
    ops: DataChannelOps,
    ordered: boolean = false,
    maxRetransmits: number = 0,
) {
    const pc = new RTCPeerConnection();

    const dc = pc.createDataChannel(label, {
        ordered: ordered,
        maxRetransmits: maxRetransmits,
    });

    dc.onopen = ops.onOpen;

    dc.onmessage = ops.onMessage;

    dc.onerror = ops.onError;
    dc.onclose = ops.onClose;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
        };
    });

    const localDesc = pc.localDescription!;

    const res = await fetch(`${backendUrl}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sdp: localDesc.sdp,
            type: localDesc.type,
        }),
    });

    const answer = await res.json();
    await pc.setRemoteDescription(answer);
    return dc;
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

async function start() {
    const ops: DataChannelOps = {
        onMessage: (e) => {
            const pos: position = JSON.parse(e.data);
            console.log(`got message ${e.data}`);
            otherPlayerPos = pos;
            drawPlayers();
        },

        onClose: (e) => {
            console.log('closed');
        },
        onError: (e) => {
            console.log('closed');
        },
        onOpen: (e) => {
            console.log('opened');
        },
    };

    const lobbyChannelOps: DataChannelOps = {
        onMessage: (e) => {
            const lobbyInfo: LobbyInfo = JSON.parse(e.data);
            console.log(`got into lobby, info: ${lobbyInfo} `);
        },
        onClose: null,
        onError: null,
        onOpen: (e) => {
            console.log('opened lobby channel');
            const channel = e.target as RTCDataChannel;
            channel.send('i want to join');
        },
    };

    openChannel('data', ops);
    openChannel('lobby', lobbyChannelOps, true, 5);
}

start().catch(console.error);
