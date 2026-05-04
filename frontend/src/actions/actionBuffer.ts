import type { Action, SimulationState } from './action';

export class ActionBuffer {
    private actions: Action[] = [];

    push(action: Action) {
        this.actions.push(action);
    }

    discardUpTo(tick: number) {
        let i = 0;
        while (i < this.actions.length && this.actions[i]!.getTick() <= tick) {
            i++;
        }
        this.actions = this.actions.slice(0, i);
    }

    replay(state: SimulationState) {
        let curState = state;
        for (const action of this.actions) {
            curState = action.simulate(curState);
        }
        return curState;
    }

    get length() {
        return this.actions.length;
    }
}
