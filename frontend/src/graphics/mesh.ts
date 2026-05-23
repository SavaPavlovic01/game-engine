import { Vec3 } from './math/vec';
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
