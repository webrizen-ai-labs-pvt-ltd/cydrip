// Ride recording. The background task below receives GPS fixes from a foreground
// service (the "Recording ride" notification), so it keeps going with the screen
// off or while another app is open. State is persisted after every fix so a ride
// survives the app being restarted.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { colors } from '@/theme';
import { ACTIVITY, ActivityKind, isKind } from './activity';
import { createRide, deleteRide, finishRide, getPoints, insertPoint, setPreview } from './db';
import { activityTitle, bearing, estimateCalories, haversine, simplifyTrack } from './format';
import { getWeightKg } from './settings';

const RIDE_TASK = 'cydrip-ride-location';
const STATE_KEY = 'cydrip.activeRide';

const MAX_ACCURACY = 30; // m — ignore worse fixes
const ELEV_STEP = 4; // m of hysteresis before counting a climb

export type RideStatus = 'recording' | 'paused';

export type ActiveRide = {
  rideId: number;
  kind: ActivityKind;
  status: RideStatus;
  startedAt: number;
  /** Elapsed time banked from earlier recording segments (excludes manual pauses). */
  bankedMs: number;
  segmentStart: number;
  distanceM: number;
  movingMs: number;
  maxSpeed: number;
  elevGain: number;
  speed: number;
  /** Speed averaged over the last ~10 s — steadier, used for running pace. */
  smoothSpeed: number;
  moving: boolean;
  accuracy: number | null;
  /** Direction of travel in degrees from north, when known. */
  heading: number | null;
  lastFix: { lat: number; lon: number; ts: number } | null;
  elevRef: number | null;
  /** Recent fixes for the live road view (kept short). */
  trail: [number, number][];
  /** Simulated ride for trying the app without riding (dev builds only). */
  demo?: boolean;
};

// ---------- tiny store ----------
let state: ActiveRide | null = null;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

/** Restores an in-progress ride saved before the app was closed. Safe to call many times. */
function loadActiveRide(): Promise<void> {
  loading ??= (async () => {
    try {
      const raw = await Storage.getItem(STATE_KEY);
      if (raw && !state) {
        const r = JSON.parse(raw) as ActiveRide;
        state = { ...r, heading: r.heading ?? null, kind: isKind(r.kind) ? r.kind : 'ride', smoothSpeed: r.smoothSpeed ?? 0 };
        listeners.forEach((l) => l());
      }
    } catch (e) {
      console.warn('[cydrip] could not restore ride', e);
    }
  })();
  return loading;
}

// Writes are chained so they land in order even though each one is async.
let persisting = Promise.resolve();

function set(next: ActiveRide | null) {
  state = next;
  const raw = next ? JSON.stringify(next) : null;
  persisting = persisting
    .then(() => (raw ? Storage.setItem(STATE_KEY, raw) : Storage.removeItem(STATE_KEY)))
    .catch((e) => console.warn('[cydrip] could not save ride state', e));
  listeners.forEach((l) => l());
}

export function useActiveRide(): ActiveRide | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function elapsedMs(r: ActiveRide, now = Date.now()): number {
  return r.bankedMs + (r.status === 'recording' ? now - r.segmentStart : 0);
}

// ---------- GPS processing ----------
let queue = Promise.resolve();

function handleLocations(locations: Location.LocationObject[]) {
  queue = queue
    .then(async () => {
      await loadActiveRide(); // the task can wake before the app has restored its state
      for (const loc of locations) await processFix(loc);
    })
    .catch((e) => console.warn('[cydrip] fix processing failed', e));
}

async function processFix(loc: Location.LocationObject) {
  const r = state;
  if (!r || r.status !== 'recording') return;
  const { latitude: lat, longitude: lon, altitude, accuracy, speed: gpsSpeed, heading: gpsHeading } = loc.coords;
  const ts = loc.timestamp;
  if (accuracy != null && accuracy > MAX_ACCURACY) {
    set({ ...r, accuracy });
    return;
  }

  const next: ActiveRide = { ...r, accuracy };
  const cfg = ACTIVITY[r.kind];
  const last = r.lastFix;
  if (last && ts > last.ts) {
    const d = haversine(last.lat, last.lon, lat, lon);
    const dt = (ts - last.ts) / 1000;
    // A fix that implies teleporting is a glitch — drop it, whatever speed the GPS chip reports.
    if (d / dt > cfg.maxSpeed) return;
    let speed = gpsSpeed != null && gpsSpeed >= 0 ? gpsSpeed : d / dt;
    if (speed > cfg.maxSpeed) return;
    const moving = speed >= cfg.movingSpeed;
    if (moving) {
      next.distanceM += d;
      next.movingMs += Math.min(dt, 30) * 1000;
      next.maxSpeed = Math.max(next.maxSpeed, speed);
      if (gpsHeading != null && gpsHeading >= 0) next.heading = gpsHeading;
      else if (d > 2) next.heading = bearing(last.lat, last.lon, lat, lon);
    } else {
      speed = 0;
    }
    next.speed = speed;
    next.moving = moving;
    const k = Math.min(1, dt / 10);
    next.smoothSpeed = moving ? r.smoothSpeed + (speed - r.smoothSpeed) * k : 0;
  }

  if (altitude != null) {
    if (next.elevRef == null) next.elevRef = altitude;
    else if (altitude - next.elevRef > ELEV_STEP) {
      next.elevGain += altitude - next.elevRef;
      next.elevRef = altitude;
    } else if (altitude < next.elevRef - ELEV_STEP) next.elevRef = altitude;
  }

  next.lastFix = { lat, lon, ts };
  if (next.moving || r.trail.length === 0) {
    next.trail = [...r.trail, [lat, lon] as [number, number]].slice(-400);
  }
  set(next);
  await insertPoint(r.rideId, { ts, lat, lon, alt: altitude, speed: next.speed, acc: accuracy });
}

// Must be defined at module scope; imported from the root layout.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(RIDE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[cydrip] location task error', error.message);
    return;
  }
  if (data?.locations?.length) handleLocations(data.locations);
});

// ---------- demo ride (dev only) ----------
let demoTimer: ReturnType<typeof setInterval> | null = null;
let demoT = 0;
const DEMO_ORIGIN = { lat: 12.9716, lon: 77.5946 };
let demoPos = { ...DEMO_ORIGIN, heading: 20 };

function demoFix(ts: number): Location.LocationObject {
  demoT += 1;
  const run = state?.kind === 'run';
  const stopped = demoT % 150 > 135; // a red light every 2.5 minutes
  const speed = stopped
    ? 0
    : run
      ? 3.1 + 0.35 * Math.sin(demoT / 21) + 0.15 * Math.sin(demoT / 2.3)
      : 6.5 + 1.8 * Math.sin(demoT / 17) + 0.6 * Math.sin(demoT / 3.1);
  demoPos.heading = (demoPos.heading + 6 * Math.sin(demoT / 23) + (demoT % 60 === 0 ? 70 : 0) + 360) % 360;
  const rad = (demoPos.heading * Math.PI) / 180;
  demoPos.lat += (speed * Math.cos(rad)) / 110540;
  demoPos.lon += (speed * Math.sin(rad)) / (111320 * Math.cos((demoPos.lat * Math.PI) / 180));
  return {
    timestamp: ts,
    coords: {
      latitude: demoPos.lat,
      longitude: demoPos.lon,
      altitude: 900 + 12 * Math.sin(demoT / 40),
      accuracy: 4,
      altitudeAccuracy: 3,
      heading: speed > 0 ? demoPos.heading : null,
      speed,
    },
  };
}

function startDemoFeed() {
  stopDemoFeed();
  // Continue from where the ride is (e.g. after an app restart), not from the origin.
  const last = state?.lastFix;
  if (last) demoPos = { lat: last.lat, lon: last.lon, heading: state?.heading ?? demoPos.heading };
  demoTimer = setInterval(() => handleLocations([demoFix(Date.now())]), 1000);
}

function stopDemoFeed() {
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = null;
}

/** Starts a simulated ride or run with a few minutes already done, so every screen has data. */
export async function startDemoRide(kind: ActivityKind = 'ride'): Promise<void> {
  const now = Date.now();
  const history = kind === 'run' ? 420 : 240;
  const startedAt = now - history * 1000;
  demoT = 0;
  demoPos = { ...DEMO_ORIGIN, heading: 20 };
  const rideId = await createRide(activityTitle(startedAt, kind), startedAt, kind);
  set(newRide(rideId, startedAt, kind, true));
  handleLocations(Array.from({ length: history }, (_, i) => demoFix(startedAt + i * 1000)));
  await queue;
  startDemoFeed();
}

// ---------- controls ----------
function newRide(rideId: number, startedAt: number, kind: ActivityKind, demo = false): ActiveRide {
  return {
    rideId,
    kind,
    status: 'recording',
    startedAt,
    bankedMs: 0,
    segmentStart: startedAt,
    distanceM: 0,
    movingMs: 0,
    maxSpeed: 0,
    elevGain: 0,
    speed: 0,
    smoothSpeed: 0,
    moving: false,
    accuracy: null,
    heading: null,
    lastFix: null,
    elevRef: null,
    trail: [],
    demo,
  };
}

async function startUpdates() {
  if (state?.demo) return startDemoFeed();
  if (await Location.hasStartedLocationUpdatesAsync(RIDE_TASK)) return;
  await Location.startLocationUpdatesAsync(RIDE_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: ACTIVITY[state?.kind ?? 'ride'].notificationTitle,
      notificationBody: 'Tap to open CyDrip.',
      notificationColor: colors.lane,
      killServiceOnDestroy: false,
    },
  });
}

async function stopUpdates() {
  stopDemoFeed();
  try {
    if (await Location.hasStartedLocationUpdatesAsync(RIDE_TASK)) {
      await Location.stopLocationUpdatesAsync(RIDE_TASK);
    }
  } catch (e) {
    console.warn('[cydrip] could not stop location updates', e);
  }
}

export type PermissionResult = 'granted' | 'denied' | 'services-off';

export async function ensureLocationPermission(): Promise<PermissionResult> {
  if (!(await Location.hasServicesEnabledAsync())) return 'services-off';
  const fg = await Location.requestForegroundPermissionsAsync();
  return fg.granted ? 'granted' : 'denied';
}

export async function startRide(kind: ActivityKind): Promise<void> {
  const now = Date.now();
  const rideId = await createRide(activityTitle(now, kind), now, kind);
  set(newRide(rideId, now, kind));
  try {
    await startUpdates();
  } catch (e) {
    await deleteRide(rideId);
    set(null);
    throw e;
  }
}

export async function pauseRide(): Promise<void> {
  const r = state;
  if (!r || r.status !== 'recording') return;
  await stopUpdates();
  set({ ...r, status: 'paused', bankedMs: elapsedMs(r), speed: 0, smoothSpeed: 0, moving: false });
}

export async function resumeRide(): Promise<void> {
  const r = state;
  if (!r || r.status !== 'paused') return;
  // Drop the last fix so the gap while paused isn't counted as a straight-line ride.
  set({ ...r, status: 'recording', segmentStart: Date.now(), lastFix: null });
  await startUpdates();
}

/** After an app restart: make sure a "recording" ride really has GPS running. */
export async function reconcileRide(): Promise<void> {
  await loadActiveRide();
  const r = state;
  if (r?.status === 'recording') {
    try {
      await startUpdates();
    } catch {
      set({ ...r, status: 'paused', bankedMs: elapsedMs(r) });
    }
  }
}

export async function finishActiveRide(save: boolean): Promise<number | null> {
  const r = state;
  if (!r) return null;
  await stopUpdates();
  await queue;
  const final = state ?? r;
  set(null);
  if (!save) {
    await deleteRide(final.rideId);
    return null;
  }
  const weight = getWeightKg();
  await finishRide(final.rideId, {
    ended_at: Date.now(),
    distance_m: final.distanceM,
    moving_ms: Math.round(final.movingMs),
    elapsed_ms: Math.round(elapsedMs(final)),
    max_speed: final.maxSpeed,
    elev_gain: final.elevGain,
    calories: estimateCalories(final.kind, final.distanceM, final.movingMs, weight),
  });
  const pts = await getPoints(final.rideId);
  await setPreview(final.rideId, simplifyTrack(pts.map((p) => [p.lat, p.lon])));
  return final.rideId;
}
