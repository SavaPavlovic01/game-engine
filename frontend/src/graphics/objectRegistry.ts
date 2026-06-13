import { InstanceBuffer } from './InstanceBuffer';
import type { MaterialLibrary } from './materials/material';
import type { ModelPart } from './mesh';
import type { Model } from './model';
import type { WebGPUDriver } from './webGpuDriver';

export interface DrawCall {
    part: ModelPart;
    rawBuffer: InstanceBuffer;
    drawBuffer: GPUBuffer;
    drawArgsBuffer: GPUBuffer;
}

export class ObjectRegistry {
    private instanceBuffers: Map<string, { buffer: InstanceBuffer; part: ModelPart }> = new Map();

    constructor(private driver: WebGPUDriver) {}

    private getKey(part: ModelPart): string {
        return `${part.id}:${part.materialId}`;
    }

    public register(model: Model) {
        for (const part of model.parts) {
            model.slots.set(
                part.id,
                this.getOrCreateBuffer(part).add(
                    this.driver,
                    model.getModelMatrix().toColumnMajor(),
                ),
            );
        }
    }

    public unregister(model: Model) {
        for (const part of model.parts) {
            this.getOrCreateBuffer(part).remove(this.driver, model.slots.get(part.id)!);
        }
    }

    public updateTransform(model: Model) {
        for (const part of model.parts) {
            this.getOrCreateBuffer(part).update(
                this.driver,
                model.slots.get(part.id)!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
    }

    public compactAndGetDrawCalls(
        encoder: GPUCommandEncoder,
        materials?: MaterialLibrary,
    ): DrawCall[] {
        const drawCalls: DrawCall[] = [];
        for (const [_, { buffer, part }] of this.instanceBuffers) {
            const compacted = buffer.compact(this.driver, encoder, part.indices.length);
            drawCalls.push({ part, rawBuffer: buffer, ...compacted });
        }
        drawCalls.sort((a, b) => a.part.materialId.localeCompare(b.part.materialId));
        return drawCalls;
    }

    private getOrCreateBuffer(part: ModelPart): InstanceBuffer {
        const key = this.getKey(part);
        let entry = this.instanceBuffers.get(key);
        if (!entry) {
            entry = { buffer: new InstanceBuffer(this.driver, 10000), part };
            this.instanceBuffers.set(key, entry);
        }
        return entry.buffer;
    }
}
