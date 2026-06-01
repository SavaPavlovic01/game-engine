import { Vec3 } from '../math/vec';

export class Mat3 {
    public values: Float32Array;

    constructor(values: ArrayLike<number>) {
        if (values.length !== 9) throw new Error(`Mat3 expects 9 elements, got ${values.length}`);
        this.values = new Float32Array(values);
    }

    public static zero(): Mat3 {
        return new Mat3(new Float32Array(9));
    }

    public static identity(): Mat3 {
        return new Mat3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }

    public static diagonal(x: number, y: number, z: number): Mat3 {
        return new Mat3([x, 0, 0, 0, y, 0, 0, 0, z]);
    }

    public index(row: number, col: number): number {
        return this.values[row * 3 + col]!;
    }

    public mulVec(v: Vec3): Vec3 {
        const m = this.values;
        return new Vec3(
            m[0]! * v.X + m[1]! * v.Y + m[2]! * v.Z,
            m[3]! * v.X + m[4]! * v.Y + m[5]! * v.Z,
            m[6]! * v.X + m[7]! * v.Y + m[8]! * v.Z,
        );
    }

    public mul(other: Mat3): Mat3 {
        const res = Mat3.zero();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < 3; k++) {
                    sum += this.index(i, k) * other.index(k, j);
                }
                res.values[i * 3 + j] = sum;
            }
        }
        return res;
    }

    public transpose(): Mat3 {
        const m = this.values;
        return new Mat3([m[0]!, m[3]!, m[6]!, m[1]!, m[4]!, m[7]!, m[2]!, m[5]!, m[8]!]);
    }

    public invert(): Mat3 {
        const m = this.values;
        const a = m[0]!,
            b = m[1]!,
            c = m[2]!;
        const d = m[3]!,
            e = m[4]!,
            f = m[5]!;
        const g = m[6]!,
            h = m[7]!,
            k = m[8]!;

        const A = e * k - f * h;
        const B = -(d * k - f * g);
        const C = d * h - e * g;
        const D = -(b * k - c * h);
        const E = a * k - c * g;
        const F = -(a * h - b * g);
        const G = b * f - c * e;
        const H = -(a * f - c * d);
        const K = a * e - b * d;

        const det = a * A + b * B + c * C;
        if (Math.abs(det) < 1e-10) return Mat3.identity();

        const inv = 1 / det;
        return new Mat3([
            A * inv,
            D * inv,
            G * inv,
            B * inv,
            E * inv,
            H * inv,
            C * inv,
            F * inv,
            K * inv,
        ]);
    }

    public rotateByQuat(q: { X: number; Y: number; Z: number; W: number }): Mat3 {
        const x = q.X,
            y = q.Y,
            z = q.Z,
            w = q.W;
        const x2 = x + x,
            y2 = y + y,
            z2 = z + z;
        const xx = x * x2,
            xy = x * y2,
            xz = x * z2;
        const yy = y * y2,
            yz = y * z2,
            zz = z * z2;
        const wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        const R = new Mat3([
            1 - (yy + zz),
            xy - wz,
            xz + wy,
            xy + wz,
            1 - (xx + zz),
            yz - wx,
            xz - wy,
            yz + wx,
            1 - (xx + yy),
        ]);

        return R.mul(this).mul(R.transpose());
    }
}
