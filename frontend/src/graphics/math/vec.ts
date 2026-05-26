export class Vec3 {
    public values: Float32Array;

    constructor(x: number, y: number, z: number) {
        this.values = new Float32Array([x, y, z]);
    }

    public x() {
        return this.values[0]!;
    }

    public y() {
        return this.values[1]!;
    }

    public z() {
        return this.values[2]!;
    }

    get X() {
        return this.values[0]!;
    }

    get Y() {
        return this.values[1]!;
    }

    get Z() {
        return this.values[2]!;
    }

    public add(other: Vec3): Vec3 {
        return new Vec3(
            this.index(0) + other.index(0),
            this.index(1) + other.index(1),
            this.index(2) + other.index(2),
        );
    }

    public static ones() {
        return new Vec3(1, 1, 1);
    }

    public static zeros() {
        return new Vec3(0, 0, 0);
    }

    public zeroIndex(index: number): Vec3 {
        if (index < 0 || index >= 3) throw new Error('out of bounds when you tried to zero vector');
        const v = new Vec3(this.X, this.Y, this.Z);
        v.values[index] = 0;
        return v;
    }

    public sub(other: Vec3): Vec3 {
        return new Vec3(
            this.index(0) - other.index(0),
            this.index(1) - other.index(1),
            this.index(2) - other.index(2),
        );
    }

    public index(i: number) {
        if (i > 2) throw new Error(`trying to index vec3 with index= ${i}`);
        return this.values[i]!;
    }

    public magnitude(): number {
        return Math.sqrt(
            this.values[0]! * this.values[0]! +
                this.values[1]! * this.values[1]! +
                this.values[2]! * this.values[2]!,
        );
    }

    public normalize(): Vec3 {
        const magnitude = this.magnitude();
        return new Vec3(
            this.values[0]! / magnitude,
            this.values[1]! / magnitude,
            this.values[2]! / magnitude,
        );
    }

    public cross(other: Vec3): Vec3 {
        const x = this.index(1) * other.index(2) - this.index(2) * other.index(1);
        const y = this.index(2) * other.index(0) - this.index(0) * other.index(2);
        const z = this.index(0) * other.index(1) - this.index(1) * other.index(0);
        return new Vec3(x, y, z);
    }

    public negate(): Vec3 {
        return new Vec3(-this.X, -this.Y, -this.Z);
    }

    public scale(n: number): Vec3 {
        return new Vec3(this.X * n, this.Y * n, this.Z * n);
    }

    public dot(other: Vec3): number {
        return this.X * other.X + this.Y * other.Y + this.Z * other.Z;
    }

    public distanceTo(other: Vec3): number {
        return this.sub(other).magnitude();
    }

    public lengthSquared(): number {
        return this.X * this.X + this.Y * this.Y + this.Z * this.Z;
    }

    toString() {
        return `${this.X}, ${this.Y}, ${this.Z}`;
    }
}
