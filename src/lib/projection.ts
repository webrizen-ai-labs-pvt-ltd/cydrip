/** Turning a GPS track ([lat, lon][]) into screen points for drawings. */

type XY = [number, number];

/** Track → metres on a flat plane (x east, y north), fine at city scale. */
function toMetres(track: [number, number][]): XY[] {
  if (!track.length) return [];
  const lat0 = track.reduce((a, p) => a + p[0], 0) / track.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return track.map(([lat, lon]) => [lon * kx, lat * 110540]);
}

/** Top-down: fit the track inside a w×h box (keeping its shape), north up. */
export function projectFlat(track: [number, number][], w: number, h: number, pad = 0): XY[] {
  const m = toMetres(track);
  if (m.length < 2) return [];
  const xs = m.map((p) => p[0]);
  const ys = m.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  return m.map(([x, y]) => [offX + (x - minX) * scale, offY + (maxY - y) * scale]);
}

/**
 * The track laid on a floor that recedes to a horizon, like the app's road view. Returns a
 * projector for any floor coordinate (u across, -1…1; v away from you, 0 near … 1 far) and the
 * track already projected. North is "away".
 */
export function floorProjector(w: number, h: number, horizon: number) {
  const near = h * 0.96;
  const K = near - horizon; // y = horizon + K / z, z = 1 at the near edge
  const spread = w * 0.7;
  return (u: number, v: number): XY => {
    const z = 1 + v * 2.6;
    return [w / 2 + (u * spread) / z, horizon + K / z];
  };
}

export function projectFloor(track: [number, number][], w: number, h: number, horizon: number): XY[] {
  const m = toMetres(track);
  if (m.length < 2) return [];
  const xs = m.map((p) => p[0]);
  const ys = m.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const cx = (minX + maxX) / 2;
  const project = floorProjector(w, h, horizon);
  // Square normalisation keeps the route's real shape before tilting it.
  return m.map(([x, y]) => project(((x - cx) / span) * 1.8, 0.05 + ((y - minY) / span) * 0.9));
}

export const toPolyline = (pts: XY[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
