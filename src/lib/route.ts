// Route geometry and progress along it. Self-contained (no app imports) so it can be tested in Node.

export type LatLon = [number, number]; // [lat, lon]

/** One instruction on a route ("Turn left onto MG Road"). */
export type Turn = {
  /** Valhalla maneuver type: start, left, right, roundabout… (see turnAngle). */
  type: number;
  instruction: string;
  /** Index into the route shape where this turn happens. */
  at: number;
  street: string | null;
};

export type Route = {
  shape: LatLon[];
  /** Distance from the start to each shape point, metres. */
  cum: number[];
  lengthM: number;
  timeS: number;
  turns: Turn[];
};

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(a: LatLon, b: LatLon): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Decodes a Google-style encoded polyline (Valhalla uses 6 decimal places). */
export function decodePolyline(str: string, precision = 6): LatLon[] {
  const factor = 10 ** precision;
  const out: LatLon[] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta;
      else lon += delta;
    }
    out.push([lat / factor, lon / factor]);
  }
  return out;
}

export function makeRoute(shape: LatLon[], timeS: number, turns: Turn[]): Route {
  const cum = [0];
  for (let k = 1; k < shape.length; k++) cum.push(cum[k - 1] + distanceM(shape[k - 1], shape[k]));
  return { shape, cum, lengthM: cum[cum.length - 1] ?? 0, timeS, turns };
}

export type Progress = {
  /** Segment you're on (shape index of its start); feed back in as `hint` next time. */
  index: number;
  /** Metres covered along the route. */
  along: number;
  /** Metres left to the destination. */
  remaining: number;
  /** How far you are from the route line, metres. */
  off: number;
  /** The next instruction ahead, and how far away it is. */
  next: Turn | null;
  toNext: number;
  arrived: boolean;
};

/**
 * Where you are along the route. Searches near the last known segment (`hint`) first, so a route
 * that passes the same spot twice doesn't make you jump ahead.
 */
export function progress(route: Route, pos: LatLon, hint: number | null): Progress {
  const { shape, cum } = route;
  // Local flat projection around you: accurate to centimetres over a few km.
  const kx = 111320 * Math.cos(rad(pos[0]));
  const ky = 110540;
  const xy = (p: LatLon) => [(p[1] - pos[1]) * kx, (p[0] - pos[0]) * ky];

  const search = (from: number, to: number) => {
    let best = { index: 0, t: 0, d: Infinity };
    for (let k = Math.max(0, from); k < Math.min(shape.length - 1, to); k++) {
      const [ax, ay] = xy(shape[k]);
      const [bx, by] = xy(shape[k + 1]);
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < best.d) best = { index: k, t, d };
    }
    return best;
  };

  let best = hint != null ? search(hint - 3, hint + 150) : null;
  if (!best || best.d > 40) {
    const all = search(0, shape.length);
    if (!best || all.d < best.d) best = all;
  }
  if (shape.length < 2) best = { index: 0, t: 0, d: shape.length ? distanceM(shape[0], pos) : Infinity };

  const k = best.index;
  const segLen = (cum[k + 1] ?? cum[k]) - cum[k];
  const along = cum[k] + best.t * segLen;
  const remaining = Math.max(0, route.lengthM - along);
  const next = route.turns.find((t) => cum[t.at] > along + 3) ?? null;
  return {
    index: k,
    along,
    remaining,
    off: best.d,
    next,
    toNext: next ? cum[next.at] - along : remaining,
    arrived: remaining < 25 && best.d < 40,
  };
}

/**
 * The arrow for a turn, in degrees: 0 straight on, negative left, positive right, 180 U-turn.
 * Null for start, arrival and roundabouts (drawn differently).
 */
export function turnAngle(type: number): number | null {
  switch (type) {
    case 9: case 18: case 20: case 23: case 37: return 45; // slight / ramp / exit / keep / merge right
    case 10: return 90;
    case 11: return 135;
    case 12: case 13: return 180;
    case 14: return -135;
    case 15: return -90;
    case 16: case 19: case 21: case 24: case 38: return -45;
    case 7: case 8: case 17: case 22: case 25: return 0;
    default: return null;
  }
}

/** Kinds of turn that aren't a direction arrow. */
export const isArrival = (type: number) => type >= 4 && type <= 6;
export const isRoundabout = (type: number) => type === 26 || type === 27;
