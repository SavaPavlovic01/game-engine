import type { Vec3 } from '../math/vec';

export interface AABB {
    min: Vec3;
    max: Vec3;
}

export function aabbOverlapsAABB(a: AABB, b: AABB): boolean {
    for (let i = 0; i < 3; i++) {
        if (a.max.index(i) < b.min.index(i)) return false;
        if (a.min.index(i) > b.max.index(i)) return false;
    }
    return true;
}

export class Ray {
    public origin: Vec3;
    public direction: Vec3;

    constructor(origin: Vec3, direction: Vec3) {
        this.origin = origin;
        this.direction = direction;
    }

    public intersectsAABB(aabb: AABB): number | null {
        let tmin = -Infinity;
        let tmax = Infinity;

        for (let i = 0; i < 3; i++) {
            const origin = this.origin.index(i);
            const dir = this.direction.index(i);
            const min = aabb.min.index(i);
            const max = aabb.max.index(i);

            if (Math.abs(dir) < 1e-8) {
                if (origin < min || origin > max) return null;
            } else {
                const t1 = (min - origin) / dir;
                const t2 = (max - origin) / dir;
                tmin = Math.max(tmin, Math.min(t1, t2));
                tmax = Math.min(tmax, Math.max(t1, t2));
            }
        }

        if (tmax < 0 || tmin > tmax) return null;
        return tmin >= 0 ? tmin : tmax;
    }
}
