import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuidanceBanner } from '@/components/Guidance';
import { CloseIcon, PauseIcon, PlayIcon, SearchIcon } from '@/components/Icons';
import { Lockup } from '@/components/Mark';
import { RideScene } from '@/components/RideScene';
import { Button, Hairline, HoldButton, Metric, Segmented } from '@/components/ui';
import { ACTIVITY, ActivityKind } from '@/lib/activity';
import { listRides } from '@/lib/db';
import { avgSpeed, estimateCalories, fmtDuration, fmtDurationShort, fmtKm, fmtPace, fmtSpeed } from '@/lib/format';
import { clearPlan, type Plan, planRoute, usePlan } from '@/lib/navigate';
import { getLastKind, getWeightKg, setLastKind } from '@/lib/settings';
import {
  ActiveRide,
  elapsedMs,
  ensureLocationPermission,
  finishActiveRide,
  pauseRide,
  resumeRide,
  startDemoRide,
  startRide,
  useActiveRide,
} from '@/lib/tracker';
import { startOfWeek } from '@/lib/week';
import { colors, fonts, space, type } from '@/theme';

const KEEP_AWAKE_TAG = 'cydrip-ride';

export default function RideScreen() {
  const ride = useActiveRide();
  const riding = ride != null;
  // Screen stays on for the handlebar mount. Runs don't: the phone is in a pocket, recording carries on.
  const keepAwake = ride != null && ACTIVITY[ride.kind].keepAwake;

  useEffect(() => {
    if (!keepAwake) return;
    // Best effort: some browsers refuse a wake lock, and then there's nothing to release either.
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [keepAwake]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right', ...(riding ? (['bottom'] as const) : [])]}>
      {ride ? <Dashboard ride={ride} /> : <Idle />}
    </SafeAreaView>
  );
}

// ---------- before a ride ----------
function useWeekSummary() {
  const [week, setWeek] = useState({ km: 0, rides: 0, runs: 0, ms: 0 });
  useFocusEffect(
    useCallback(() => {
      const from = startOfWeek(Date.now());
      listRides().then((all) => {
        const mine = all.filter((r) => r.started_at >= from);
        setWeek({
          km: mine.reduce((a, r) => a + r.distance_m, 0),
          rides: mine.filter((r) => r.kind === 'ride').length,
          runs: mine.filter((r) => r.kind === 'run').length,
          ms: mine.reduce((a, r) => a + r.moving_ms, 0),
        });
      });
    }, []),
  );
  return week;
}

function Idle() {
  const gps = useGpsPreview();
  const week = useWeekSummary();
  const [starting, setStarting] = useState(false);
  const [kind, setKind] = useState<ActivityKind>(getLastKind);
  const noun = kind === 'run' ? 'run' : 'ride';
  const plan = usePlan();

  // Switching ride / run re-plans the route: bikes and feet are allowed on different roads.
  const fixLat = gps.fix?.lat;
  const fixLon = gps.fix?.lon;
  useEffect(() => {
    if (plan && plan.kind !== kind && plan.status !== 'routing' && fixLat != null && fixLon != null) {
      planRoute(plan.place, [fixLat, fixLon], kind);
    }
  }, [plan, kind, fixLat, fixLon]);

  function pick(k: ActivityKind) {
    setKind(k);
    setLastKind(k);
  }

  async function onStart() {
    if (starting) return;
    setStarting(true);
    try {
      const perm = await ensureLocationPermission();
      if (perm === 'services-off') {
        Alert.alert('Location is off', `Turn on location in quick settings, then tap Start ${noun} again.`);
        return;
      }
      if (perm === 'denied') {
        Alert.alert('CyDrip needs your location', 'Allow location while using the app to record rides and runs.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      await startRide(kind);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Couldn't start recording", String(e instanceof Error ? e.message : e));
    } finally {
      setStarting(false);
    }
  }

  const parts = [
    week.rides ? `${week.rides} ${week.rides === 1 ? 'ride' : 'rides'}` : null,
    week.runs ? `${week.runs} ${week.runs === 1 ? 'run' : 'runs'}` : null,
  ].filter(Boolean);
  const weekLine = parts.length
    ? `${parts.join(', ')}, ${fmtDurationShort(week.ms)} moving`
    : 'Nothing recorded yet this week';

  return (
    <View style={s.idle}>
      <View style={s.idleHeader}>
        <Lockup />
      </View>

      <RideScene
        trail={[]}
        position={gps.fix}
        heading={gps.fix?.heading ?? null}
        distanceM={0}
        plan={plan?.route?.shape}
        overview
      />

      <View style={s.idleBody}>
        <View>
          <Text style={s.kicker}>This week</Text>
          <View style={s.bigRow}>
            <Text style={s.bigNum}>{fmtKm(week.km, 1)}</Text>
            <Text style={s.bigUnit}>km</Text>
          </View>
          <Text style={s.fogText}>{weekLine}</Text>
        </View>

        <View style={{ gap: space.md }}>
          <GpsLine accuracy={gps.accuracy} />
          <WhereTo plan={plan} kind={kind} />
          <Segmented
            options={[
              { value: 'ride', label: 'Ride' },
              { value: 'run', label: 'Run' },
            ]}
            value={kind}
            onChange={pick}
          />
          <Button
            title={starting ? 'Starting…' : `Start ${noun}`}
            onPress={onStart}
            disabled={starting}
            icon={<PlayIcon size={18} color={colors.ink} />}
          />
          {__DEV__ ? (
            <Pressable onPress={() => startDemoRide(kind)} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={s.link}>Try a demo {noun}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** "Where to?" before a ride; once picked, the destination with its distance and time. */
function WhereTo({ plan, kind }: { plan: Plan | null; kind: ActivityKind }) {
  const open = () => router.push({ pathname: '/destination', params: { kind } });
  if (!plan) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [s.whereTo, { opacity: pressed ? 0.7 : 1 }]}
      >
        <SearchIcon size={20} color={colors.fog} />
        <Text style={s.whereToText}>Where to?</Text>
      </Pressable>
    );
  }
  const r = plan.route;
  const by = kind === 'run' ? 'on foot' : 'by bike';
  const sub =
    plan.status === 'routing'
      ? 'Finding the way…'
      : plan.status === 'error'
        ? plan.error ?? 'No route.'
        : r
          ? `${fmtKm(r.lengthM, 1)} km · about ${fmtDurationShort(r.timeS * 1000)} ${by}`
          : '';
  return (
    <View style={s.whereTo}>
      <Pressable accessibilityRole="button" accessibilityHint="Change destination" onPress={open} style={{ flex: 1 }}>
        <Text style={s.destName} numberOfLines={1}>
          To {plan.place.name}
        </Text>
        <Text style={[s.fogText, { fontSize: 14 }, plan.status === 'error' && { color: colors.amber }]} numberOfLines={1}>
          {sub}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear route" onPress={clearPlan} hitSlop={12}>
        <CloseIcon size={20} color={colors.fog} />
      </Pressable>
    </View>
  );
}

type GpsPreview = {
  accuracy: number | null | 'off';
  fix: { lat: number; lon: number; heading: number | null } | null;
};

/** GPS signal and position before a ride, only if location was already allowed (never prompts on launch). */
function useGpsPreview(): GpsPreview {
  const [gps, setGps] = useState<GpsPreview>({ accuracy: null, fix: null });
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const p = await Location.getForegroundPermissionsAsync();
        if (!p.granted || cancelled) return setGps({ accuracy: 'off', fix: null });
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000 },
          (l) =>
            setGps({
              accuracy: l.coords.accuracy,
              fix: {
                lat: l.coords.latitude,
                lon: l.coords.longitude,
                heading: l.coords.heading != null && l.coords.heading >= 0 ? l.coords.heading : null,
              },
            }),
        );
        if (cancelled) sub.remove();
      } catch {
        setGps({ accuracy: 'off', fix: null });
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);
  return gps;
}

function GpsLine({ accuracy }: { accuracy: number | null | 'off' }) {
  let text = 'Looking for GPS…';
  let color = colors.amber;
  if (accuracy === 'off') {
    text = 'Location is asked for when you start';
    color = colors.fog;
  } else if (accuracy != null) {
    const good = accuracy <= 15;
    text = good ? `GPS locked, within ${Math.round(accuracy)} m` : `Weak GPS, within ${Math.round(accuracy)} m`;
    color = good ? colors.paper : colors.amber;
  }
  return (
    <View style={s.gpsRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.fogText, { color }]}>{text}</Text>
    </View>
  );
}

// ---------- during a ride ----------
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function Dashboard({ ride }: { ride: ActiveRide }) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const recording = ride.status === 'recording';
  const now = useNow(recording);
  const elapsed = elapsedMs(ride, now);
  const run = ride.kind === 'run';
  const noun = run ? 'run' : 'ride';
  const avg = avgSpeed(ride.distanceM, ride.movingMs);
  const kcal = estimateCalories(ride.kind, ride.distanceM, ride.movingMs, getWeightKg());
  const plan = usePlan();

  async function onPauseResume() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (recording) await pauseRide();
      else await resumeRide();
    } catch (e) {
      Alert.alert("Couldn't resume GPS", String(e instanceof Error ? e.message : e));
    }
  }

  async function save() {
    clearPlan();
    const id = await finishActiveRide(true);
    // Straight to the snap card; it continues to the activity page.
    if (id != null) router.push({ pathname: '/snap/[id]', params: { id: String(id), fresh: '1' } });
  }

  function onFinish() {
    if (ride.distanceM < 50) {
      Alert.alert(`Discard this ${noun}?`, 'It is shorter than 50 m.', [
        { text: run ? 'Keep running' : 'Keep riding', style: 'cancel' },
        { text: 'Save anyway', onPress: save },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            clearPlan();
            finishActiveRide(false);
          },
        },
      ]);
      return;
    }
    save();
  }

  const state = !recording ? 'Paused' : ride.moving ? 'Recording' : 'Stopped, timer on hold';
  const scene = (
    <View style={{ flex: 1 }}>
      {plan ? <GuidanceBanner ride={ride} plan={plan} /> : null}
      <View style={{ flex: 1 }}>
        <RideScene
          trail={ride.trail}
          position={ride.lastFix}
          heading={ride.heading}
          distanceM={ride.distanceM}
          dimmed={!recording}
          plan={plan?.route?.shape}
        />
        {!plan ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/destination', params: { kind: ride.kind } })}
            hitSlop={10}
            style={({ pressed }) => [s.mapPill, { opacity: pressed ? 0.7 : 1 }]}
          >
            <SearchIcon size={14} color={colors.paper} />
            <Text style={s.mapPillText}>Where to?</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const gpsWeak = recording && ride.accuracy != null && ride.accuracy > 20;
  // No fix at all for a while: no signal, or the phone is holding GPS back to save battery.
  const gpsPaused = recording && !ride.demo && ride.heardTs != null && now - ride.heardTs > 15000;
  const speedSize = landscape ? Math.min(height * 0.3, 200) : Math.min(width * 0.44, 190);
  const pairSize = landscape ? Math.min(height * 0.09, 44) : 44;
  const rowSize = landscape ? Math.min(height * 0.065, type.stat) : type.stat;

  const status = (
    <View style={s.status}>
      <View style={s.gpsRow}>
        <View style={[s.dot, { backgroundColor: recording ? colors.rec : colors.fog }]} />
        <Text style={s.statusText}>{state}</Text>
      </View>
      <Text style={[s.statusText, (gpsWeak || gpsPaused) && { color: colors.amber }]}>
        {ride.demo
          ? 'Demo'
          : gpsPaused
            ? 'No GPS fix'
            : ride.accuracy != null
              ? `GPS ±${Math.round(ride.accuracy)} m`
              : 'GPS…'}
      </Text>
    </View>
  );

  const numbers = (
    <View style={{ gap: landscape ? space.sm : space.md }}>
      <View
        style={s.speedRow}
        accessible
        accessibilityLabel={
          run ? `Pace ${fmtPace(ride.smoothSpeed)} per kilometre` : `Speed ${fmtSpeed(ride.speed)} kilometres per hour`
        }
      >
        <Text
          style={[s.speed, { fontSize: speedSize, lineHeight: speedSize * 0.92 }, !recording && { color: colors.fog }]}
          numberOfLines={1}
        >
          {run ? fmtPace(ride.smoothSpeed) : fmtSpeed(ride.speed)}
        </Text>
        <Text style={s.speedUnit}>{run ? '/km' : 'km/h'}</Text>
      </View>
      <View style={s.row}>
        <Metric value={fmtKm(ride.distanceM)} unit="km" label="Distance" size={pairSize} />
        <Metric value={fmtDuration(elapsed)} label={run ? 'Run time' : 'Ride time'} size={pairSize} />
      </View>
      <Hairline />
      <View style={s.row}>
        {run ? (
          <>
            <Metric value={fmtPace(avg)} label="Avg /km" size={rowSize} />
            <Metric value={fmtPace(ride.maxSpeed)} label="Best /km" size={rowSize} />
          </>
        ) : (
          <>
            <Metric value={fmtSpeed(avg)} label="Avg km/h" size={rowSize} />
            <Metric value={fmtSpeed(ride.maxSpeed)} label="Max km/h" size={rowSize} />
          </>
        )}
        <Metric value={String(Math.round(ride.elevGain))} unit="m" label="Climb" size={rowSize} />
        <Metric value={String(Math.round(kcal))} label="kcal" size={rowSize} />
      </View>
    </View>
  );

  const controls = (
    <View style={s.controls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? `Pause ${noun}` : `Resume ${noun}`}
        onPress={onPauseResume}
        style={({ pressed }) => [s.pause, !recording && s.resume, { opacity: pressed ? 0.7 : 1 }]}
      >
        {recording ? <PauseIcon size={26} color={colors.paper} /> : <PlayIcon size={26} color={colors.ink} />}
      </Pressable>
      <HoldButton title="Hold to finish" holdingTitle="Keep holding…" onComplete={onFinish} style={{ flex: 1 }} />
    </View>
  );

  if (landscape) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: width * 0.45 }}>{scene}</View>
        <View style={[s.dashPad, { flex: 1, justifyContent: 'space-between', paddingVertical: space.sm }]}>
          {status}
          {numbers}
          {controls}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.dashPad}>{status}</View>
      {scene}
      <View style={[s.dashPad, { gap: space.lg, paddingTop: space.lg }]}>
        {numbers}
        {controls}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },

  idle: { flex: 1 },
  idleHeader: { paddingHorizontal: space.lg, paddingVertical: space.md },
  idleBody: { padding: space.lg, gap: space.xl },
  kicker: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: type.body },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigNum: { color: colors.paper, fontFamily: fonts.num, fontSize: 88, lineHeight: 92, fontVariant: ['tabular-nums'] },
  bigUnit: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 28 },
  fogText: { color: colors.fog, fontFamily: fonts.body, fontSize: type.body },
  link: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: 15, textDecorationLine: 'underline' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whereTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 56,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 12,
    backgroundColor: colors.asphalt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kerb,
  },
  whereToText: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: 17 },
  destName: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 17 },
  mapPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kerb,
  },
  mapPillText: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  dashPad: { paddingHorizontal: space.lg, paddingVertical: space.md },
  status: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: 15 },
  speedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  speed: { color: colors.paper, fontFamily: fonts.num, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  speedUnit: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 26 },
  row: { flexDirection: 'row', gap: space.md },
  controls: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  pause: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.kerb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resume: { backgroundColor: colors.paper, borderColor: colors.paper },
});
