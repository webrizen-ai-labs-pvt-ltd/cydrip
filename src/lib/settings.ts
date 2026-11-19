import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { ActivityKind, isKind } from './activity';

const WEIGHT_KEY = 'cydrip.weightKg';
const VIEW_KEY = 'cydrip.viewMode';
const KIND_KEY = 'cydrip.lastKind';
const DEFAULT_WEIGHT = 70;

/** "map" = 3D street map (needs data), "simple" = the grid road view (works offline). */
export type ViewMode = 'map' | 'simple';

let weightKg = DEFAULT_WEIGHT;
let viewMode: ViewMode = 'map';
let lastKind: ActivityKind = 'ride';
const listeners = new Set<() => void>();

/** Loads saved settings into memory. Called once at startup, before screens render. */
export async function loadSettings(): Promise<void> {
  const [w, v, k] = await Promise.all([
    Storage.getItem(WEIGHT_KEY),
    Storage.getItem(VIEW_KEY),
    Storage.getItem(KIND_KEY),
  ]);
  if (isKind(k)) lastKind = k;
  const n = Number(w);
  if (n > 20 && n < 300) weightKg = n;
  if (v === 'map' || v === 'simple') viewMode = v;
}

const save = (key: string, value: string) =>
  Storage.setItem(key, value).catch((e) => console.warn('[cydrip] could not save setting', key, e));

export function getWeightKg(): number {
  return weightKg;
}

export function setWeightKg(kg: number): void {
  weightKg = kg;
  save(WEIGHT_KEY, String(kg));
}

export function setViewMode(mode: ViewMode): void {
  viewMode = mode;
  save(VIEW_KEY, mode);
  listeners.forEach((l) => l());
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => viewMode,
  );
}

/** The activity type picked last time, so the start screen remembers ride vs run. */
export function getLastKind(): ActivityKind {
  return lastKind;
}

export function setLastKind(kind: ActivityKind): void {
  lastKind = kind;
  save(KIND_KEY, kind);
}
