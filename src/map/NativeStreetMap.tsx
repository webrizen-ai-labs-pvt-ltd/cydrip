// Native 3D street map (Android/iOS) using MapLibre. Loaded only via StreetMap.tsx when the native
// module is present; the web build uses StreetMap.web.tsx.
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { DestPin } from './DestPin';
import { YouArrow } from './YouArrow';
import {
  ATTRIBUTION,
  FOLLOW,
  MAP_STYLE,
  PLAN_LINE,
  ROUTE_GLOW,
  ROUTE_LAYOUT,
  ROUTE_LINE,
  routeGeoJSON,
  trackBounds,
} from './style';
import type { StreetMapProps } from './types';

export function NativeStreetMap({ track, plan, follow, overview, interactive = false, dimmed, style }: StreetMapProps) {
  const [height, setHeight] = useState(0);
  const route = useMemo(() => routeGeoJSON(track), [track]);
  const planned = useMemo(() => (plan && plan.length > 1 ? routeGeoJSON(plan) : null), [plan]);
  const dest = plan && plan.length > 1 ? plan[plan.length - 1] : null;
  const lat = follow?.lat;
  const lon = follow?.lon;
  const bounds = useMemo(() => {
    const all = [...(plan ?? []), ...track, ...(lat != null && lon != null ? [[lat, lon] as [number, number]] : [])];
    return all.length > 1 ? trackBounds(all) : null;
    // Overview reframes as you move only when the route changes, not every fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, track, overview ? null : lat, overview ? null : lon]);

  // Follow: you sit ~70% down the view so most of the screen shows what's ahead.
  const camera = follow && !overview
    ? {
        center: [follow.lon, follow.lat] as [number, number],
        zoom: FOLLOW.zoom,
        pitch: FOLLOW.pitch,
        bearing: follow.heading ?? 0,
        padding: { top: height * 0.4, bottom: 0, left: 0, right: 0 },
        duration: 900,
        easing: 'linear' as const,
      }
    : bounds
      ? { bounds, padding: { top: 56, bottom: 48, left: 40, right: 40 }, pitch: overview ? 30 : 40, bearing: 0, duration: 600 }
      : null;

  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        doubleTapHoldZoom={interactive}
        touchRotate={interactive}
        touchPitch={interactive}
        logo={false}
        compass={false}
        attribution={false}
      >
        {camera ? <Camera {...camera} /> : null}
        {planned ? (
          <GeoJSONSource id="plan" data={planned}>
            <Layer id="plan-line" type="line" layout={ROUTE_LAYOUT} paint={PLAN_LINE as never} />
          </GeoJSONSource>
        ) : null}
        {track.length > 1 ? (
          <GeoJSONSource id="route" data={route}>
            <Layer id="route-glow" type="line" layout={ROUTE_LAYOUT} paint={ROUTE_GLOW as never} />
            <Layer id="route-line" type="line" layout={ROUTE_LAYOUT} paint={ROUTE_LINE as never} />
          </GeoJSONSource>
        ) : null}
        {dest ? (
          <Marker lngLat={[dest[1], dest[0]]} anchor="center">
            <DestPin />
          </Marker>
        ) : null}
        {follow ? (
          <Marker lngLat={[follow.lon, follow.lat]} anchor="center">
            <YouArrow />
          </Marker>
        ) : null}
      </Map>
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
