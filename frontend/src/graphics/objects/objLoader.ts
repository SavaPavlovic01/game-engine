import { STRIDE } from '../../constants';
import type { AABB } from '../collision/ray';
import type { Material } from '../materials/material';
import { Vec3 } from '../math/vec';
import { Mesh, meshLibrary } from '../mesh';
import { Model } from '../model';

interface FaceVertex {
    posIdx: number;
    uvIdx: number | null;
    normalIdx: number | null;
}

interface ObjData {
    positions: Vec3[];
    normals: Vec3[];
    uvs: [number, number][];
    faces: FaceVertex[];
}

export class ObjLoader {
    private static parseFace(tokens: string[]): FaceVertex[] {
        const verts = tokens.map((t) => {
            const [p, uv, n] = t.split('/');
            return {
                posIdx: +p! - 1,
                uvIdx: uv && uv !== '' ? +uv - 1 : null,
                normalIdx: n && n !== '' ? +n - 1 : null,
            };
        });

        const tris: FaceVertex[] = [];
        for (let i = 1; i < verts.length - 1; i++) {
            tris.push(verts[0]!, verts[i]!, verts[i + 1]!);
        }
        return tris;
    }

    private static parse(src: string): ObjData {
        const positions: Vec3[] = [];
        const normals: Vec3[] = [];
        const uvs: [number, number][] = [];
        const faces: FaceVertex[] = [];

        for (const rawLine of src.split('\n')) {
            const line = rawLine.replace(/\r/, '').trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            switch (parts[0]) {
                case 'v':
                    positions.push(new Vec3(+parts[1]!, +parts[2]!, +parts[3]!));
                    break;
                case 'vn':
                    normals.push(new Vec3(+parts[1]!, +parts[2]!, +parts[3]!));
                    break;
                case 'vt':
                    uvs.push([+parts[1]!, 1.0 - +parts[2]!]);
                    break;
                case 'f':
                    faces.push(...this.parseFace(parts.slice(1)));
                    break;
            }
        }

        return { positions, normals, uvs, faces };
    }

    private static computeAABB(positions: Vec3[]): AABB {
        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

        for (const p of positions) {
            minX = Math.min(minX, p.X);
            maxX = Math.max(maxX, p.X);
            minY = Math.min(minY, p.Y);
            maxY = Math.max(maxY, p.Y);
            minZ = Math.min(minZ, p.Z);
            maxZ = Math.max(maxZ, p.Z);
        }

        return {
            min: new Vec3(minX, minY, minZ),
            max: new Vec3(maxX, maxY, maxZ),
        };
    }

    private static buildMesh(obj: ObjData): Mesh {
        const fallbackNormal = new Vec3(0, 1, 0);
        const fallbackUV: [number, number] = [0, 0];

        const vertexMap = new Map<string, number>();
        const vertexData: number[] = [];
        const indexData: number[] = [];

        for (const fv of obj.faces) {
            const key = `${fv.posIdx}/${fv.uvIdx}/${fv.normalIdx}`;

            if (!vertexMap.has(key)) {
                const pos = obj.positions[fv.posIdx] ?? new Vec3(0, 0, 0);
                const normal =
                    fv.normalIdx !== null
                        ? (obj.normals[fv.normalIdx] ?? fallbackNormal)
                        : fallbackNormal;
                const uv = fv.uvIdx !== null ? (obj.uvs[fv.uvIdx] ?? fallbackUV) : fallbackUV;

                vertexMap.set(key, vertexData.length / STRIDE);
                vertexData.push(pos.X, pos.Y, pos.Z, normal.X, normal.Y, normal.Z, uv[0], uv[1]);
            }

            indexData.push(vertexMap.get(key)!);
        }

        return meshLibrary.get(new Float32Array(vertexData), new Uint16Array(indexData));
    }

    public static load(src: string): { mesh: Mesh; aabb: AABB } {
        const obj = this.parse(src);
        const mesh = this.buildMesh(obj);
        const aabb = this.computeAABB(obj.positions);
        return { mesh, aabb };
    }
}

export class ObjModel extends Model {
    public readonly localaabb: AABB;

    public static async fetch(url: string): Promise<{ mesh: Mesh; aabb: AABB }> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load OBJ: ${url}`);
        return ObjLoader.load(await res.text());
    }

    constructor(
        mesh: Mesh,
        aabb: AABB,
        material: Material,
        translate = new Vec3(0, 0, 0),
        rotate = new Vec3(0, 0, 0),
        scale = new Vec3(1, 1, 1),
    ) {
        super(translate, rotate, scale, mesh, material);
        this.localaabb = aabb;
    }

    // TODO: changing scale from 1,1,1 messes this up
    // it would have to go up of down depending on the scale
    // collison works funky
    public get center(): Vec3 {
        return new Vec3(
            this.translation.X + (this.localaabb.min.X + this.localaabb.max.X) / 2,
            this.translation.Y + (this.localaabb.min.Y + this.localaabb.max.Y) / 2,
            this.translation.Z + (this.localaabb.min.Z + this.localaabb.max.Z) / 2,
        );
    }

    public getLocalAABB(): AABB {
        return this.localaabb;
    }
}
