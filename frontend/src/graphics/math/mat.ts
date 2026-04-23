import type { Vec3 } from './vec';

export class Mat4 {
    public values: Float32Array;

    public toColumnMajor(): Float32Array {
        const ret = new Float32Array(16);

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                ret[col * 4 + row] = this.values[row * 4 + col]!;
            }
        }

        return ret;
    }

    constructor(values: ArrayLike<number>) {
        if (values.length != 16) throw new Error(`passed ${values.length} elements to a mat4`);
        this.values = new Float32Array(values);
    }

    public static zero(): Mat4 {
        return new Mat4(new Float32Array(16));
    }

    public index(i: number, j: number) {
        if (i < 0 || j < 0 || i >= 4 || j >= 4) throw new Error(`out of bounds i = ${i}, j = ${j}`);
        return this.values[i * 4 + j]!;
    }

    public matmul(other: Mat4): Mat4 {
        const res = Mat4.zero();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    res.values[i * 4 + j]! += this.index(i, k) * other.index(k, j);
                }
            }
        }
        return res;
    }

    public static scaleMatrix(scale: Vec3): Mat4 {
        return new Mat4([scale.x(), 0, 0, 0, 0, scale.y(), 0, 0, 0, 0, scale.z(), 0, 0, 0, 0, 1]);
    }

    public static translationMatrix(trans: Vec3): Mat4 {
        return new Mat4([1, 0, 0, trans.x(), 0, 1, 0, trans.y(), 0, 0, 1, trans.z(), 0, 0, 0, 0]);
    }

    static rotationMatrix(rot: Vec3): Mat4 {
        const cx = Math.cos(rot.x());
        const sx = Math.sin(rot.x());

        const cy = Math.cos(rot.y());
        const sy = Math.sin(rot.y());

        const cz = Math.cos(rot.z());
        const sz = Math.sin(rot.z());

        const Rx = new Mat4(
            new Float32Array([1, 0, 0, 0, 0, cx, -sx, 0, 0, sx, cx, 0, 0, 0, 0, 1]),
        );

        const Ry = new Mat4(
            new Float32Array([cy, 0, sy, 0, 0, 1, 0, 0, -sy, 0, cy, 0, 0, 0, 0, 1]),
        );

        const Rz = new Mat4(
            new Float32Array([cz, -sz, 0, 0, sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        );

        return Rz.matmul(Ry).matmul(Rx);
    }

    public static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const f = target.sub(eye).normalize();

        const s = f.cross(up).normalize();

        const u = s.cross(f);

        const ex = eye.x(),
            ey = eye.y(),
            ez = eye.z();

        const sx = s.x(),
            sy = s.y(),
            sz = s.z();
        const ux = u.x(),
            uy = u.y(),
            uz = u.z();
        const fx = f.x(),
            fy = f.y(),
            fz = f.z();

        return new Mat4(
            new Float32Array([
                sx,
                sy,
                sz,
                -(sx * ex + sy * ey + sz * ez),
                ux,
                uy,
                uz,
                -(ux * ex + uy * ey + uz * ez),
                -fx,
                -fy,
                -fz,
                fx * ex + fy * ey + fz * ez,
                0,
                0,
                0,
                1,
            ]),
        );
    }

    static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1.0 / Math.tan(fov / 2);

        const nf = 1 / (near - far);

        return new Mat4(
            new Float32Array([
                f / aspect,
                0,
                0,
                0,
                0,
                f,
                0,
                0,
                0,
                0,
                far * nf,
                far * near * nf,
                0,
                0,
                -1,
                0,
            ]),
        );
    }
}
