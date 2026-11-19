// CyDrip mark: six rounded equilateral triangles forming an X, measured from the supplied artwork.
// Plain data so both the app (react-native-svg) and scripts/build-icons.mjs can use it.

type Pt = [number, number];

/**
 * Equilateral-triangle polygon with circular-arc corners: `cut` is how far along each edge the arc
 * starts (cut = radius × √3 for 60° corners). Arcs are drawn as cubics; 0.443 is the control-point
 * ratio for a 120° turn.
 */
function rounded(pts: Pt[], cut: number): string {
  const K = 0.443;
  const n = pts.length;
  const along = (a: Pt, b: Pt, d: number): Pt => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len];
  };
  const f = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  let d = '';
  for (let i = 0; i < n; i++) {
    const v = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const a = along(v, prev, cut);
    const b = along(v, next, cut);
    const c1: Pt = [a[0] + (v[0] - a[0]) * K, a[1] + (v[1] - a[1]) * K];
    const c2: Pt = [b[0] + (v[0] - b[0]) * K, b[1] + (v[1] - b[1]) * K];
    d += `${i === 0 ? 'M' : 'L'}${f(a)} C${f(c1)} ${f(c2)} ${f(b)} `;
  }
  return d + 'Z';
}

// Geometry in a box centred on 0,0. Flat sides at x = ±88.5 (outer) and ±6.5 (inner).
const OUT = 88.5;
const IN = 6.5;
const TIP_OUT = 12.8; // tip x of the outer triangles
const TIP_IN = 82.2; // tip x of the middle triangles
const CUT = 20.3; // ≈ 11.7 radius

const tri = (flatX: number, top: number, bottom: number, tipX: number): Pt[] => [
  [flatX, top],
  [tipX, (top + bottom) / 2],
  [flatX, bottom],
];

const SHAPES: Pt[][] = [
  tri(-OUT, -99, -11, -TIP_OUT), // top-left ▶
  tri(-IN, -44, 44, -TIP_IN), // middle-left ◀
  tri(-OUT, 11, 99, -TIP_OUT), // bottom-left ▶
  tri(OUT, -99, -11, TIP_OUT), // top-right ◀
  tri(IN, -44, 44, TIP_IN), // middle-right ▶
  tri(OUT, 11, 99, TIP_OUT), // bottom-right ◀
];

export const MARK_VIEWBOX = '-100 -100 200 200';
export const MARK_PATHS: string[] = SHAPES.map((s) => rounded(s, CUT));

/** A single forward-pointing triangle from the mark, used as "you" in the road view. */
export const ARROW_PATH = rounded(
  [
    [-44, 38],
    [0, -38],
    [44, 38],
  ],
  CUT,
);
