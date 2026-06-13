const { Vec3, Quat, Cube } = window.__engine;

const PARTICLE_COUNT = 12;
const FORCE = 5;
const LIFETIME = 800;

export default {
    onInit({ model }) {
        model.userData.lifetime = 0;
        model.userData.velocity = new Vec3(
            (Math.random() - 0.5) * FORCE,
            Math.random() * FORCE,
            (Math.random() - 0.5) * FORCE,
        );
    },
    update({ model, gameState, dt , game}) {
        model.userData.lifetime += dt;
        if (model.userData.lifetime >= LIFETIME) {
            gameState.removeModel(model);
            game.scriptSystem.detachAll(model)
            return;
        }
        
        model.userData.velocity = model.userData.velocity.add(new Vec3(0, -9.8 * dt * 0.001, 0));
        const newPos = model.translation.add(model.userData.velocity.scale(dt * 0.001));
        gameState.moveModel(model, newPos);
    }
}