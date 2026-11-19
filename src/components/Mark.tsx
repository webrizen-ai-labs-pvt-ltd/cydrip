import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MARK_PATHS, MARK_VIEWBOX } from '@/brand/logo';
import { colors, fonts } from '@/theme';

export function Mark({ size = 28, color = colors.paper }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox={MARK_VIEWBOX}>
      {MARK_PATHS.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
}

/** Mark + name, for the top of the start screen. */
export function Lockup() {
  return (
    <View style={s.row} accessibilityRole="header" accessibilityLabel="CyDrip">
      <Mark size={26} />
      <Text style={s.name}>CyDrip</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.paper, fontFamily: fonts.numBold, fontSize: 24, letterSpacing: 0.5 },
});
