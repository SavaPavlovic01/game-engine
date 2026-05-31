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
    private instanceBuffers: Map<ModelPart, InstanceBuffer> = new Map();

    constructor(private driver: WebGPUDriver) {}

    public register(model: Model) {
        for (const part of model.parts) {
            part.slot = this.getOrCreateBuffer(part).add(
                this.driver,
                model.getModelMatrix().toColumnMajor(),
            );
        }
    }

    public unregister(model: Model) {
        for (const part of model.parts) {
            this.getOrCreateBuffer(part).remove(this.driver, part.slot!);
        }
    }

    public updateTransform(model: Model) {
        for (const part of model.parts) {
            this.getOrCreateBuffer(part).update(
                this.driver,
                part.slot!,
                model.getModelMatrix().toColumnMajor(),
            );
        }
    }

    public compactAndGetDrawCalls(
        encoder: GPUCommandEncoder,
        materials?: MaterialLibrary,
    ): DrawCall[] {
        const drawCalls: DrawCall[] = [];

        for (const [part, buffer] of this.instanceBuffers) {
            const compacted = buffer.compact(this.driver, encoder, part.indices.length);
            drawCalls.push({ part, rawBuffer: buffer, ...compacted });
        }

        drawCalls.sort((a, b) => a.part.materialId.localeCompare(b.part.materialId));

        return drawCalls;
    }

    private getOrCreateBuffer(part: ModelPart): InstanceBuffer {
        let buffer = this.instanceBuffers.get(part);
        if (!buffer) {
            buffer = new InstanceBuffer(this.driver, 10000);
            this.instanceBuffers.set(part, buffer);
        }
        return buffer;
    }
}
