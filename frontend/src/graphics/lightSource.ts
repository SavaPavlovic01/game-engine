import { Vec3 } from './math/vec';

export interface LightData {
    color: Vec3;
    intensity: number;
}

export interface LightSource {
    getLightData(): LightData;
}

export function isLightSource(obj: unknown): obj is LightSource {
    return typeof (obj as any).getLightData === 'function';
}

export class DirectionalLight implements LightSource {
    public slot!: number;

    constructor(
        public direction: Vec3,
        public color: Vec3 = new Vec3(1, 1, 1),
        public intensity: number = 1.0,
    ) {}

    getLightData(): LightData {
        return { color: this.color, intensity: this.intensity };
    }

    toFloat32Array(): Float32Array {
        return new Float32Array([
            this.direction.x(),
            this.direction.y(),
            this.direction.z(),
            0.0,
            this.color.x(),
            this.color.y(),
            this.color.z(),
            this.intensity,
        ]);
    }
}
