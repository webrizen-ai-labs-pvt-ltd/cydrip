// Browser version of the 3D street map (for `expo start --web` previews), using maplibre-gl.
// Same style, route paint and camera framing as the native StreetMap.tsx.
import 'maplibre-gl/dist/maplibre-gl.css';

import { type GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ARROW_PATH } from '@/brand/logo';
import { colors, fonts } from '@/theme';
import { ATTRIBUTION, FOLLOW, MAP_STYLE, ROUTE_GLOW, ROUTE_LAYOUT, ROUTE_LINE, routeGeoJSON, trackBounds } from './style';
import type { StreetMapProps } from './types';

const ARROW_SVG = `<svg width="30" height="30" viewBox="-56 -56 112 112" xmlns="http://www.w3.org/2000/svg"><path d="${ARROW_PATH}" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="8"/></svg>`;

export function StreetMap({ track, follow, interactive = false, dimmed, style }: StreetMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const route = useMemo(() => routeGeoJSON(track), [track]);

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE as never, // same spec, typed by the native package
      interactive,
      attributionControl: false,
      center: follow ? [follow.lon, follow.lat] : [0, 0],
      zoom: follow ? FOLLOW.zoom : 2,
      pitch: follow ? FOLLOW.pitch : 0,
      maxPitch: 70,
    });
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: routeGeoJSON([]) });
      map.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: ROUTE_LAYOUT, paint: ROUTE_GLOW as never });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: ROUTE_LAYOUT, paint: ROUTE_LINE as never });
      setLoaded(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (mapRef.current?.getSource('route') as GeoJSONSource | undefined)?.setData(route);
  }, [route, loaded]);

  const lat = follow?.lat;
  const lon = follow?.lon;
  const heading = follow?.heading ?? 0;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (lat != null && lon != null) {
      map.easeTo({
        center: [lon, lat],
        zoom: FOLLOW.zoom,
        pitch: FOLLOW.pitch,
        bearing: heading,
        padding: { top: map.getContainer().clientHeight * 0.4, bottom: 0, left: 0, right: 0 },
        duration: 900,
        easing: (t: number) => t,
      });
      if (!markerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = ARROW_SVG;
        markerRef.current = new Marker({ element: el, rotationAlignment: 'viewport' }).setLngLat([lon, lat]).addTo(map);
      } else markerRef.current.setLngLat([lon, lat]);
    } else if (track.length > 1) {
      map.fitBounds(trackBounds(track), { padding: { top: 48, bottom: 48, left: 32, right: 32 }, pitch: 40, duration: 0 });
    }
  }, [lat, lon, heading, loaded, track]);

  return (
    <View style={[styles.wrap, style]}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {dimmed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      {/* OpenStreetMap's licence requires this credit to stay visible. */}
      <Text style={styles.credit} pointerEvents="none">
        {ATTRIBUTION}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignSelf: 'stretch', minHeight: 160, backgroundColor: colors.ink, overflow: 'hidden' },
  dim: { backgroundColor: colors.ink, opacity: 0.45 },
  credit: { position: 'absolute', left: 8, bottom: 6, color: colors.fog, fontFamily: fonts.body, fontSize: 10, opacity: 0.8 },
});
