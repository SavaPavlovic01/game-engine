export default {
    onInit({ model }) {
        console.log('attached to', model);
    },
    update({ model, scene, input, dt, gameState}) {
        if (input.isKeyDown('w')) {
            gameState.translate(model, model.forward.scale(dt * 5 / 1000))
        }

        if (input.isKeyDown('a')) {
            gameState.translate(model, model.right.scale(dt * 5 / 1000))
        }

        if (input.isKeyDown('d')) {
            gameState.translate(model, model.right.negate().scale(dt * 5 / 1000))
        }

        if (input.isKeyDown('s')) {
            gameState.translate(model, model.forward.negate().scale(dt * 5 / 1000))
        }
    }
}