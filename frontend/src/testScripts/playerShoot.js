const { Vec3, Quat, Cube } = window.__engine;

function spawnExplosion(position, gameState, game) {
    const particleScript = game.scriptSystem.getScript('particle');
    for (let i = 0; i < 12; i++) {
        const cube = new Cube(
            'default',
            position.add(new Vec3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
            )),
            Quat.identity(),
            new Vec3(0.2, 0.2, 0.2),
        );
        gameState.addModel(cube);
        if (particleScript) game.scriptSystem.attach(cube, particleScript);
    }
}


export default {
    onInit({ model }) {
    },

    update({ model, scene, input, dt, gameState, game}) {

        if (input.isKeyPressed('y')) {
            const hits = scene.interceptor.hitAll(model.ray)
            if (hits === null) return
            for(const hit of hits) {
                if(hit.model == model) continue
                game.scriptSystem.detachAll(hit.model)
                gameState.removeModel(hit.model)

                spawnExplosion(hit.model.translation, gameState, game)
                break
            }
        }

    }
}