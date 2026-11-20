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
  const known = v > 0.5 && fix.heading != null && fix.heading >= 0;
  if (known) {
    const h = rad(fix.heading!);
    lat += (v * dt * Math.cos(h)) / 110540;
    lon += (v * dt * Math.sin(h)) / (111320 * Math.cos(rad(lat)));
  }
  // Process noise: how far reality may have drifted from the prediction. With a known velocity
  // that's a small random walk; without one you may have travelled anywhere since the last fix,
  // so uncertainty grows with distance you could have covered (~3 m/s), not just with time.
  const q = Math.max(1.5, v * 0.6);
  const variance = prev.variance + (known ? dt * q * q : Math.max(dt * q * q, (3 * dt) ** 2));
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

/**
 * Android reports speed 0 (and heading 0) when it simply doesn't know — typically for Wi-Fi or
 * cell-tower fixes while the GPS chip is throttled. Only a positive speed is a real measurement.
 */
export function measuredSpeed(speed: number | null | undefined): number | null {
  return speed != null && speed > 0.3 ? speed : null;
}

export type OdoConfig = { movingSpeed: number; maxSpeed: number };

export type OdoState = {
  /** Smoothed position after the last accepted fix. */
  filt: Smoothed | null;
  /** Last position distance was counted up to. */
  anchor: Smoothed | null;
  moving: boolean;
  speed: number;
  /** Total time with no accepted fix for more than 10 s (the phone throttling GPS). */
  gapMs: number;
};

export type OdoStep = {
  state: OdoState;
  /** True if the fix was a glitch and was ignored. */
  rejected: boolean;
  addDistance: number;
  addMovingMs: number;
  /** A speed worth considering for max speed, if any. */
  speedSample: number | null;
};

export const newOdometer = (): OdoState => ({ filt: null, anchor: null, moving: false, speed: 0, gapMs: 0 });

/**
 * Turns fixes into distance and moving time.
 *
 * With frequent fixes that carry a real GPS speed, distance comes from that speed (steady and
 * precise). Otherwise — sparse or speedless fixes — distance is counted from the last anchor
 * point once you've clearly moved further than the GPS error, so jitter while standing still adds
 * nothing but real travel between sparse fixes is never thrown away.
 */
export function odometer(state: OdoState, fix: Fix, cfg: OdoConfig): OdoStep {
  const speed = measuredSpeed(fix.speed);
  const heading = speed != null ? fix.heading : null;
  const prev = state.filt;
  const none = { addDistance: 0, addMovingMs: 0, speedSample: null };

  if (prev && fix.ts > prev.ts) {
    // A jump faster than anything this activity can do is a bad fix: ignore it entirely.
    const dt = (fix.ts - prev.ts) / 1000;
    const jump = distanceM(prev.lat, prev.lon, fix.lat, fix.lon);
    if (jump > fix.acc && jump / dt > cfg.maxSpeed * 1.5) return { state, rejected: true, ...none };
  }

  const filt = kalman(prev, { ...fix, speed, heading });
  if (!prev || fix.ts <= prev.ts) {
    return { state: { ...state, filt, anchor: filt }, rejected: false, ...none };
  }

  const dt = (filt.ts - prev.ts) / 1000;
  const gapMs = state.gapMs + (dt > 10 ? (dt - 1) * 1000 : 0);

  // Frequent fixes with a real GPS speed: integrate that speed.
  if (speed != null && dt <= 5) {
    const moving = speed >= cfg.movingSpeed;
    const step = stepDistance(prev, filt, speed);
    return {
      state: { filt, anchor: filt, moving, speed: moving ? speed : 0, gapMs },
      rejected: false,
      addDistance: moving ? step : 0,
      addMovingMs: moving ? dt * 1000 : 0,
      speedSample: moving ? speed : null,
    };
  }

  // Sparse or speedless fixes: count from the anchor once the move clearly beats the GPS error.
  const anchor = state.anchor ?? prev;
  const d = distanceM(anchor.lat, anchor.lon, filt.lat, filt.lon);
  const span = (filt.ts - anchor.ts) / 1000;
  // Must beat the GPS error with margin, and hold for 5 s, so a lone jittery fix isn't travel.
  // The anchor's own uncertainty counts too: a poor first fix mustn't make good ones look like travel.
  const gate = Math.max(12, 1.5 * fix.acc, 1.5 * Math.sqrt(anchor.variance));
  if (d >= gate && span >= 5) {
    const v = d / span;
    if (v >= cfg.movingSpeed * 0.6 && v <= cfg.maxSpeed) {
      return {
        state: { filt, anchor: filt, moving: true, speed: v, gapMs },
        rejected: false,
        addDistance: d,
        addMovingMs: Math.min(span, 120) * 1000,
        speedSample: v,
      };
    }
    // Too slow to be travel (drift over a long stop) or implausibly fast: move on without counting.
    return { state: { filt, anchor: filt, moving: false, speed: 0, gapMs }, rejected: false, ...none };
  }
  // Not clearly moved yet. Keep the anchor; after a minute without progress you've stopped.
  const stopped = span > 60;
  return {
    state: {
      filt,
      anchor: stopped ? filt : anchor,
      moving: stopped ? false : state.moving,
      speed: stopped ? 0 : state.speed,
      gapMs,
    },
    rejected: false,
    ...none,
  };
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
