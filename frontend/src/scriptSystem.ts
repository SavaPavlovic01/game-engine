import type { Game } from './game';
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
    game: Game;
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
    private scriptCache = new Map<string, Script>();
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

    update(dt: number, scene: Scene, gs: GameState, game: Game) {
        for (const [model, instances] of this.scripts) {
            const ctx: ScriptContext = {
                model,
                scene,
                dt,
                input: this.input,
                gameState: gs,
                game: game,
            };
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
        const name = file.name.replace(/\.js$/, '');
        if (this.scriptCache.has(name)) return this.scriptCache.get(name)!;

        const blob = new Blob([source], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const module = await import(url);
        URL.revokeObjectURL(url);

        if (typeof module.default?.update !== 'function') {
            throw new Error('Script must export a default object with an update method');
        }

        const script = module.default as Script;
        this.scriptCache.set(name, script);
        return script;
    }

    public getScript(name: string) {
        return this.scriptCache.get(name);
    }
}
