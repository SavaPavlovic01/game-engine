import { Mat4 } from './math/mat';
import { Vec3 } from './math/vec';
import { Model } from './model';

export class Camera {
    private position: Vec3;
    private rotation: Vec3;

    public fov: number = (60 * Math.PI) / 180;
    public aspectRatio: number = 1;
    public near: number = 0.1;
    public far: number = 1000;

    private viewMatrix: Mat4;
    private projectionMatrix: Mat4;

    constructor(
        position: Vec3,
        rotation: Vec3,
        fov: number = 60,
        aspectRatio: number = 1,
        far: number = 1000,
        near: number = 0.1,
    ) {
        this.position = position;
        this.rotation = rotation;
        this.fov = (fov * Math.PI) / 180;
        this.aspectRatio = aspectRatio;
        this.near = near;
        this.far = far;

        this.viewMatrix = this.buildViewMatrix();
        this.projectionMatrix = this.buildProjectionMatrix();
    }

    public getForwardVector(): Vec3 {
        const pitch = this.rotation.x();
        const yaw = this.rotation.y();

        const x = Math.sin(yaw) * Math.cos(pitch);
        const y = Math.sin(pitch);
        const z = -Math.cos(yaw) * Math.cos(pitch);

        return new Vec3(x, y, z).normalize();
    }

    public getRightVector(): Vec3 {
        const forward = this.getForwardVector();
        const worldUp = new Vec3(0, 1, 0);

        return forward.cross(worldUp).normalize();
    }

    public translate(trans: Vec3) {
        this.position = this.position.add(trans);
        this.viewMatrix = this.buildViewMatrix();
    }

    public rotate(rot: Vec3) {
        this.rotation = this.rotation.add(rot);
        this.viewMatrix = this.buildViewMatrix();
    }

    private buildProjectionMatrix(): Mat4 {
        return Mat4.perspective(this.fov, this.aspectRatio, this.near, this.far);
    }

    private buildViewMatrix(): Mat4 {
        const eye = this.position;
        const forward = this.getForwardVector();
        const target = eye.add(forward);
        const up = new Vec3(0, 1, 0);
        return Mat4.lookAt(eye, target, up);
    }

    public getProjection() {
        return this.projectionMatrix;
    }

    public getView() {
        return this.viewMatrix;
    }
}
