const { Vec3, Quat, Cube } = window.__engine;

export default {
    onInit() {
    },

    update({ gameState, dt, game, model }) {
        const speed = 1
        const playerPos = game.playerModel.translation
        const cubePos = model.translation

        if(playerPos.distanceTo(cubePos) > 0.1) {
            const dir = playerPos.sub(cubePos)
            gameState.translate(model, dir.normalize().scale(dt / 1000 * speed))
        } else {
            const script = game.scriptSystem.getScript("moveCubes")
            game.scriptSystem.detach(model, script)
            gameState.removeModel(model)
        }
    }
}
