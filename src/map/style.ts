// CyDrip's own night map, drawn from free OpenStreetMap vector tiles served by OpenFreeMap
// (no API key, no account). Built to sit behind the instrument cluster: black ground, quiet
// grey streets, dark 3D buildings, and nothing blue except your route.
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { colors } from '@/theme';

const SOURCE = 'openmaptiles';

const ROAD = {
  major: '#3A3F47',
  minor: '#2A2E34',
  path: '#33373E',
};

const isClass = (...classes: string[]) => ['match', ['get', 'class'], classes, true, false] as const;

/** Line width that doubles per zoom level, like real streets. */
const width = (base: number) =>
  ['interpolate', ['exponential', 2], ['zoom'], 12, base * 0.25, 16, base * 2, 19, base * 12] as const;

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'CyDrip Night',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    [SOURCE]: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  light: { anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.2, 200, 40] },
  layers: [
    { id: 'ground', type: 'background', paint: { 'background-color': colors.ink } },
    {
      id: 'park',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'park',
      paint: { 'fill-color': '#0A0F0C' },
    },
    {
      id: 'green',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landcover',
      filter: isClass('grass', 'wood', 'farmland') as never,
      paint: { 'fill-color': '#090D0A' },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'water',
      paint: { 'fill-color': '#0B1424' },
    },
    {
      id: 'roads-path',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      filter: isClass('path', 'track') as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROAD.path, 'line-width': width(0.6) as never, 'line-dasharray': [2, 1.5] },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      filter: isClass('minor', 'service') as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROAD.minor, 'line-width': width(1.4) as never },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      filter: isClass('motorway', 'trunk', 'primary', 'secondary', 'tertiary') as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROAD.major, 'line-width': width(2.2) as never },
    },
    {
      id: 'buildings',
      type: 'fill-extrusion',
      source: SOURCE,
      'source-layer': 'building',
      minzoom: 14,
      filter: ['!', ['has', 'hide_3d']] as never,
      paint: {
        'fill-extrusion-color': '#1B1E23',
        'fill-extrusion-height': ['get', 'render_height'] as never,
        'fill-extrusion-base': ['get', 'render_min_height'] as never,
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: 'street-names',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] as never,
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-max-angle': 30,
      },
      paint: { 'text-color': colors.fog, 'text-halo-color': colors.ink, 'text-halo-width': 1.5 },
    },
  ],
};

/** Paint for the route line and its glow, shared by native and web. */
export const ROUTE_GLOW = {
  'line-color': colors.lane,
  'line-opacity': 0.25,
  'line-blur': 4,
  'line-width': ['interpolate', ['exponential', 2], ['zoom'], 12, 6, 17, 22, 19, 60],
} as const;

export const ROUTE_LINE = {
  'line-color': colors.lane,
  'line-width': ['interpolate', ['exponential', 2], ['zoom'], 12, 2.5, 17, 7, 19, 20],
} as const;

export const ROUTE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;

/** Chase-camera framing used while riding. */
export const FOLLOW = { zoom: 17.2, pitch: 62 };

export const ATTRIBUTION = 'OpenFreeMap  © OpenMapTiles  © OpenStreetMap contributors';

export type Track = [number, number][]; // [lat, lon]

export function routeGeoJSON(track: Track): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: track.map(([lat, lon]) => [lon, lat]) },
  };
}

/** [west, south, east, north] around a track. */
export function trackBounds(track: Track): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [lat, lon] of track) {
    w = Math.min(w, lon);
    e = Math.max(e, lon);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  return [w, s, e, n];
}
