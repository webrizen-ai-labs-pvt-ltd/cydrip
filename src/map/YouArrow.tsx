import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ARROW_PATH } from '@/brand/logo';
import { colors } from '@/theme';

/** "You" on the map: one triangle from the mark, pointing the way you're riding (map turns with you). */
export function YouArrow({ size = 30 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="-56 -56 112 112">
        <Path d={ARROW_PATH} fill={colors.paper} stroke={colors.ink} strokeWidth={8} />
      </Svg>
    </View>
  );
}
