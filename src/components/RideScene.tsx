import { Pressable, StyleSheet, Text, View } from 'react-native';

import { setViewMode, useViewMode } from '@/lib/settings';
import { MAP_AVAILABLE } from '@/map/available';
import { StreetMap } from '@/map/StreetMap';
import { colors, fonts } from '@/theme';
import { FlexRoadView } from './RoadView';

/**
 * The view at the top of the ride and start screens: the 3D street map when we know where you are,
 * otherwise (or when you pick "Simple") the grid road view, which needs no data connection.
 */
export function RideScene({
  trail,
  position,
  heading,
  distanceM,
  dimmed,
  plan,
  overview,
}: {
  trail: [number, number][];
  position: { lat: number; lon: number } | null;
  heading: number | null;
  distanceM: number;
  dimmed?: boolean;
  /** Planned route to a destination, if any. */
  plan?: [number, number][] | null;
  /** Show the whole planned route instead of chasing you. */
  overview?: boolean;
}) {
  const mode = useViewMode();
  const hasPlan = plan != null && plan.length > 1;
  const showMap = MAP_AVAILABLE && mode === 'map' && (position != null || hasPlan);

  return (
    <View style={styles.wrap}>
      {showMap ? (
        <StreetMap
          track={trail}
          plan={plan}
          follow={position ? { ...position, heading } : null}
          overview={overview && hasPlan}
          dimmed={dimmed}
        />
      ) : (
        <FlexRoadView trail={trail} heading={heading} distanceM={distanceM} dimmed={dimmed} />
      )}
      {MAP_AVAILABLE && (position != null || hasPlan) ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'map' ? 'Switch to simple view' : 'Switch to 3D map'}
        onPress={() => setViewMode(mode === 'map' ? 'simple' : 'map')}
        hitSlop={10}
        style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.toggleText}>{mode === 'map' ? 'Simple view' : '3D map'}</Text>
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 160 },
  toggle: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kerb,
  },
  toggleText: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
