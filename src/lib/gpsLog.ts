// The raw GPS log of an activity: a summary of how well GPS worked, and a CSV to share when it didn't.
import type { RawFix, Ride } from './db';

export type GpsSummary = {
  /** Fixes received, not counting the same fix twice. */
  fixes: number;
  used: number;
  /** Typical seconds between fixes (median). */
  every: number;
  /** Share of time spent waiting over 5 s for the next fix. */
  sparse: number;
  /** Share of fixes that came with a measured speed. */
  withSpeed: number;
  /** Typical accuracy in metres (median). */
  accuracy: number | null;
  /** Share of fixes that reached CyDrip more than 5 s after they were taken. */
  delayed: number;
  /** Share of fixes that came while CyDrip was on screen. */
  onScreen: number;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function summarize(fixes: RawFix[]): GpsSummary | null {
  const seen = new Set<number>();
  const firsts = fixes.filter((f) => f.verdict !== 'paused' && !seen.has(f.ts) && seen.add(f.ts));
  if (firsts.length < 2) return null;
  const ts = firsts.map((f) => f.ts).sort((a, b) => a - b);
  const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / 1000);
  const total = gaps.reduce((a, g) => a + g, 0) || 1;
  const accs = firsts.map((f) => f.acc).filter((a): a is number => a != null);
  return {
    fixes: firsts.length,
    used: firsts.filter((f) => f.verdict === 'used').length,
    every: median(gaps),
    sparse: gaps.filter((g) => g > 5).reduce((a, g) => a + g, 0) / total,
    withSpeed: firsts.filter((f) => f.speed != null && f.speed > 0.3).length / firsts.length,
    accuracy: accs.length ? median(accs) : null,
    delayed: firsts.filter((f) => f.recv - f.ts > 5000).length / firsts.length,
    onScreen: firsts.filter((f) => f.src === 'watch').length / firsts.length,
  };
}

/** Every fix as CSV: time from the start, delivery delay, source, position, accuracy, speed, verdict. */
export function toCsv(ride: Ride, fixes: RawFix[]): string {
  const t0 = ride.started_at;
  const n = (v: number | null, d: number) => (v == null ? '' : v.toFixed(d));
  const rows = fixes.map((f) =>
    [
      ((f.ts - t0) / 1000).toFixed(1),
      ((f.recv - f.ts) / 1000).toFixed(1),
      f.src,
      f.lat.toFixed(6),
      f.lon.toFixed(6),
      n(f.acc, 1),
      n(f.speed, 2),
      n(f.heading, 0),
      n(f.alt, 1),
      f.verdict,
    ].join(','),
  );
  return ['t_s,delay_s,src,lat,lon,acc_m,speed_ms,heading,alt_m,verdict', ...rows].join('\n');
}

/** Writes the log to a file and opens the share sheet. */
export async function shareGpsLog(ride: Ride, fixes: RawFix[]): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const name = `cydrip-gps-${new Date(ride.started_at).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(toCsv(ride, fixes));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share GPS log' });
}
