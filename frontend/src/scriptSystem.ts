import type { GameState } from './gameState';
import type { Model } from './graphics/model';
import type { Scene } from './graphics/scene';
import { Input } from './inputSystem';

export interface ScriptContext {
    model: Model;
    scene: Scene;
    dt: number;
    input: Input;
    gameState: GameState;
}

export interface Script {
    onInit?(ctx: ScriptContext): void;
    update(ctx: ScriptContext): void;
}

interface ScriptInstance {
    script: Script;
    initialized: boolean;
}

export class ScriptSystem {
    private scripts = new Map<Model, ScriptInstance[]>();
    public input = new Input();

    attach(model: Model, script: Script) {
        const existing = this.scripts.get(model) ?? [];
        existing.push({ script, initialized: false });
        this.scripts.set(model, existing);
    }

    detach(model: Model, script: Script) {
        const existing = this.scripts.get(model);
        if (!existing) return;
        const next = existing.filter((s) => s.script !== script);
        if (next.length === 0) this.scripts.delete(model);
        else this.scripts.set(model, next);
    }

    detachAll(model: Model) {
        this.scripts.delete(model);
    }

    update(dt: number, scene: Scene, gs: GameState) {
        for (const [model, instances] of this.scripts) {
            const ctx: ScriptContext = { model, scene, dt, input: this.input, gameState: gs };
            for (const instance of instances) {
                if (!instance.initialized) {
                    instance.script.onInit?.(ctx);
                    instance.initialized = true;
                }
                instance.script.update(ctx);
            }
        }
        this.input.flush();
    }

    async loadScript(file: File): Promise<Script> {
        const source = await file.text();
        const blob = new Blob([source], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const module = await import(url);
        URL.revokeObjectURL(url);

        if (typeof module.default?.update !== 'function') {
            throw new Error('Script must export a default object with an update method');
        }

        return module.default as Script;
    }
}
