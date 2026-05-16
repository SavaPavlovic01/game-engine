import { Vec3 } from './vec';

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
        return new Mat4([1, 0, 0, trans.x(), 0, 1, 0, trans.y(), 0, 0, 1, trans.z(), 0, 0, 0, 1]);
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
                far / (near - far),
                (near * far) / (near - far),
                0,
                0,
                -1,
                0,
            ]),
        );
    }

    public invertTRS(): Mat4 {
        const m = this.values;

        const sx = Math.sqrt(m[0]! * m[0]! + m[1]! * m[1]! + m[2]! * m[2]!);
        const sy = Math.sqrt(m[4]! * m[4]! + m[5]! * m[5]! + m[6]! * m[6]!);
        const sz = Math.sqrt(m[8]! * m[8]! + m[9]! * m[9]! + m[10]! * m[10]!);

        const isx = 1 / sx,
            isy = 1 / sy,
            isz = 1 / sz;

        const r00 = m[0]! * isx,
            r01 = m[1]! * isx,
            r02 = m[2]! * isx;
        const r10 = m[4]! * isy,
            r11 = m[5]! * isy,
            r12 = m[6]! * isy;
        const r20 = m[8]! * isz,
            r21 = m[9]! * isz,
            r22 = m[10]! * isz;

        const tx = m[3]!,
            ty = m[7]!,
            tz = m[11]!;

        const ir00 = r00 * isx,
            ir01 = r10 * isx,
            ir02 = r20 * isx;
        const ir10 = r01 * isy,
            ir11 = r11 * isy,
            ir12 = r21 * isy;
        const ir20 = r02 * isz,
            ir21 = r12 * isz,
            ir22 = r22 * isz;

        const itx = -(ir00 * tx + ir01 * ty + ir02 * tz);
        const ity = -(ir10 * tx + ir11 * ty + ir12 * tz);
        const itz = -(ir20 * tx + ir21 * ty + ir22 * tz);

        return new Mat4([
            ir00,
            ir01,
            ir02,
            itx,
            ir10,
            ir11,
            ir12,
            ity,
            ir20,
            ir21,
            ir22,
            itz,
            0,
            0,
            0,
            1,
        ]);
    }

    public transformPoint(v: Vec3): Vec3 {
        const m = this.values;
        return new Vec3(
            m[0]! * v.x() + m[1]! * v.y() + m[2]! * v.z() + m[3]!,
            m[4]! * v.x() + m[5]! * v.y() + m[6]! * v.z() + m[7]!,
            m[8]! * v.x() + m[9]! * v.y() + m[10]! * v.z() + m[11]!,
        );
    }

    // direction ignores translation
    public transformDir(v: Vec3): Vec3 {
        const m = this.values;
        return new Vec3(
            m[0]! * v.x() + m[1]! * v.y() + m[2]! * v.z(),
            m[4]! * v.x() + m[5]! * v.y() + m[6]! * v.z(),
            m[8]! * v.x() + m[9]! * v.y() + m[10]! * v.z(),
        );
    }
}
