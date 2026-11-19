import type { ActivityKind } from './activity';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Initial compass bearing from point 1 to point 2, degrees from north. */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Evenly thins a track to at most `max` points, always keeping the last one. */
export function simplifyTrack(pts: [number, number][], max = 80): [number, number][] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)]);
}

export const msToKmh = (ms: number) => ms * 3.6;

export function fmtKm(m: number, digits = 2): string {
  return (m / 1000).toFixed(digits);
}

export function fmtSpeed(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms)) return '0.0';
  return msToKmh(ms).toFixed(1);
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtDurationShort(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function activityTitle(ts: number, kind: ActivityKind): string {
  const h = new Date(ts).getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return `${part} ${kind === 'run' ? 'Run' : 'Drip'}`;
}

/**
 * Rough calories. Rides: MET tables by average moving speed. Runs: about 1 kcal per kg per km,
 * which holds across running speeds.
 */
export function estimateCalories(kind: ActivityKind, distanceM: number, movingMs: number, weightKg: number): number {
  if (movingMs <= 0) return 0;
  if (kind === 'run') return weightKg * (distanceM / 1000);
  const kmh = distanceM / 1000 / (movingMs / 3600000);
  const met = kmh < 16 ? 4 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25 ? 10 : kmh < 30 ? 12 : 15.8;
  return met * weightKg * (movingMs / 3600000);
}

/** Running pace as m:ss per km. Too slow to be running shows a dash. */
export function fmtPace(speedMs: number | null | undefined): string {
  if (speedMs == null || !isFinite(speedMs) || speedMs < 0.5) return '–:––';
  const secs = Math.min(Math.round(1000 / speedMs), 59 * 60 + 59);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/** Average speed over the moving part of an activity, m/s. */
export const avgSpeed = (distanceM: number, movingMs: number) => (movingMs > 0 ? distanceM / (movingMs / 1000) : 0);
