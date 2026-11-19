import type { Point } from './db';
import { haversine } from './format';

export type Split = {
  /** 1-based kilometre number. */
  km: number;
  /** Distance covered in this split, metres (1000 except possibly the last). */
  distM: number;
  /** Moving time spent on this split, ms. */
  ms: number;
};

/**
 * Per-kilometre splits from recorded points. Only moving stretches count (points saved with
 * speed 0 are stops), matching how the tracker measures distance and moving time.
 */
export function computeSplits(points: Point[]): Split[] {
  const splits: Split[] = [];
  let km = 1;
  let distM = 0;
  let ms = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!b.speed || b.speed <= 0) continue;
    let d = haversine(a.lat, a.lon, b.lat, b.lon);
    let t = Math.min(b.ts - a.ts, 30000);
    // A step can cross a kilometre boundary: split it proportionally.
    while (distM + d >= 1000) {
      const need = 1000 - distM;
      const share = d > 0 ? need / d : 0;
      splits.push({ km, distM: 1000, ms: ms + t * share });
      km += 1;
      distM = 0;
      ms = 0;
      d -= need;
      t -= t * share;
    }
    distM += d;
    ms += t;
  }
  if (distM >= 50) splits.push({ km, distM, ms });
  return splits;
}

/** Pace of a split in m/s (for fmtPace). */
export const splitSpeed = (s: Split) => (s.ms > 0 ? s.distM / (s.ms / 1000) : 0);
