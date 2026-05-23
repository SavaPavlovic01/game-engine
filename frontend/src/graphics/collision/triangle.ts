import { Mat4 } from '../math/mat';
import { Mesh } from '../mesh';
import { Vec3 } from '../math/vec';
import type { AABB } from './ray';
import type { Ray } from './ray';
import type { Bounded } from './BVH';

export class Triangle implements Bounded {
    public readonly a: Vec3;
    public readonly b: Vec3;
    public readonly c: Vec3;
    public readonly normal: Vec3;

    constructor(a: Vec3, b: Vec3, c: Vec3) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.normal = b.sub(a).cross(c.sub(a)).normalize();
    }

    public get center(): Vec3 {
        return this.a
            .add(this.b)
            .add(this.c)
            .scale(1 / 3);
    }

    public get aabb(): AABB {
        return {
            min: new Vec3(
                Math.min(this.a.X, this.b.X, this.c.X),
                Math.min(this.a.Y, this.b.Y, this.c.Y),
                Math.min(this.a.Z, this.b.Z, this.c.Z),
            ),
            max: new Vec3(
                Math.max(this.a.X, this.b.X, this.c.X),
                Math.max(this.a.Y, this.b.Y, this.c.Y),
                Math.max(this.a.Z, this.b.Z, this.c.Z),
            ),
        };
    }

    public rayIntersects(ray: Ray): number | null {
        const EPSILON = 1e-8;
        const edge1 = this.b.sub(this.a);
        const edge2 = this.c.sub(this.a);

        const h = ray.direction.cross(edge2);
        const a = edge1.dot(h);

        if (Math.abs(a) < EPSILON) return null;

        const f = 1 / a;
        const s = ray.origin.sub(this.a);
        const u = f * s.dot(h);

        if (u < 0 || u > 1) return null;

        const q = s.cross(edge1);
        const v = f * ray.direction.dot(q);

        if (v < 0 || u + v > 1) return null;

        const t = f * edge2.dot(q);
        return t > EPSILON ? t : null;
    }

    // meant to be called on static geometry once, maybe move to the gpu?

    public static extractFromMesh(mesh: Mesh, modelMatrix: Mat4): Triangle[] {
        const triangles: Triangle[] = [];
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = modelMatrix.transformPoint(mesh.positions[mesh.indices[i]!]!);
            const b = modelMatrix.transformPoint(mesh.positions[mesh.indices[i + 1]!]!);
            const c = modelMatrix.transformPoint(mesh.positions[mesh.indices[i + 2]!]!);
            triangles.push(new Triangle(a, b, c));
        }
        return triangles;
    }
}
