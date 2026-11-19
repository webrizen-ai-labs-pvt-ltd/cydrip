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
}: {
  trail: [number, number][];
  position: { lat: number; lon: number } | null;
  heading: number | null;
  distanceM: number;
  dimmed?: boolean;
}) {
  const mode = useViewMode();
  const showMap = MAP_AVAILABLE && mode === 'map' && position != null;

  return (
    <View style={styles.wrap}>
      {showMap ? (
        <StreetMap track={trail} follow={{ ...position, heading }} dimmed={dimmed} />
      ) : (
        <FlexRoadView trail={trail} heading={heading} distanceM={distanceM} dimmed={dimmed} />
      )}
      {MAP_AVAILABLE && position != null ? (
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
