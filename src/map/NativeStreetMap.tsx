// Native 3D street map (Android/iOS) using MapLibre. Loaded only via StreetMap.tsx when the native
// module is present; the web build uses StreetMap.web.tsx.
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { YouArrow } from './YouArrow';
import { ATTRIBUTION, FOLLOW, MAP_STYLE, ROUTE_GLOW, ROUTE_LAYOUT, ROUTE_LINE, routeGeoJSON, trackBounds } from './style';
import type { StreetMapProps } from './types';

export function NativeStreetMap({ track, follow, interactive = false, dimmed, style }: StreetMapProps) {
  const [height, setHeight] = useState(0);
  const route = useMemo(() => routeGeoJSON(track), [track]);
  const bounds = useMemo(() => (track.length > 1 ? trackBounds(track) : null), [track]);

  // Follow: you sit ~70% down the view so most of the screen shows what's ahead.
  const camera = follow
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
      ? { bounds, padding: { top: 48, bottom: 48, left: 32, right: 32 }, pitch: 40, duration: 0 }
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
        {track.length > 1 ? (
          <GeoJSONSource id="route" data={route}>
            <Layer id="route-glow" type="line" layout={ROUTE_LAYOUT} paint={ROUTE_GLOW as never} />
            <Layer id="route-line" type="line" layout={ROUTE_LAYOUT} paint={ROUTE_LINE as never} />
          </GeoJSONSource>
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
