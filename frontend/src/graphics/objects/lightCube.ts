import type { LightData, LightSource } from '../lightSource';
import type { Material } from '../materials/material';
import { Vec3 } from '../math/vec';
import { Cube } from './cube';

export class LightCube extends Cube implements LightSource {
    public lightSlot!: number;

    constructor(
        material: Material,
        translate: Vec3 = new Vec3(0, 0, 0),
        rotate: Vec3 = new Vec3(0, 0, 0),
        scale: Vec3 = new Vec3(1, 1, 1),
        public lightColor: Vec3 = new Vec3(1, 1, 1),
        public intensity: number = 1,
        public radius: number = 10,
    ) {
        super(material, translate, rotate, scale);
    }

    public getLightData(): LightData {
        return { color: this.lightColor, intensity: this.intensity };
    }

    public toFloat32Array(): Float32Array {
        return new Float32Array([
            this.translation.x(),
            this.translation.y(),
            this.translation.z(),
            this.radius,
            this.lightColor.x(),
            this.lightColor.y(),
            this.lightColor.z(),
            this.intensity,
        ]);
    }
}
