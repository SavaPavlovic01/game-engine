// math/quat.ts

import { Vec3 } from './vec';
import { Mat4 } from './mat';

export class Quat {
    public readonly X: number;
    public readonly Y: number;
    public readonly Z: number;
    public readonly W: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.X = x;
        this.Y = y;
        this.Z = z;
        this.W = w;
    }

    public static identity(): Quat {
        return new Quat(0, 0, 0, 1);
    }

    public static fromAxisAngle(axis: Vec3, angle: number): Quat {
        const half = angle * 0.5;
        const s = Math.sin(half);
        return new Quat(axis.X * s, axis.Y * s, axis.Z * s, Math.cos(half));
    }

    public static fromEuler(euler: Vec3): Quat {
        const cx = Math.cos(euler.X * 0.5);
        const sx = Math.sin(euler.X * 0.5);
        const cy = Math.cos(euler.Y * 0.5);
        const sy = Math.sin(euler.Y * 0.5);
        const cz = Math.cos(euler.Z * 0.5);
        const sz = Math.sin(euler.Z * 0.5);

        return new Quat(
            sx * cy * cz + cx * sy * sz,
            cx * sy * cz - sx * cy * sz,
            cx * cy * sz + sx * sy * cz,
            cx * cy * cz - sx * sy * sz,
        ).normalize();
    }

    public static fromMat4(m: Mat4): Quat {
        const v = m.values;
        const m00 = v[0]!,
            m01 = v[1]!,
            m02 = v[2]!;
        const m10 = v[4]!,
            m11 = v[5]!,
            m12 = v[6]!;
        const m20 = v[8]!,
            m21 = v[9]!,
            m22 = v[10]!;

        const trace = m00 + m11 + m22;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            return new Quat(
                (m21 - m12) * s,
                (m02 - m20) * s,
                (m10 - m01) * s,
                0.25 / s,
            ).normalize();
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            return new Quat(
                0.25 * s,
                (m01 + m10) / s,
                (m02 + m20) / s,
                (m21 - m12) / s,
            ).normalize();
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            return new Quat(
                (m01 + m10) / s,
                0.25 * s,
                (m12 + m21) / s,
                (m02 - m20) / s,
            ).normalize();
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            return new Quat(
                (m02 + m20) / s,
                (m12 + m21) / s,
                0.25 * s,
                (m10 - m01) / s,
            ).normalize();
        }
    }

    public static fromTo(from: Vec3, to: Vec3): Quat {
        const d = from.dot(to);

        if (d >= 1 - 1e-6) return Quat.identity();

        if (d <= -1 + 1e-6) {
            let perp = new Vec3(1, 0, 0);
            if (Math.abs(from.X) > 0.9) perp = new Vec3(0, 1, 0);
            return Quat.fromAxisAngle(from.cross(perp).normalize(), Math.PI);
        }

        const axis = from.cross(to);
        return new Quat(axis.X, axis.Y, axis.Z, 1 + d).normalize();
    }

    public normalize(): Quat {
        const len = Math.sqrt(
            this.X * this.X + this.Y * this.Y + this.Z * this.Z + this.W * this.W,
        );
        if (len < 1e-10) return Quat.identity();
        const inv = 1 / len;
        return new Quat(this.X * inv, this.Y * inv, this.Z * inv, this.W * inv);
    }

    public conjugate(): Quat {
        return new Quat(-this.X, -this.Y, -this.Z, this.W);
    }

    public inverse(): Quat {
        return this.conjugate();
    }

    public mul(other: Quat): Quat {
        const ax = this.X,
            ay = this.Y,
            az = this.Z,
            aw = this.W;
        const bx = other.X,
            by = other.Y,
            bz = other.Z,
            bw = other.W;
        return new Quat(
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz,
        ).normalize();
    }

    public rotateVec(v: Vec3): Vec3 {
        const qx = this.X,
            qy = this.Y,
            qz = this.Z,
            qw = this.W;
        const vx = v.X,
            vy = v.Y,
            vz = v.Z;

        const tx = 2 * (qy * vz - qz * vy);
        const ty = 2 * (qz * vx - qx * vz);
        const tz = 2 * (qx * vy - qy * vx);

        return new Vec3(
            vx + qw * tx + qy * tz - qz * ty,
            vy + qw * ty + qz * tx - qx * tz,
            vz + qw * tz + qx * ty - qy * tx,
        );
    }

    public slerp(other: Quat, t: number): Quat {
        let dot = this.X * other.X + this.Y * other.Y + this.Z * other.Z + this.W * other.W;

        let ox = other.X,
            oy = other.Y,
            oz = other.Z,
            ow = other.W;
        if (dot < 0) {
            dot = -dot;
            ox = -ox;
            oy = -oy;
            oz = -oz;
            ow = -ow;
        }

        if (dot > 0.9995) {
            return new Quat(
                this.X + t * (ox - this.X),
                this.Y + t * (oy - this.Y),
                this.Z + t * (oz - this.Z),
                this.W + t * (ow - this.W),
            ).normalize();
        }

        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinT0 = Math.sin(theta0);
        const sinT = Math.sin(theta);

        const s0 = Math.cos(theta) - (dot * sinT) / sinT0;
        const s1 = sinT / sinT0;

        return new Quat(
            s0 * this.X + s1 * ox,
            s0 * this.Y + s1 * oy,
            s0 * this.Z + s1 * oz,
            s0 * this.W + s1 * ow,
        ).normalize();
    }

    public toMat4(): Mat4 {
        const x = this.X,
            y = this.Y,
            z = this.Z,
            w = this.W;

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

        return new Mat4([
            1 - (yy + zz),
            xy - wz,
            xz + wy,
            0,
            xy + wz,
            1 - (xx + zz),
            yz - wx,
            0,
            xz - wy,
            yz + wx,
            1 - (xx + yy),
            0,
            0,
            0,
            0,
            1,
        ]);
    }

    public toEuler(): Vec3 {
        const x = this.X,
            y = this.Y,
            z = this.Z,
            w = this.W;

        const sinX = 2 * (w * x + y * z);
        const cosX = 1 - 2 * (x * x + y * y);
        const ex = Math.atan2(sinX, cosX);

        const sinY = 2 * (w * y - z * x);
        const ey = Math.abs(sinY) >= 1 ? Math.sign(sinY) * (Math.PI / 2) : Math.asin(sinY);

        const sinZ = 2 * (w * z + x * y);
        const cosZ = 1 - 2 * (y * y + z * z);
        const ez = Math.atan2(sinZ, cosZ);

        return new Vec3(ex, ey, ez);
    }

    public integrateAngularVelocity(angularVel: Vec3, dt: number): Quat {
        const wx = angularVel.X,
            wy = angularVel.Y,
            wz = angularVel.Z;
        const qx = this.X,
            qy = this.Y,
            qz = this.Z,
            qw = this.W;

        const half = 0.5 * dt;

        return new Quat(
            qx + half * (wx * qw + wy * qz - wz * qy),
            qy + half * (wy * qw + wz * qx - wx * qz),
            qz + half * (wz * qw + wx * qy - wy * qx),
            qw + half * (-wx * qx - wy * qy - wz * qz),
        ).normalize();
    }

    public toString(): string {
        return `Quat(${this.X.toFixed(4)}, ${this.Y.toFixed(4)}, ${this.Z.toFixed(4)}, ${this.W.toFixed(4)})`;
    }
}
