export class Vec3 {
    private values: Float32Array;

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

    public add(other: Vec3): Vec3 {
        return new Vec3(
            this.index(0) + other.index(0),
            this.index(1) + other.index(1),
            this.index(2) + other.index(2),
        );
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
}
