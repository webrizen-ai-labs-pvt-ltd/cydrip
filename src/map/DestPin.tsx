import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

/** Where you're going: a white ring, the map's only other mark besides you. */
export function DestPin({ size = 22 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 22 22">
        <Circle cx={11} cy={11} r={8} fill={colors.ink} stroke={colors.paper} strokeWidth={3} />
        <Circle cx={11} cy={11} r={3} fill={colors.paper} />
      </Svg>
    </View>
  );
}

export const DEST_PIN_SVG = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8" fill="${colors.ink}" stroke="${colors.paper}" stroke-width="3"/><circle cx="11" cy="11" r="3" fill="${colors.paper}"/></svg>`;
