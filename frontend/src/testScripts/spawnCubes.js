
const RADIUS = 5;
const INTERVAL = 1000;

const { Vec3, Quat, Cube } = window.__engine;

let elapsed = 0;

function spawnCube(gameState, game, model) {
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    const center = model.translation
    const cube = new Cube('default', new Vec3(x + center.X, center.Y, z + center.Z), Quat.identity(), new Vec3(1, 1, 1));
    const script = game.scriptSystem.getScript("moveCubes")
    game.scriptSystem.attach(cube, script)
    gameState.addModel(cube);
}

export default {
    onInit({ gameState, game, model }) {
        spawnCube(gameState, game, model);
    },

    update({ gameState, dt, game, model }) {
        elapsed += dt;
        if (elapsed >= INTERVAL) {
            elapsed = 0;
            spawnCube(gameState, game, model);
        }
    }
}