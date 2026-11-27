export type ActivityKind = 'ride' | 'run';

type ActivityConfig = {
  label: string;
  /** Below this speed you count as stopped: no moving time, no distance (kills GPS drift). */
  movingSpeed: number; // m/s
  /** A fix implying more than this is a GPS glitch and is dropped. */
  maxSpeed: number; // m/s
  /** Typical speed, for moving time when sparse GPS fixes can't tell. */
  cruiseSpeed: number; // m/s
  /** Keep the screen on. Yes on a handlebar mount; no for runs, where the phone is in a pocket. */
  keepAwake: boolean;
  notificationTitle: string;
};

export const ACTIVITY: Record<ActivityKind, ActivityConfig> = {
  ride: {
    label: 'Ride',
    movingSpeed: 1.0, // ≈ 3.6 km/h
    maxSpeed: 25, // ≈ 90 km/h
    cruiseSpeed: 4, // ≈ 14 km/h, an easy city ride
    keepAwake: true,
    notificationTitle: 'Recording your ride',
  },
  run: {
    label: 'Run',
    movingSpeed: 0.7, // ≈ 2.5 km/h — slower than a stroll; jogging on the spot doesn't count
    maxSpeed: 9, // ≈ 32 km/h, faster than any human sprint
    cruiseSpeed: 2.7, // ≈ 6:10 /km
    keepAwake: false,
    notificationTitle: 'Recording your run',
  },
};

export const isKind = (v: unknown): v is ActivityKind => v === 'ride' || v === 'run';
