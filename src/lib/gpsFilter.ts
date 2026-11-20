// GPS clean-up for the tracker. Self-contained (no app imports) so it can be tested in plain Node.
//
// Raw phone GPS wobbles by several metres from fix to fix. Summing straight lines between raw fixes
// draws a zig-zag route off the street and adds distance that was never travelled. This module:
//  1. smooths positions with a Kalman filter that trusts each fix in proportion to its reported
//     accuracy, and predicts ahead using the GPS chip's own speed and heading;
//  2. measures distance from the GPS speed (Doppler-based, far steadier than positions) blended with
//     the smoothed track;
//  3. keeps single bad readings out of "max speed" and altitude noise out of "climb".

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Fix = {
  lat: number;
  lon: number;
  /** Reported horizontal accuracy in metres (68% radius). */
  acc: number;
  ts: number;
  /** GPS speed in m/s, when the chip reports one. */
  speed: number | null;
  /** Direction of travel in degrees from north, when reported. */
  heading: number | null;
};

export type Smoothed = { lat: number; lon: number; variance: number; ts: number };

/**
 * One Kalman step. Between fixes the position is predicted along the GPS velocity, and its
 * uncertainty grows with time and speed; each new fix then pulls it in by how much we trust it.
 */
export function kalman(prev: Smoothed | null, fix: Fix): Smoothed {
  const acc = Math.max(fix.acc, 3);
  if (!prev || fix.ts <= prev.ts) return { lat: fix.lat, lon: fix.lon, variance: acc * acc, ts: fix.ts };

  const dt = (fix.ts - prev.ts) / 1000;
  let lat = prev.lat;
  let lon = prev.lon;
  const v = fix.speed ?? 0;
  if (v > 0.5 && fix.heading != null && fix.heading >= 0) {
    const h = rad(fix.heading);
    lat += (v * dt * Math.cos(h)) / 110540;
    lon += (v * dt * Math.sin(h)) / (111320 * Math.cos(rad(lat)));
  }
  // Process noise: how far reality may drift from the prediction (more when moving fast or turning).
  const q = Math.max(1.5, v * 0.6);
  const variance = prev.variance + dt * q * q;
  const k = variance / (variance + acc * acc);
  return {
    lat: lat + k * (fix.lat - lat),
    lon: lon + k * (fix.lon - lon),
    variance: (1 - k) * variance,
    ts: fix.ts,
  };
}

/**
 * Distance covered between two smoothed positions. The GPS speed × time is the steadier measure
 * while moving; the smoothed track catches what speed alone misses. Blended, then capped so one
 * can't run away from the other.
 */
export function stepDistance(a: Smoothed, b: Smoothed, speed: number | null): number {
  const dt = (b.ts - a.ts) / 1000;
  const track = distanceM(a.lat, a.lon, b.lat, b.lon);
  if (speed == null || speed < 0 || dt <= 0) return track;
  const doppler = speed * Math.min(dt, 30);
  const blended = 0.65 * doppler + 0.35 * track;
  return Math.min(blended, Math.max(doppler, track) * 1.05);
}

/** Max speed only counts if it held for a few fixes in a row — one glitchy reading can't set it. */
export function sustainedSpeed(recent: number[]): number {
  return recent.length >= 3 ? Math.min(...recent.slice(-3)) : 0;
}

export type Altitude = { smooth: number | null; ref: number | null; gain: number };

/** Climb from smoothed altitude with a 5 m dead band, skipping fixes with poor vertical accuracy. */
export function climb(state: Altitude, altitude: number | null, altAcc: number | null): Altitude {
  if (altitude == null || (altAcc != null && altAcc > 15)) return state;
  const smooth = state.smooth == null ? altitude : state.smooth + (altitude - state.smooth) * 0.2;
  if (state.ref == null) return { smooth, ref: smooth, gain: state.gain };
  if (smooth - state.ref > 5) return { smooth, ref: smooth, gain: state.gain + (smooth - state.ref) };
  if (smooth < state.ref - 5) return { smooth, ref: smooth, gain: state.gain };
  return { ...state, smooth };
}
