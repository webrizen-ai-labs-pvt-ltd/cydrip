import * as SQLite from 'expo-sqlite';

import type { ActivityKind } from './activity';

export type Ride = {
  id: number;
  kind: ActivityKind;
  title: string;
  started_at: number;
  ended_at: number | null;
  distance_m: number;
  moving_ms: number;
  elapsed_ms: number;
  max_speed: number;
  elev_gain: number;
  calories: number;
  /** JSON [lat, lon][] — a thinned track for list thumbnails. */
  preview: string | null;
};

export type Point = {
  ts: number;
  lat: number;
  lon: number;
  alt: number | null;
  speed: number | null;
};

// Opened asynchronously and only once: on web the SQLite worker must finish loading first, and on
// Android the GPS task can fire before any screen has rendered.
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  opening ??= open();
  return opening;
}

async function open() {
  const db = await SQLite.openDatabaseAsync('cydrip.db');
  await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS rides (
  id INTEGER PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  distance_m REAL NOT NULL DEFAULT 0,
  moving_ms INTEGER NOT NULL DEFAULT 0,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  max_speed REAL NOT NULL DEFAULT 0,
  elev_gain REAL NOT NULL DEFAULT 0,
  calories REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS points (
  id INTEGER PRIMARY KEY NOT NULL,
  ride_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  alt REAL,
  speed REAL,
  acc REAL
);
CREATE INDEX IF NOT EXISTS points_ride ON points (ride_id, ts);
`);
  // v2: route preview for list thumbnails.
  const cols = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(rides)')).map((c) => c.name);
  if (!cols.includes('preview')) await db.execAsync('ALTER TABLE rides ADD COLUMN preview TEXT');
  // v3: runs as well as rides. Existing activities are rides.
  if (!cols.includes('kind')) await db.execAsync("ALTER TABLE rides ADD COLUMN kind TEXT NOT NULL DEFAULT 'ride'");
  return db;
}

export async function setPreview(id: number, track: [number, number][]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE rides SET preview = ? WHERE id = ?', JSON.stringify(track), id);
}

export function parsePreview(r: Ride): [number, number][] {
  try {
    return r.preview ? (JSON.parse(r.preview) as [number, number][]) : [];
  } catch {
    return [];
  }
}

export async function createRide(title: string, startedAt: number, kind: ActivityKind): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO rides (title, started_at, kind) VALUES (?, ?, ?)', title, startedAt, kind);
  return r.lastInsertRowId;
}

export async function insertPoint(rideId: number, p: Point & { acc: number | null }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO points (ride_id, ts, lat, lon, alt, speed, acc) VALUES (?, ?, ?, ?, ?, ?, ?)',
    rideId, p.ts, p.lat, p.lon, p.alt, p.speed, p.acc,
  );
}

export async function finishRide(
  id: number,
  s: Omit<Ride, 'id' | 'kind' | 'title' | 'started_at' | 'preview'>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE rides SET ended_at = ?, distance_m = ?, moving_ms = ?, elapsed_ms = ?, max_speed = ?,
     elev_gain = ?, calories = ? WHERE id = ?`,
    s.ended_at, s.distance_m, s.moving_ms, s.elapsed_ms, s.max_speed, s.elev_gain, s.calories, id,
  );
}

export async function deleteRide(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM points WHERE ride_id = ?', id);
    await db.runAsync('DELETE FROM rides WHERE id = ?', id);
  });
}

export async function listRides(): Promise<Ride[]> {
  const db = await getDb();
  return db.getAllAsync<Ride>('SELECT * FROM rides WHERE ended_at IS NOT NULL ORDER BY started_at DESC');
}

export async function getRide(id: number): Promise<Ride | null> {
  const db = await getDb();
  return db.getFirstAsync<Ride>('SELECT * FROM rides WHERE id = ?', id);
}

export async function getPoints(rideId: number): Promise<Point[]> {
  const db = await getDb();
  return db.getAllAsync<Point>('SELECT ts, lat, lon, alt, speed FROM points WHERE ride_id = ? ORDER BY ts', rideId);
}
