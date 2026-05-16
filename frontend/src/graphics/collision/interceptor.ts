import type { Model } from '../model';
import type { Ray } from './ray';

export interface Interceptor {
    hitFirst(ray: Ray): { model: Model; distance: number } | null;
    hitAll(ray: Ray): { model: Model; distance: number }[];
    overlapping(model: Model): Model[];
    update(models: Model[]): void;
}
