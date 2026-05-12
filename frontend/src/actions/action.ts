import type { Game } from '../game';
import { Vec3 } from '../graphics/math/vec';

export type SimulationState = {
    x: number;
    y: number;
};

export abstract class Action {
    private tick: number;

    constructor(tick: number) {
        this.tick = tick;
    }

    public getTick() {
        return this.tick;
    }

    public abstract invoke(game: Game): void;
    public abstract simulate(state: SimulationState): SimulationState;
}

export class MoveAction extends Action {
    private dx: number;
    private dy: number;

    constructor(tick: number, dx: number, dy: number) {
        super(tick);
        this.dx = dx;
        this.dy = dy;
    }

    public invoke(game: Game) {
        if (!game.playerId) return;
        console.log('invoking actoin');
        game.movePlayer(this.dx, this.dy);
    }

    public simulate(state: SimulationState): SimulationState {
        return {
            ...state,
            x: state.x + this.dx * 1,
            y: state.y + this.dy * 1,
        };
    }
}

export class RotationAction extends Action {
    constructor(
        tick: number,
        private dx: number,
        private dy: number,
    ) {
        super(tick);
    }

    public invoke(game: Game): void {
        game.setPlayerRotate(this.dx, this.dy);
    }

    // TODO: i think that we dont need this, since we dont predict rotation idk
    public simulate(state: SimulationState): SimulationState {
        return state;
    }
}
