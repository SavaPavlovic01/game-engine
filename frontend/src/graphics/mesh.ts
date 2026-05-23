import type { WebGPUDriver } from './webGpuDriver';

export class Mesh {
    public readonly vertices: Float32Array;
    public readonly indices: Uint16Array;

    private static nextId: number = 0;
    public readonly id: number = Mesh.nextId++;

    private vertexBuffer?: GPUBuffer;
    private indexBuffer?: GPUBuffer;

    constructor(vertices: Float32Array, indices: Uint16Array) {
        this.vertices = vertices;
        this.indices = indices;
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
