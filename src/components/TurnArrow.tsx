import Svg, { Circle, Path } from 'react-native-svg';

import { isArrival, isRoundabout, turnAngle } from '@/lib/route';
import { colors } from '@/theme';

/** The next turn, drawn like a road sign: you come up from the bottom and leave along the arrow. */
export function TurnArrow({ type, size = 44, color = colors.paper }: { type: number; size?: number; color?: string }) {
  const stroke = { stroke: color, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  if (isArrival(type)) {
    return (
      <Svg width={size} height={size} viewBox="-24 -24 48 48">
        <Circle cx={0} cy={0} r={13} {...stroke} />
        <Circle cx={0} cy={0} r={5} fill={color} />
      </Svg>
    );
  }

  if (isRoundabout(type)) {
    return (
      <Svg width={size} height={size} viewBox="-24 -24 48 48">
        <Path d="M0 22 V12" {...stroke} />
        <Circle cx={0} cy={0} r={10} {...stroke} />
        <Path d="M7 -7 L17 -17" {...stroke} />
        <Path d="M9 -18 H18 V-9" {...stroke} />
      </Svg>
    );
  }

  const angle = turnAngle(type) ?? 0;
  if (Math.abs(angle) === 180) {
    return (
      <Svg width={size} height={size} viewBox="-24 -24 48 48">
        <Path d="M6 20 V-6 A8 8 0 0 0 -10 -6 V14" {...stroke} />
        <Path d="M-17 7 L-10 14 L-3 7" {...stroke} />
      </Svg>
    );
  }

  // Stem from the bottom to the junction, then out along the turn, with the head at the tip.
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  // Straight on: one line up. Turns: up to the junction just above centre, then out 16 units.
  const jy = angle === 0 ? -6 : -2;
  const tip = angle === 0 ? [0, -20] : [dx * 16, jy + dy * 16];
  const back = (r: number, side: number) => {
    const b = a + Math.PI + side * 0.75;
    return `${tip[0] + Math.sin(b) * r} ${tip[1] - Math.cos(b) * r}`;
  };
  return (
    <Svg width={size} height={size} viewBox="-24 -24 48 48">
      <Path d={`M0 21 V${jy} L${tip[0]} ${tip[1]}`} {...stroke} />
      <Path d={`M${back(9, -1)} L${tip[0]} ${tip[1]} L${back(9, 1)}`} {...stroke} />
    </Svg>
  );
}
