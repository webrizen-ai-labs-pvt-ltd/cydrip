// "Where to?": search for a place and plan a cycling or walking route there.
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Hairline } from '@/components/ui';
import { isKind } from '@/lib/activity';
import { clearPlan, type Place, planRoute, searchPlaces, usePlan } from '@/lib/navigate';
import { distanceM, type LatLon } from '@/lib/route';
import { getLastKind } from '@/lib/settings';
import { useActiveRide } from '@/lib/tracker';
import { colors, fonts, space, type } from '@/theme';

type Here = { pos: LatLon | null; problem: 'finding' | 'denied' | 'off' | null };

/** Where you are now: from the ride in progress, else a quick location fix. */
function useHere(): Here {
  const ride = useActiveRide();
  const fromRide: LatLon | null = ride?.lastFix ? [ride.lastFix.lat, ride.lastFix.lon] : null;
  const [here, setHere] = useState<Here>({ pos: null, problem: 'finding' });
  useEffect(() => {
    if (fromRide) return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await Location.hasServicesEnabledAsync())) return !cancelled && setHere({ pos: null, problem: 'off' });
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return !cancelled && setHere({ pos: null, problem: 'denied' });
        const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 200 });
        const loc = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!cancelled) setHere({ pos: [loc.coords.latitude, loc.coords.longitude], problem: null });
      } catch {
        if (!cancelled) setHere({ pos: null, problem: 'off' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Looked up once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return fromRide ? { pos: fromRide, problem: null } : here;
}

function fmtAway(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export default function DestinationScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const ride = useActiveRide();
  const kind = ride?.kind ?? (isKind(params.kind) ? params.kind : getLastKind());
  const here = useHere();
  const plan = usePlan();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      pending.current?.abort();
    },
    [],
  );

  // Search as you type, a moment after you stop.
  function onChangeText(text: string) {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    pending.current?.abort();
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    pending.current = ctrl;
    setSearching(true);
    timer.current = setTimeout(() => {
      searchPlaces(q, here.pos, ctrl.signal)
        .then((r) => {
          setResults(r);
          setError(null);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setError(e instanceof TypeError ? 'No internet connection.' : "Search isn't working right now.");
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 350);
  }

  function pick(place: Place) {
    if (!here.pos) return;
    planRoute(place, here.pos, kind);
    router.back();
  }

  const problem =
    here.problem === 'denied'
      ? 'Allow location so CyDrip can plan the route from where you are.'
      : here.problem === 'off'
        ? 'Turn on location to plan a route from where you are.'
        : null;

  return (
    <SafeAreaView style={s.screen} edges={['bottom', 'left', 'right']}>
      <View style={s.searchWrap}>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder="Search a place, street or landmark"
          placeholderTextColor={colors.fog}
          style={s.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          selectionColor={colors.lane}
          accessibilityLabel="Search destination"
        />
        {searching ? <ActivityIndicator color={colors.fog} style={s.spinner} /> : null}
      </View>

      {problem ? <Text style={[s.note, { color: colors.amber }]}>{problem}</Text> : null}
      {error ? <Text style={[s.note, { color: colors.amber }]}>{error}</Text> : null}

      {query.trim().length < 2 ? (
        <View style={s.empty}>
          {plan ? (
            <View style={{ gap: space.md }}>
              <Text style={s.kicker}>Current route</Text>
              <View>
                <Text style={s.name}>{plan.place.name}</Text>
                {plan.place.detail ? <Text style={s.detail}>{plan.place.detail}</Text> : null}
              </View>
              <Button
                title="Clear route"
                variant="quiet"
                onPress={() => {
                  clearPlan();
                  router.back();
                }}
              />
            </View>
          ) : (
            <Text style={s.hint}>
              Pick where you&apos;re going and CyDrip shows the way on the map, turn by turn, with the{' '}
              {kind === 'run' ? 'walking and running' : 'cycling'} route.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(p, i) => `${p.lat},${p.lon},${i}`}
          ItemSeparatorComponent={() => <Hairline style={{ marginLeft: space.lg }} />}
          ListEmptyComponent={
            !searching && !error ? <Text style={[s.note, { color: colors.fog }]}>No places found.</Text> : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.detail}`}
              disabled={!here.pos}
              onPress={() => pick(item)}
              style={({ pressed }) => [s.row, { opacity: !here.pos ? 0.5 : pressed ? 0.6 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.detail ? (
                  <Text style={s.detail} numberOfLines={1}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
              {here.pos ? <Text style={s.away}>{fmtAway(distanceM(here.pos, [item.lat, item.lon]))}</Text> : null}
            </Pressable>
          )}
        />
      )}

      {/* Credit the OpenStreetMap services the search and routes come from. */}
      <Text style={s.credit}>Search by Photon · Routes by Valhalla (FOSSGIS) · © OpenStreetMap contributors</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, justifyContent: 'center' },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.asphalt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kerb,
    paddingHorizontal: space.md,
    paddingRight: 48,
    color: colors.paper,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  spinner: { position: 'absolute', right: space.lg + space.md },
  note: { paddingHorizontal: space.lg, paddingVertical: space.sm, fontFamily: fonts.body, fontSize: type.body },
  empty: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md },
  hint: { color: colors.fog, fontFamily: fonts.body, fontSize: type.body, lineHeight: 23 },
  kicker: { color: colors.fog, fontFamily: fonts.bodyMedium, fontSize: type.caption, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  name: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 17 },
  detail: { color: colors.fog, fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  away: { color: colors.fog, fontFamily: fonts.numMedium, fontSize: 17, fontVariant: ['tabular-nums'] },
  credit: { color: colors.fog, opacity: 0.7, fontFamily: fonts.body, fontSize: 11, textAlign: 'center', padding: space.sm },
});
