// Where each of the seven triangles sits at each scroll stage.
// 0 orbit around the aura · 1 the assembled mark · 2 on the road · 3 the mark again.
import { Euler, Shape, Vector2, Vector3 } from 'three';

export type Pose = { p: Vector3; r: Euler; s: number };

/** Centroids of the six triangles in the CyDrip mark (y up) and the way each one points. */
const MARK = [
  { x: -0.6327, y: 0.55, dir: 0 },
  { x: -0.3173, y: 0, dir: Math.PI },
  { x: -0.6327, y: -0.55, dir: 0 },
  { x: 0.6327, y: 0.55, dir: Math.PI },
  { x: 0.3173, y: 0, dir: 0 },
  { x: 0.6327, y: -0.55, dir: Math.PI },
];

/** Six for the mark and the seventh — you. Colours sweep from blues through violet and magenta to ember. */
export const COLORS = ['#2f6bff', '#3d8bff', '#46c8ff', '#8a5cff', '#ff4fc8', '#ff7a2a', '#3d8bff'];

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

function orbit(i: number, t: number, narrow: boolean): Pose {
  const a = (i / 7) * Math.PI * 2 + t * 0.22;
  const R = narrow ? 1.05 : 1.75;
  const cx = narrow ? 0 : 1.75;
  const cy = narrow ? 1.5 : 0.05;
  return {
    p: new Vector3(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.32, Math.sin(a) * R * 0.75),
    r: new Euler(Math.sin(t * 0.5 + i) * 0.25, Math.sin(t * 0.4 + i * 1.3) * 0.6, a + Math.PI / 2),
    s: (i === 6 ? 0.85 : 0.72) * (narrow ? 0.62 : 1),
  };
}

function mark(i: number, t: number, narrow: boolean, k = 1, dy = 0): Pose {
  const sc = (narrow ? 0.8 : 1.25) * k;
  const sway = Math.sin(t * 0.35) * 0.22;
  if (i === 6) return { p: new Vector3(0, dy, 0.55), r: new Euler(0, sway, Math.PI / 2), s: 0.52 * sc };
  const m = MARK[i];
  return { p: new Vector3(m.x * sc, m.y * sc + dy, 0), r: new Euler(0, sway, m.dir), s: sc };
}

function road(i: number, t: number): Pose {
  if (i === 6) {
    // You: flat on the road, pointing down the blue lane.
    return { p: new Vector3(0, -1.05, 1.2), r: new Euler(-Math.PI / 2, 0, Math.PI / 2), s: 0.55 };
  }
  // The other six: lane markers sliding past on both sides.
  const side = i < 3 ? -1 : 1;
  const z = (((i % 3) * 4 + t * 7) % 12) - 10;
  return { p: new Vector3(side * 1.9, -1.05, z), r: new Euler(-Math.PI / 2, 0, Math.PI / 2), s: 0.42 };
}

export const STAGES: ((i: number, t: number, narrow: boolean) => Pose)[] = [
  orbit,
  mark,
  (i, t) => road(i, t),
  // Lifted so the closing sections' text sits below it.
  (i, t, narrow) => mark(i, t, narrow, 0.9, narrow ? 0.9 : 0.75),
];

export const CAMERAS = [
  { p: new Vector3(0, 0, 7.4), look: new Vector3(0, 0, 0) },
  { p: new Vector3(0, 0, 6.6), look: new Vector3(0, 0, 0) },
  { p: new Vector3(0, 0.55, 5.6), look: new Vector3(0, -0.7, -4) },
  { p: new Vector3(0, 0, 6.8), look: new Vector3(0, 0, 0) },
];

export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
