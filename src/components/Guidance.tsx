// Turn-by-turn guidance during a ride or run: the next turn, how far to it, and what's left.
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clearPlan, type Plan, planRoute } from '@/lib/navigate';
import { type Progress, progress, type Route } from '@/lib/route';
import type { ActiveRide } from '@/lib/tracker';
import { colors, fonts, space } from '@/theme';
import { TurnArrow } from './TurnArrow';

// Off the route by more than this for a few seconds means you've taken another way: re-plan.
const OFF_ROUTE_M = 40;
const OFF_ROUTE_FOR_MS = 8000;
const REROUTE_EVERY_MS = 30_000;

// The segment you were last on, per route, so progress searches near there first.
const lastIndex = new WeakMap<Route, number>();

/** Where you are on the planned route, re-planning when you leave it. */
export function useGuidance(ride: ActiveRide, plan: Plan | null): (Progress & { offRoute: boolean }) | null {
  const route = plan?.route ?? null;
  const pos = ride.lastFix;
  const offSince = useRef<number | null>(null);
  const lastReroute = useRef(0);

  const prog = useMemo(() => {
    if (!route || !pos) return null;
    return progress(route, [pos.lat, pos.lon], lastIndex.get(route) ?? null);
  }, [route, pos]);

  const limit = Math.max(OFF_ROUTE_M, (ride.accuracy ?? 0) * 1.5);
  const off = prog != null && !prog.arrived && prog.off > limit;

  useEffect(() => {
    if (route && prog) lastIndex.set(route, prog.index);
    if (!plan || !pos || !prog) return;
    if (!off || ride.status !== 'recording') {
      offSince.current = null;
      return;
    }
    const now = pos.ts;
    offSince.current ??= now;
    if (
      plan.status === 'ready' &&
      now - offSince.current > OFF_ROUTE_FOR_MS &&
      Date.now() - lastReroute.current > REROUTE_EVERY_MS
    ) {
      lastReroute.current = Date.now();
      offSince.current = null;
      planRoute(plan.place, [pos.lat, pos.lon], ride.kind);
    }
  }, [prog, off, plan, pos, route, ride.status, ride.kind]);

  return prog ? { ...prog, offRoute: off } : null;
}

function fmtTo(m: number): { value: string; unit: string } {
  if (m < 1000) return { value: String(m < 100 ? Math.max(0, Math.round(m / 5) * 5) : Math.round(m / 10) * 10), unit: 'm' };
  return { value: (m / 1000).toFixed(1), unit: 'km' };
}

export function GuidanceBanner({ ride, plan }: { ride: ActiveRide; plan: Plan }) {
  const g = useGuidance(ride, plan);
  const left = g ? fmtTo(g.remaining) : null;

  let icon = 8; // straight on
  let big: { value: string; unit: string } | null = null;
  let line = '';
  if (!plan.route) {
    line = plan.status === 'error' ? plan.error ?? 'No route.' : 'Finding the way…';
  } else if (!g) {
    line = 'Waiting for GPS…';
  } else if (g.arrived) {
    icon = 4;
    line = `You've arrived at ${plan.place.name}`;
  } else if (g.offRoute) {
    line = plan.status === 'routing' ? 'Off route, finding a new way…' : 'Off route, head back to the white line';
  } else if (g.next) {
    icon = g.next.type;
    big = fmtTo(g.toNext);
    line = g.next.instruction.replace(/\.$/, '');
  }

  return (
    <View style={s.wrap} accessibilityLiveRegion="polite">
      <TurnArrow type={icon} size={44} color={g?.offRoute ? colors.amber : colors.paper} />
      <View style={{ flex: 1 }}>
        {big ? (
          <Text style={s.big}>
            {big.value}
            <Text style={s.bigUnit}> {big.unit}</Text>
          </Text>
        ) : null}
        <Text style={[s.line, !big && s.lineOnly, g?.offRoute && { color: colors.amber }]} numberOfLines={2}>
          {line}
        </Text>
      </View>
      <View style={s.side}>
        {left && !g?.arrived ? (
          <Text style={s.left}>
            {left.value}
            <Text style={s.leftUnit}> {left.unit}</Text>
          </Text>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="End route" hitSlop={10} onPress={clearPlan}>
          <Text style={s.end}>{g?.arrived ? 'Done' : 'End'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    backgroundColor: colors.asphalt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.kerb,
  },
  big: { color: colors.paper, fontFamily: fonts.num, fontSize: 34, lineHeight: 36, fontVariant: ['tabular-nums'] },
  bigUnit: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 20 },
  line: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: 15 },
  lineOnly: { color: colors.paper, fontSize: 17 },
  side: { alignItems: 'flex-end', gap: 4 },
  left: { color: colors.paper, fontFamily: fonts.numMedium, fontSize: 20, fontVariant: ['tabular-nums'] },
  leftUnit: { color: colors.fog, fontSize: 14 },
  end: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: 14, textDecorationLine: 'underline' },
});
