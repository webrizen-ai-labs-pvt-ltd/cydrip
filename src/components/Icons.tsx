import type { ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ARROW_PATH } from '@/brand/logo';

type P = { size?: number; color: ColorValue };

/** One triangle from the mark, pointing ahead. */
export const RideIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="-50 -50 100 100">
    <Path d={ARROW_PATH} fill="none" stroke={color} strokeWidth={9} />
  </Svg>
);

export const ListIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
    <Path d="M4 6h16M4 12h16M4 18h10" />
  </Svg>
);

export const ChartIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
    <Path d="M5 20v-6M12 20V5M19 20v-10" />
  </Svg>
);

export const PlayIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7 4.5v15l13-7.5z" fill={color} />
  </Svg>
);

export const PauseIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={6} y={4.5} width={4} height={15} rx={1} fill={color} />
    <Rect x={14} y={4.5} width={4} height={15} rx={1} fill={color} />
  </Svg>
);
