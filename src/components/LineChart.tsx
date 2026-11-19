import Svg, { Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '@/theme';

/** Simple area line chart for speed / elevation over a ride. */
export function LineChart({
  values,
  width,
  height,
  color = colors.paper,
  unit,
  id,
}: {
  values: number[];
  width: number;
  height: number;
  color?: string;
  unit: string;
  id: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const span = Math.max(max - min, 1);
  const top = 18;
  const h = height - top - 4;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, top + h - ((v - min) / span) * h]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${top + h} L0,${top + h} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Line x1={0} x2={width} y1={top} y2={top} stroke={colors.kerb} strokeDasharray="4 6" />
      <SvgText x={width} y={12} fill={colors.fog} fontSize={11} fontFamily={fonts.body} textAnchor="end">
        {`max ${max.toFixed(1)} ${unit}`}
      </SvgText>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** Downsample a series to at most n buckets (bucket average). */
export function downsample(values: number[], n = 120): number[] {
  if (values.length <= n) return values;
  const size = values.length / n;
  return Array.from({ length: n }, (_, i) => {
    const slice = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
