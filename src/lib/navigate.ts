// Destination search and turn-by-turn routes, from free OpenStreetMap services (no account, no key):
//  - Photon (komoot) finds places as you type, ranked by how near they are to you;
//  - Valhalla (run by FOSSGIS) plans a route for a bicycle or on foot, with turn instructions.
// Nothing is sent until you search, and only what's needed: your search text with a rough position,
// then the route's start and end points.
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import type { ActivityKind } from './activity';
import { decodePolyline, type LatLon, makeRoute, type Route, type Turn } from './route';

const SEARCH_URL = 'https://photon.komoot.io/api/';
const ROUTE_URL = 'https://valhalla1.openstreetmap.de/route';
const PLAN_KEY = 'cydrip.plan';
// Both services ask apps to identify themselves. Browsers ignore this header; the app sends it.
const HEADERS = { 'User-Agent': 'CyDrip (+https://github.com/webrizen-ai-labs-pvt-ltd/cydrip)' };

export type Place = { name: string; detail: string; lat: number; lon: number };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

/** Places matching `query`, nearest to `near` first. */
export async function searchPlaces(query: string, near: LatLon | null, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: '8' });
  if (near) {
    // Rounded to ~1 km: plenty to rank nearby places first, without sending your exact position.
    params.set('lat', near[0].toFixed(2));
    params.set('lon', near[1].toFixed(2));
  }
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = (await res.json()) as { features: PhotonFeature[] };
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of json.features) {
    const p = f.properties;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const name = p.name ?? street;
    if (!name) continue;
    const parts = [p.name ? street : null, p.district ?? p.locality, p.city ?? p.county, p.state]
      .filter((x): x is string => !!x && x !== name);
    const detail = [...new Set(parts)].join(', ');
    const key = `${name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, detail, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] });
  }
  return out;
}

type ValhallaManeuver = {
  type: number;
  instruction: string;
  begin_shape_index: number;
  street_names?: string[];
};

/** A cycling or walking route from `from` to `to`. */
export async function fetchRoute(from: LatLon, to: LatLon, kind: ActivityKind, signal?: AbortSignal): Promise<Route> {
  const body = {
    locations: [
      { lat: from[0], lon: from[1] },
      { lat: to[0], lon: to[1] },
    ],
    costing: kind === 'run' ? 'pedestrian' : 'bicycle',
    costing_options: kind === 'run' ? {} : { bicycle: { bicycle_type: 'Hybrid' } },
    directions_options: { units: 'kilometers', language: 'en-US' },
  };
  const res = await fetch(ROUTE_URL, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json()) as {
    trip?: { summary: { time: number }; legs: { shape: string; maneuvers: ValhallaManeuver[] }[] };
    error?: string;
  };
  if (!json.trip) throw new Error(json.error ? routeError(json.error) : `Route failed (${res.status})`);
  const leg = json.trip.legs[0];
  const turns: Turn[] = leg.maneuvers.map((m) => ({
    type: m.type,
    instruction: m.instruction,
    at: m.begin_shape_index,
    street: m.street_names?.[0] ?? null,
  }));
  return makeRoute(decodePolyline(leg.shape, 6), json.trip.summary.time, turns);
}

function routeError(msg: string): string {
  if (/no path|no route|unreachable/i.test(msg)) return 'No route found to there.';
  if (/exceeds|max distance/i.test(msg)) return 'That is too far for one route.';
  return msg;
}

// ---------- the planned route (survives app restarts) ----------

export type Plan = {
  place: Place;
  kind: ActivityKind;
  route: Route | null;
  status: 'routing' | 'ready' | 'error';
  error?: string;
};

let plan: Plan | null = null;
const listeners = new Set<() => void>();
let request: AbortController | null = null;

function setPlan(next: Plan | null) {
  plan = next;
  listeners.forEach((l) => l());
  const saved = next?.status === 'ready' ? JSON.stringify({ place: next.place, kind: next.kind, route: next.route }) : null;
  (saved ? Storage.setItem(PLAN_KEY, saved) : next ? Promise.resolve() : Storage.removeItem(PLAN_KEY)).catch((e) =>
    console.warn('[cydrip] could not save route', e),
  );
}

export async function loadPlan(): Promise<void> {
  try {
    const raw = await Storage.getItem(PLAN_KEY);
    if (raw && !plan) {
      const p = JSON.parse(raw) as Pick<Plan, 'place' | 'kind' | 'route'>;
      if (p.route?.shape?.length) plan = { ...p, status: 'ready' };
    }
  } catch (e) {
    console.warn('[cydrip] could not restore route', e);
  }
}

export function getPlan(): Plan | null {
  return plan;
}

export function usePlan(): Plan | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => plan,
  );
}

/**
 * Sets where you're going and plans the route there from `from`. Also used to re-plan (new start
 * after going off-route, or switching ride/run). A newer call cancels an older one still loading.
 * While re-planning, the old route stays on screen.
 */
export async function planRoute(place: Place, from: LatLon, kind: ActivityKind): Promise<void> {
  request?.abort();
  const ctrl = new AbortController();
  request = ctrl;
  const keep = plan && plan.place === place ? plan.route : null;
  setPlan({ place, kind, route: keep, status: 'routing' });
  try {
    const route = await fetchRoute(from, [place.lat, place.lon], kind, ctrl.signal);
    if (request === ctrl) setPlan({ place, kind, route, status: 'ready' });
  } catch (e) {
    if (ctrl.signal.aborted) return;
    const error = e instanceof Error ? e.message : String(e);
    // Keep showing an older route for this place if we have one: being off-route beats no route.
    setPlan({ place, kind, route: keep, status: keep ? 'ready' : 'error', error });
  } finally {
    if (request === ctrl) request = null;
  }
}

export function clearPlan(): void {
  request?.abort();
  request = null;
  setPlan(null);
}
