import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { downsample, LineChart } from '@/components/LineChart';
import { RouteTrace } from '@/components/RouteTrace';
import { Button, Hairline, Metric } from '@/components/ui';
import { deleteRide, getPoints, getRide, Point, Ride } from '@/lib/db';
import { avgSpeed, fmtDate, fmtDuration, fmtKm, fmtPace, fmtSpeed, fmtTime, msToKmh } from '@/lib/format';
import { useViewMode } from '@/lib/settings';
import { computeSplits, splitSpeed } from '@/lib/splits';
import { MAP_AVAILABLE } from '@/map/available';
import { StreetMap } from '@/map/StreetMap';
import { colors, fonts, space, type } from '@/theme';

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewMode = useViewMode();
  const [ride, setRide] = useState<Ride | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    getRide(rideId).then(setRide);
    getPoints(rideId).then(setPoints);
  }, [rideId]);

  const run = ride?.kind === 'run';
  const trail = useMemo(() => points.map((p) => [p.lat, p.lon] as [number, number]), [points]);
  const speeds = useMemo(() => downsample(points.map((p) => msToKmh(p.speed ?? 0))), [points]);
  const elev = useMemo(() => downsample(points.filter((p) => p.alt != null).map((p) => p.alt!)), [points]);
  const splits = useMemo(() => (run ? computeSplits(points) : []), [points, run]);

  if (!ride) return <View style={s.screen} />;

  const noun = run ? 'run' : 'ride';
  const avg = avgSpeed(ride.distance_m, ride.moving_ms);
  const chartW = width - space.lg * 2;
  const mapH = Math.round(height * 0.42);
  // Only complete kilometres count as a "fastest km"; a 400 m run has none.
  const fullSplits = splits.filter((sp) => sp.distM >= 1000);
  const fastestSplit = Math.max(0, ...fullSplits.map(splitSpeed));
  const barScale = Math.max(0, ...splits.map(splitSpeed)) || 1;

  function onDelete() {
    Alert.alert(`Delete this ${noun}?`, 'It and its route are removed from this phone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Delete ${noun}`,
        style: 'destructive',
        onPress: async () => {
          await deleteRide(rideId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: space.xl + insets.bottom }}>
      <View style={[s.map, { height: mapH }]}>
        {trail.length > 1 ? (
          MAP_AVAILABLE && viewMode === 'map' ? (
            <StreetMap track={trail} interactive />
          ) : (
            <RouteTrace points={trail} width={width} height={mapH} strokeWidth={4} />
          )
        ) : (
          <Text style={s.fog}>No route was recorded</Text>
        )}
      </View>

      <View style={s.body}>
        <View>
          <Text style={s.title}>{ride.title}</Text>
          <Text style={s.fog}>
            {fmtDate(ride.started_at)}, {fmtTime(ride.started_at)}
            {ride.ended_at ? ` to ${fmtTime(ride.ended_at)}` : ''}
          </Text>
        </View>

        <View style={s.row}>
          <Metric value={fmtKm(ride.distance_m)} unit="km" label="Distance" size={type.display} />
          <Metric value={fmtDuration(ride.moving_ms)} label="Moving time" size={type.display} />
        </View>
        <Hairline />
        <View style={s.row}>
          {run ? (
            <>
              <Metric value={fmtPace(avg)} label="Avg /km" />
              <Metric value={fastestSplit ? fmtPace(fastestSplit) : '—'} label="Fastest km" />
            </>
          ) : (
            <>
              <Metric value={fmtSpeed(avg)} label="Avg km/h" />
              <Metric value={fmtSpeed(ride.max_speed)} label="Max km/h" />
            </>
          )}
          <Metric value={fmtDuration(ride.elapsed_ms)} label="Total time" />
        </View>
        <View style={s.row}>
          <Metric value={String(Math.round(ride.elev_gain))} unit="m" label="Climb" />
          <Metric value={String(Math.round(ride.calories))} label="kcal" />
          <View style={{ flex: 1 }} />
        </View>

        <Button
          title="Make a snap"
          onPress={() => router.push({ pathname: '/snap/[id]', params: { id: String(rideId) } })}
        />

        {splits.length > 0 ? (
          <View style={s.chart}>
            <Text style={s.chartTitle}>Splits</Text>
            {splits.map((sp) => {
              const v = splitSpeed(sp);
              const fastest = sp.distM >= 1000 && v === fastestSplit;
              return (
                <View key={sp.km} style={s.splitRow}>
                  <Text style={s.splitKm}>{sp.distM < 1000 ? fmtKm(sp.distM, 2) : sp.km}</Text>
                  <View style={s.splitTrack}>
                    <View
                      style={[
                        s.splitBar,
                        { width: `${Math.max(8, (v / barScale) * 100)}%` },
                        fastest && { backgroundColor: colors.paper },
                      ]}
                    />
                  </View>
                  <Text style={[s.splitPace, fastest && { color: colors.paper }]}>{fmtPace(v)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {speeds.length > 1 ? (
          <View style={s.chart}>
            <Text style={s.chartTitle}>Speed</Text>
            <LineChart id="spd" values={speeds} width={chartW} height={120} unit="km/h" />
          </View>
        ) : null}

        {elev.length > 1 ? (
          <View style={s.chart}>
            <Text style={s.chartTitle}>Elevation</Text>
            <LineChart id="elev" values={elev} width={chartW} height={100} unit="m" color={colors.fog} />
          </View>
        ) : null}

        <Pressable onPress={onDelete} hitSlop={8} style={({ pressed }) => [s.delete, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={s.deleteText}>Delete {noun}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  map: { backgroundColor: colors.asphalt, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.lg, gap: space.lg },
  title: { color: colors.paper, fontFamily: fonts.numBold, fontSize: 36, lineHeight: 40 },
  fog: { color: colors.fog, fontFamily: fonts.body, fontSize: type.body },
  row: { flexDirection: 'row', gap: space.md },
  chart: { gap: space.sm },
  chartTitle: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: type.body },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, height: 28 },
  splitKm: { width: 36, color: colors.fog, fontFamily: fonts.numMedium, fontSize: 16, fontVariant: ['tabular-nums'] },
  splitTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.asphalt, overflow: 'hidden' },
  splitBar: { height: 10, borderRadius: 5, backgroundColor: colors.kerb },
  splitPace: { width: 52, textAlign: 'right', color: colors.fog, fontFamily: fonts.num, fontSize: 18, fontVariant: ['tabular-nums'] },
  delete: { alignSelf: 'flex-start', paddingVertical: space.sm },
  deleteText: { color: colors.rec, fontFamily: fonts.bodySemi, fontSize: type.body },
});
