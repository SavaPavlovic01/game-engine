import type { DirectionalLight, LightSource } from './lightSource';
import type { Model } from './model';
import type { Scene } from './scene';
import type { WebGPUDriver } from './webGpuDriver';

export class LightManager {
    private static readonly MAX_DIRECTIONAL_LIGHTS = 4;
    private static readonly MAX_POINT_LIGHTS = 16;

    private directionalSlots: (DirectionalLight | null)[] = new Array(
        LightManager.MAX_DIRECTIONAL_LIGHTS,
    ).fill(null);

    private pointSlots: ((Model & LightSource) | null)[] = new Array(
        LightManager.MAX_POINT_LIGHTS,
    ).fill(null);

    public readonly directionalBuffer: GPUBuffer;
    public readonly pointBuffer: GPUBuffer;

    constructor(private driver: WebGPUDriver) {
        this.directionalBuffer = driver.makeBuffer(
            32 * LightManager.MAX_DIRECTIONAL_LIGHTS,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        this.pointBuffer = driver.makeBuffer(
            32 * LightManager.MAX_POINT_LIGHTS,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );
    }

    public sync(scene: Scene) {
        this.syncDirectional(scene);
        this.syncPoint(scene);
    }

    private syncDirectional(scene: Scene) {
        // Clear all slots, then re-assign from scene
        this.directionalSlots.fill(null);

        for (let i = 0; i < scene.directionalLights.length; i++) {
            if (i >= LightManager.MAX_DIRECTIONAL_LIGHTS) {
                console.warn('Max directional lights exceeded, ignoring extras');
                break;
            }
            const light = scene.directionalLights[i]!;
            this.directionalSlots[i] = light;
            light.lightSlot = i;
            this.driver.device.queue.writeBuffer(
                this.directionalBuffer,
                i * 32,
                light.toFloat32Array(),
            );
        }

        // Zero out any slots that are no longer in use
        for (let i = scene.directionalLights.length; i < LightManager.MAX_DIRECTIONAL_LIGHTS; i++) {
            this.driver.device.queue.writeBuffer(
                this.directionalBuffer,
                i * 32,
                new Float32Array(8),
            );
        }
    }

    private syncPoint(scene: Scene) {
        this.pointSlots.fill(null);

        for (let i = 0; i < scene.pointLights.length; i++) {
            if (i >= LightManager.MAX_POINT_LIGHTS) {
                console.warn('Max point lights exceeded, ignoring extras');
                break;
            }
            const light = scene.pointLights[i]!;
            this.pointSlots[i] = light;
            light.lightSlot = i;
            this.driver.device.queue.writeBuffer(this.pointBuffer, i * 32, light.toFloat32Array());
        }

        for (let i = scene.pointLights.length; i < LightManager.MAX_POINT_LIGHTS; i++) {
            this.driver.device.queue.writeBuffer(this.pointBuffer, i * 32, new Float32Array(8));
        }
    }

    public getPrimaryDirectionalLight(): DirectionalLight | null {
        return this.directionalSlots[0] ?? null;
    }
}
