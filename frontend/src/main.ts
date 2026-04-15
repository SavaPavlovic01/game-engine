async function start() {
    const pc = new RTCPeerConnection();

    const dc = pc.createDataChannel('data', {
        ordered: false,
        maxRetransmits: 0,
    });

    dc.onopen = () => {
        console.log('DataChannel open');
        dc.send('hello from client 👋');
    };

    dc.onmessage = (e) => {
        console.log('Server:', e.data);
    };

    dc.onerror = (e) => console.error('DC error:', e);
    dc.onclose = () => console.log('DC closed');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
        };
    });

    const localDesc = pc.localDescription!;

    const res = await fetch('http://localhost:8080/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sdp: localDesc.sdp,
            type: localDesc.type,
        }),
    });

    const answer = await res.json();
    await pc.setRemoteDescription(answer);
}

var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D | null;
let playerPos: { x: number; y: number } = { x: 0, y: 0 };
const playerSize = 50;
const playerSpeed = 5;

function drawPlayer() {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const canvasX = playerPos.x + w / 2 - playerSize / 2;
    const canvasY = playerPos.y + h / 2 - playerSize / 2;
    ctx?.fillRect(canvasX, canvasY, playerSize, playerSize);
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
    drawPlayer();
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
    drawPlayer();
};

start().catch(console.error);
