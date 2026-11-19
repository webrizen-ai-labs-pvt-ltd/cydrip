import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteTrace } from '@/components/RouteTrace';
import { Hairline, ScreenTitle } from '@/components/ui';
import { listRides, parsePreview, Ride } from '@/lib/db';
import { avgSpeed, fmtDate, fmtDurationShort, fmtKm, fmtPace, fmtTime } from '@/lib/format';
import { colors, fonts, space, type } from '@/theme';

export default function RidesScreen() {
  const [rides, setRides] = useState<Ride[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listRides().then(setRides);
    }, []),
  );

  // Month groups, each with its own distance total.
  const sections = useMemo(() => {
    const map = new Map<string, Ride[]>();
    for (const r of rides ?? []) {
      const key = new Date(r.started_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].map(([title, data]) => ({
      title,
      km: data.reduce((a, r) => a + r.distance_m, 0),
      data,
    }));
  }, [rides]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={<ScreenTitle style={{ marginBottom: space.sm }}>Activity</ScreenTitle>}
        ListEmptyComponent={
          rides ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Your rides and runs will show up here</Text>
              <Text style={s.emptyBody}>Start one from the Go tab. Each is saved with its route.</Text>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionTotal}>{fmtKm(section.km, 1)} km</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <Hairline style={{ marginLeft: 72 + space.md }} />}
        renderItem={({ item }) => <RideRow ride={item} />}
      />
    </SafeAreaView>
  );
}

function RideRow({ ride }: { ride: Ride }) {
  const track = useMemo(() => parsePreview(ride), [ride]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ride.title}, ${fmtKm(ride.distance_m)} kilometres`}
      onPress={() => router.push({ pathname: '/ride/[id]', params: { id: String(ride.id) } })}
      style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={s.thumb}>
        <RouteTrace points={track} width={72} height={72} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {ride.title}
        </Text>
        <Text style={s.meta}>
          {ride.kind === 'run' ? 'Run' : 'Ride'}, {fmtDate(ride.started_at)}, {fmtTime(ride.started_at)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.km}>
          {fmtKm(ride.distance_m, 1)}
          <Text style={s.kmUnit}> km</Text>
        </Text>
        <Text style={s.meta}>
          {ride.kind === 'run'
            ? `${fmtPace(avgSpeed(ride.distance_m, ride.moving_ms))} /km`
            : fmtDurationShort(ride.moving_ms)}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  list: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  sectionTitle: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: type.body },
  sectionTotal: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: type.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.asphalt, overflow: 'hidden' },
  name: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 17 },
  meta: { color: colors.fog, fontFamily: fonts.body, fontSize: type.caption, marginTop: 2 },
  km: { color: colors.paper, fontFamily: fonts.num, fontSize: 28, fontVariant: ['tabular-nums'] },
  kmUnit: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 16 },
  empty: { paddingTop: space.xl, gap: space.sm },
  emptyTitle: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: type.title },
  emptyBody: { color: colors.fog, fontFamily: fonts.body, fontSize: type.body, lineHeight: 22 },
});
