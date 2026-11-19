// Where each of the seven chain links sits at each scroll stage.
// 0 a hanging chain · 1 the CyDrip mark · 2 on the road · 3 a closed spinning loop · 4 the mark again.
import { Euler, Matrix4, Quaternion, Shape, Vector2, Vector3 } from 'three';

export type Pose = { p: Vector3; q: Quaternion; s: number };

/** Centroids of the six triangles in the CyDrip mark (y up) and the way each points. */
const MARK = [
  { x: -0.6327, y: 0.55, dir: 0 },
  { x: -0.3173, y: 0, dir: Math.PI },
  { x: -0.6327, y: -0.55, dir: 0 },
  { x: 0.6327, y: 0.55, dir: Math.PI },
  { x: 0.3173, y: 0, dir: 0 },
  { x: 0.6327, y: -0.55, dir: Math.PI },
];

/** Six links make the mark; the seventh is you. Blues into violet, magenta and ember. */
export const COLORS = ['#2f6bff', '#3d8bff', '#46c8ff', '#8a5cff', '#ff4fc8', '#ff7a2a', '#9cc4ff'];

/** Rounded equilateral triangle pointing +x, centred on its centroid (logo units / 100). */
export function triangleShape(): Shape {
  const pts = [new Vector2(-0.2523, 0.44), new Vector2(0.5047, 0), new Vector2(-0.2523, -0.44)];
  const cut = 0.203; // corner radius × √3
  const K = 0.443; // cubic control ratio for a 120° turn
  const shape = new Shape();
  pts.forEach((v, i) => {
    const prev = pts[(i + 2) % 3];
    const next = pts[(i + 1) % 3];
    const a = v.clone().add(prev.clone().sub(v).normalize().multiplyScalar(cut));
    const b = v.clone().add(next.clone().sub(v).normalize().multiplyScalar(cut));
    const c1 = a.clone().add(v.clone().sub(a).multiplyScalar(K));
    const c2 = b.clone().add(v.clone().sub(b).multiplyScalar(K));
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
  });
  shape.closePath();
  return shape;
}

const m4 = new Matrix4();
/** Orientation whose local x runs along `x` and whose plane normal (local z) is `z`. */
function basis(x: Vector3, z: Vector3): Quaternion {
  const X = x.clone().normalize();
  const Z = z.clone().sub(X.clone().multiplyScalar(z.dot(X))).normalize();
  const Y = Z.clone().cross(X);
  return new Quaternion().setFromRotationMatrix(m4.makeBasis(X, Y, Z));
}

/**
 * Links threaded along a path: each one's plane turns 90° from the last, so every link passes
 * through its neighbours like a real chain. `twist` slowly rolls the whole chain.
 */
function chainPose(i: number, point: (u: number) => Vector3, u: number, twist: number, s: number): Pose {
  const p = point(u);
  const tangent = point(u + 0.002).sub(point(u - 0.002)).normalize();
  const up = Math.abs(tangent.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const n = up.sub(tangent.clone().multiplyScalar(up.dot(tangent))).normalize();
  const b = tangent.clone().cross(n);
  // ±45° to the viewer, so both orientations still read as triangles.
  const angle = twist + Math.PI / 4 + (i % 2) * (Math.PI / 2);
  const normal = n.multiplyScalar(Math.cos(angle)).add(b.multiplyScalar(Math.sin(angle)));
  return { p, q: basis(tangent, normal), s };
}

function hanging(i: number, t: number, narrow: boolean): Pose {
  // Links are ~0.76 long × scale; spacing below that makes each pass through the next.
  const span = narrow ? 2.5 : 3.0;
  const point = (u: number) =>
    new Vector3(
      (u - 0.5) * span,
      Math.sin(u * Math.PI * 1.2 + t * 0.5) * 0.32 - 0.1,
      Math.cos(u * Math.PI * 1.6 + t * 0.4) * 0.35,
    );
  return chainPose(i, point, i / 6, Math.sin(t * 0.4) * 0.5, narrow ? 0.78 : 0.92);
}

function loop(i: number, t: number): Pose {
  const R = 0.82;
  const tilt = new Euler(0.95, 0.25, 0);
  const point = (u: number) => {
    const a = u * Math.PI * 2 + t * 0.3;
    return new Vector3(Math.cos(a) * R, Math.sin(a) * R, 0).applyEuler(tilt);
  };
  return chainPose(i, point, i / 7, 0, 0.9);
}

function mark(i: number, t: number, narrow: boolean): Pose {
  const sc = narrow ? 0.85 : 1.0;
  const sway = new Quaternion().setFromEuler(new Euler(Math.sin(t * 0.3) * 0.12, Math.sin(t * 0.35) * 0.3, 0));
  if (i === 6) {
    const q = sway.clone().multiply(new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2)));
    return { p: new Vector3(0, 0, 0.35), q, s: 0.5 * sc };
  }
  const m = MARK[i];
  const q = sway.clone().multiply(new Quaternion().setFromEuler(new Euler(0, 0, m.dir)));
  return { p: new Vector3(m.x * sc, m.y * sc, 0).applyQuaternion(sway), q, s: sc };
}

function road(i: number, t: number): Pose {
  const flat = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, Math.PI / 2));
  if (i === 6) return { p: new Vector3(0, -1.05, 1.0), q: flat, s: 0.6 };
  const side = i < 3 ? -1 : 1;
  const z = (((i % 3) * 4 + t * 7) % 12) - 10;
  return { p: new Vector3(side * 1.7, -1.05, z), q: flat, s: 0.48 };
}

export const STAGES: ((i: number, t: number, narrow: boolean) => Pose)[] = [
  hanging,
  mark,
  (i, t) => road(i, t),
  (i, t) => loop(i, t),
  mark,
];

export const CAMERAS = [
  { p: new Vector3(0, 0.1, 6.0), look: new Vector3(0, 0, 0) },
  { p: new Vector3(0, 0, 5.0), look: new Vector3(0, 0, 0) },
  { p: new Vector3(0, 0.55, 5.0), look: new Vector3(0, -0.7, -4) },
  { p: new Vector3(0, 0.3, 5.4), look: new Vector3(0, 0, 0) },
  { p: new Vector3(0, 0, 5.0), look: new Vector3(0, 0, 0) },
];

export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
