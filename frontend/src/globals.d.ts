import type { Vec3 } from './graphics/math/vec';
import type { Quat } from './graphics/math/quat';
import type { Cube } from './graphics/objects/cube';
import type { Ramp } from './graphics/objects/ramp';
import type { ScriptSystem } from './scriptSystem';

declare global {
    interface Window {
        __engine: {
            Vec3: typeof Vec3;
            Quat: typeof Quat;
            Cube: typeof Cube;
            Ramp: typeof Ramp;
        };
    }
}
