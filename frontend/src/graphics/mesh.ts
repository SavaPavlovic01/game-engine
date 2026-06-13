import { Vec3 } from './math/vec';
import { STRIDE } from '../constants';
import type { WebGPUDriver } from './webGpuDriver';

export class Mesh {
    public readonly vertices: Float32Array;
    public readonly indices: Uint16Array;

    private static nextId: number = 0;
    public readonly id: number = Mesh.nextId++;
    public readonly positions: Vec3[] = [];

    private vertexBuffer?: GPUBuffer;
    private indexBuffer?: GPUBuffer;

    constructor(vertices: Float32Array, indices: Uint16Array, stride: number) {
        this.vertices = vertices;
        this.indices = indices;
        for (let i = 0; i < vertices.length; i += stride) {
            this.positions.push(new Vec3(vertices[i]!, vertices[i + 1]!, vertices[i + 2]!));
        }
    }

    public getVertexBuffer(driver: WebGPUDriver): GPUBuffer {
        this.vertexBuffer ??= driver.fillBuffer(
            this.vertices,
            GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        );
        return this.vertexBuffer;
    }

    public getIndexBuffer(driver: WebGPUDriver): GPUBuffer {
        this.indexBuffer ??= driver.fillBuffer(
            this.indices,
            GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        );
        return this.indexBuffer;
    }
}

export class ModelPart extends Mesh {
    public materialId: string;
    public slot?: number;

    constructor(vertices: Float32Array, indices: Uint16Array, materialId: string) {
        super(vertices, indices, STRIDE);
        this.materialId = materialId;
    }
}

export class ModelPartLibrary {
    private parts: Map<string, ModelPart> = new Map();

    private hash(vertices: Float32Array, indices: Uint16Array, materialId: string): string {
        const v = vertices;
        const i = indices;
        return `v${v.length}:${v[0]},${v[1]},${v[v.length - 2]},${v[v.length - 1]}_i${i.length}:${i[0]},${i[1]},${i[i.length - 2]},${i[i.length - 1]}_m${materialId}`;
    }

    public get(vertices: Float32Array, indices: Uint16Array, materialId: string): ModelPart {
        const key = this.hash(vertices, indices, materialId);
        if (!this.parts.has(key)) {
            this.parts.set(key, new ModelPart(vertices, indices, materialId));
        }
        return this.parts.get(key)!;
    }
}

export const modelPartLibrary = new ModelPartLibrary();
