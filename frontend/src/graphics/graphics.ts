import { WebGPUDriver } from './webGpuDriver';

export class Graphics {
    public driver: WebGPUDriver;
    public canvas?: HTMLCanvasElement;

    constructor(driver: WebGPUDriver) {
        this.driver = driver;
    }

    public static async create(canvas: HTMLCanvasElement) {
        const driver = await WebGPUDriver.create();
        const graph = new Graphics(driver);
        const ctx = graph.initCanvas(canvas);
        driver.ctx = ctx;
        return graph;
    }

    public initCanvas(canvas: HTMLCanvasElement): GPUCanvasContext {
        const ctx = canvas.getContext('webgpu') as GPUCanvasContext;
        ctx.configure({ device: this.driver.device, format: this.driver.format });
        this.canvas = canvas;
        return ctx;
    }
}
