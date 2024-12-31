// Vector2.js HelperLib by serendipitous19
// v1.0.0

const PI = Math.PI;
const TAU = Math.TAU;

function deg2Rad(theta) {
    return PI * theta / 180;
}
function rad2Deg(theta) {
    return 180 * theta / PI;
}

class Vector2 {
    constructor(x, y) {

        if (typeof x == "number" && typeof y == "number") {
            this.x = x;
            this.y = y;
        } else if (typeof x == "object" && typeof x.x == "number" && typeof x.y == "number") {
            this.x = x.x;
            this.y = x.y;
        } else {
            console.warn("Vector2: Invalid input(s) to Vector2 constructor")
        }

    }
    get angle() {
        // Angle (angle from x-axis/phi-coordinate in polar coordinate system)
        return Math.atan2(this.y, this.x);
    }
    get mag() {
        // Magnitude (length of vector/r-coordinate in polar coordinate system)
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    get() {
        return new Vector2(this.x, this.y);
    }
    set(x, y) {
        if (typeof x == "number" && typeof y == "number") {
            this.x = x;
            this.y = y;
        } else if (typeof x == "object" && typeof x.x == "number" && typeof x.y == "number") {
            this.x = x.x;
            this.y = x.y;
        } else {
            console.warn("Vector2: Invalid input(s) to Vector2.set()")
        }
        return this;
    }

    add(b) {
        this.x += b.x;
        this.y += b.y;
        return this;
    }
    static Add(a, b) {
        return new Vector2(a.x + b.x, a.y + b.y);
    }
    sub(b) {
        this.x -= b.x;
        this.y -= b.y;
        return this;
    }
    static Sub(a, b) {
        return new Vector2(a.x - b.x, a.y - b.y);
    }

    mult(coeff) {
        this.x *= coeff;
        this.y *= coeff;
        return this;
    }
    static Mult(a, coeff) {
        return new Vector2(coeff * a.x, coeff * a.y);
    }

    static Dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    normalize() {
        const scaleFac = 1 / this.mag;
        this.mult(scaleFac);
        return this;
    }
    static Normalize(a) {
        const scaleFac = 1 / Math.sqrt(a.x * a.x + a.y * a.y);
        return Vector2.Mult(a, scaleFac);
    }

    rotate(theta) {
        const x = this.x;
        const y = this.y;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        this.x = x * cos - y * sin;
        this.y = x * sin + y * cos;
        return this;
    }
    setRotation(theta) {
        const mag = this.mag;
        this.set(Math.cos(theta), Math.sin(theta));
        this.mult(mag);
        return this;
    }

    static Rotate(v, theta){
        const x = v.x;
        const y = v.y;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        return new Vector2(x * cos - y * sin, x * sin + y * cos);
    }
    static SetRotation(v, theta){
        const mag = v.mag;
        return new Vector2(mag * Math.cos(theta), mag * Math.sin(theta));
    }
}

class PolarVector2 extends Vector2 {
    constructor(r, theta) {
        super(r * Math.cos(theta), r * Math.sin(theta));
    }
}