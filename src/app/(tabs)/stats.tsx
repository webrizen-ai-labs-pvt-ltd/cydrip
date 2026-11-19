import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import Constants from 'expo-constants';

import { DefRow, Hairline, LinkRow, ScreenTitle, Segmented } from '@/components/ui';
import { LINKS } from '@/lib/links';
import { listRides, Ride } from '@/lib/db';
import { fmtDate, fmtDurationShort, fmtKm, fmtPace, fmtSpeed } from '@/lib/format';
import { getWeightKg, setWeightKg } from '@/lib/settings';
import { DAY, startOfWeek } from '@/lib/week';
import { colors, fonts, space, type } from '@/theme';

/** Consecutive days with a ride, counting back from today (or yesterday). */
function streak(rides: Ride[], now: number) {
  const days = new Set(rides.map((r) => new Date(r.started_at).toDateString()));
  let d = new Date(now);
  if (!days.has(d.toDateString())) d = new Date(now - DAY);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d = new Date(d.getTime() - DAY);
  }
  return n;
}

function countLabel(n: number, filter: 'all' | 'ride' | 'run') {
  const [one, many] = filter === 'ride' ? ['ride', 'rides'] : filter === 'run' ? ['run', 'runs'] : ['activity', 'activities'];
  return `${n} ${n === 1 ? one : many}`;
}

const best = (rides: Ride[], key: (r: Ride) => number) =>
  rides.reduce<Ride | null>((a, r) => (!a || key(r) > key(a) ? r : a), null);

export default function StatsScreen() {
  const { width } = useWindowDimensions();
  const [all, setAll] = useState<Ride[]>([]);
  const [filter, setFilter] = useState<'all' | 'ride' | 'run'>('all');
  const rides = useMemo(() => (filter === 'all' ? all : all.filter((r) => r.kind === filter)), [all, filter]);
  const [weight, setWeight] = useState(String(getWeightKg()));
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      listRides().then(setAll);
    }, []),
  );

  const data = useMemo(() => {
    const wk = startOfWeek(now);
    const d = new Date(now);
    const month = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const from = wk - (7 - i) * 7 * DAY;
      const km = rides
        .filter((r) => r.started_at >= from && r.started_at < from + 7 * DAY)
        .reduce((a, r) => a + r.distance_m / 1000, 0);
      return { from, km };
    });
    const sum = (list: Ride[]) => list.reduce((a, r) => a + r.distance_m, 0);
    const thisWeek = rides.filter((r) => r.started_at >= wk);
    return {
      weekKm: sum(thisWeek),
      weekRides: thisWeek.length,
      weekMs: thisWeek.reduce((a, r) => a + r.moving_ms, 0),
      lastWeekKm: weeks[6].km * 1000,
      monthKm: sum(rides.filter((r) => r.started_at >= month)),
      allKm: sum(rides),
      longest: best(rides, (r) => r.distance_m),
      fastest: best(rides.filter((r) => r.kind === 'ride'), (r) => r.max_speed),
      // Fastest run by average pace, ignoring very short runs.
      fastestRun: best(
        rides.filter((r) => r.kind === 'run' && r.distance_m >= 1000 && r.moving_ms > 0),
        (r) => r.distance_m / r.moving_ms,
      ),
      climb: best(rides, (r) => r.elev_gain),
      streak: streak(rides, now),
      weeks,
    };
  }, [rides, now]);

  function saveWeight(v: string) {
    setWeight(v);
    const n = Number(v);
    if (n > 20 && n < 300) setWeightKg(n);
  }

  const chartW = width - space.lg * 2;
  const maxKm = Math.max(1, ...data.weeks.map((w) => w.km));
  const barW = chartW / data.weeks.length;
  const diff = data.weekKm - data.lastWeekKm;
  const compare =
    data.lastWeekKm === 0 && data.weekKm === 0
      ? 'No rides in the last two weeks'
      : `${diff >= 0 ? '+' : '−'}${fmtKm(Math.abs(diff), 1)} km compared with last week`;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.content}>
        <ScreenTitle>Stats</ScreenTitle>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'ride', label: 'Rides' },
            { value: 'run', label: 'Runs' },
          ]}
          value={filter}
          onChange={setFilter}
          style={{ marginTop: -space.md }}
        />

        <View>
          <Text style={s.kicker}>This week</Text>
          <View style={s.bigRow}>
            <Text style={s.bigNum}>{fmtKm(data.weekKm, 1)}</Text>
            <Text style={s.bigUnit}>km</Text>
          </View>
          <Text style={s.fog}>{compare}</Text>
        </View>

        <View accessible accessibilityLabel="Distance per week for the last eight weeks">
          <Svg width={chartW} height={140}>
            {data.weeks.map((w, i) => {
              const h = (w.km / maxKm) * 100;
              const current = i === data.weeks.length - 1;
              return (
                <Rect
                  key={w.from}
                  x={i * barW + 3}
                  y={110 - Math.max(h, 2)}
                  width={barW - 6}
                  height={Math.max(h, 2)}
                  rx={3}
                  fill={current ? colors.paper : colors.kerb}
                />
              );
            })}
            {data.weeks.map((w, i) =>
              i % 2 === 1 || i === data.weeks.length - 1 ? (
                <SvgText
                  key={`l${w.from}`}
                  x={i * barW + barW / 2}
                  y={132}
                  fontSize={12}
                  fill={i === data.weeks.length - 1 ? colors.paper : colors.fog}
                  fontFamily={fonts.body}
                  textAnchor="middle"
                >
                  {i === data.weeks.length - 1
                    ? 'Now'
                    : new Date(w.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </SvgText>
              ) : null,
            )}
          </Svg>
        </View>

        <View>
          <DefRow label="This week" value={String(data.weekRides)} detail={`${fmtDurationShort(data.weekMs)} moving`} />
          <Hairline />
          <DefRow label="Streak" value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} />
          <Hairline />
          <DefRow label="This month" value={`${fmtKm(data.monthKm, 1)} km`} />
          <Hairline />
          <DefRow label="All time" value={`${fmtKm(data.allKm, 1)} km`} detail={countLabel(rides.length, filter)} />
        </View>

        <View>
          <Text style={s.section}>Personal bests</Text>
          <DefRow
            label="Longest ride"
            value={data.longest ? `${fmtKm(data.longest.distance_m, 1)} km` : '—'}
            detail={data.longest ? fmtDate(data.longest.started_at) : undefined}
          />
          <Hairline />
          {filter === 'run' ? (
            <DefRow
              label="Fastest pace"
              value={data.fastestRun ? `${fmtPace(data.fastestRun.distance_m / (data.fastestRun.moving_ms / 1000))} /km` : '—'}
              detail={data.fastestRun ? fmtDate(data.fastestRun.started_at) : undefined}
            />
          ) : (
            <DefRow
              label="Top speed"
              value={data.fastest ? `${fmtSpeed(data.fastest.max_speed)} km/h` : '—'}
              detail={data.fastest ? fmtDate(data.fastest.started_at) : undefined}
            />
          )}
          <Hairline />
          <DefRow
            label="Biggest climb"
            value={data.climb ? `${Math.round(data.climb.elev_gain)} m` : '—'}
            detail={data.climb ? fmtDate(data.climb.started_at) : undefined}
          />
        </View>

        <View>
          <Text style={s.section}>You</Text>
          <View style={s.weightRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.weightLabel}>Body weight</Text>
              <Text style={s.fogSmall}>Used to estimate calories</Text>
            </View>
            <TextInput
              value={weight}
              onChangeText={saveWeight}
              keyboardType="numeric"
              maxLength={3}
              style={s.input}
              selectionColor={colors.paper}
              accessibilityLabel="Body weight in kilograms"
            />
            <Text style={s.fog}>kg</Text>
          </View>
        </View>

        <View>
          <Text style={s.section}>About</Text>
          <LinkRow label="Privacy policy" detail="Your rides stay on your phone" url={LINKS.privacy} />
          <Hairline />
          <LinkRow label="Terms of use" url={LINKS.terms} />
          <Hairline />
          <LinkRow label="Source code" detail="Open source, MIT licence" url={LINKS.source} />
          <Hairline />
          <LinkRow label="Report a bug" url={LINKS.issues} />
          <Hairline />
          <DefRow label="Version" value={Constants.expoConfig?.version ?? '—'} />
          <Text style={s.made}>
            CyDrip by <Text style={s.madeLink} onPress={() => Linking.openURL(LINKS.webrizen)}>Webrizen AI Labs</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xl * 2 },
  kicker: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: type.body },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigNum: { color: colors.paper, fontFamily: fonts.num, fontSize: 88, lineHeight: 92, fontVariant: ['tabular-nums'] },
  bigUnit: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 28 },
  fog: { color: colors.fog, fontFamily: fonts.body, fontSize: type.body },
  fogSmall: { color: colors.fog, fontFamily: fonts.body, fontSize: type.caption, marginTop: 2 },
  section: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: type.title, marginBottom: space.xs },
  made: { color: colors.fog, fontFamily: fonts.body, fontSize: type.caption, marginTop: space.lg },
  madeLink: { color: colors.paper, textDecorationLine: 'underline' },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  weightLabel: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: type.body },
  input: {
    width: 84, // fixed, so the label beside it keeps its width
    flexShrink: 0,
    textAlign: 'center',
    color: colors.paper,
    fontFamily: fonts.num,
    fontSize: 24,
    backgroundColor: colors.asphalt,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
