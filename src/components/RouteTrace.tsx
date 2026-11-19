import { useMemo } from 'react';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Draws a GPS track as a line, projected flat (fine at city scale). No map tiles,
 * so no Google Maps API key is needed — a real map can come later.
 */
export function RouteTrace({
  points,
  width,
  height,
  strokeWidth = 4,
}: {
  points: [number, number][];
  width: number;
  height: number;
  strokeWidth?: number;
}) {
  const projected = useMemo(() => {
    if (points.length < 2) return null;
    const midLat = points.reduce((a, p) => a + p[0], 0) / points.length;
    const k = Math.cos((midLat * Math.PI) / 180);
    const xs = points.map((p) => p[1] * k);
    const ys = points.map((p) => -p[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = strokeWidth * 2 + 6;
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    return xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i] - minY) * scale] as const);
  }, [points, width, height, strokeWidth]);

  if (!projected) return <Svg width={width} height={height} />;
  const str = projected.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [sx, sy] = projected[0];
  const [ex, ey] = projected[projected.length - 1];
  return (
    <Svg width={width} height={height}>
      <Polyline points={str} fill="none" stroke={colors.lane} strokeOpacity={0.25} strokeWidth={strokeWidth * 3} strokeLinejoin="round" strokeLinecap="round" />
      <Polyline points={str} fill="none" stroke={colors.lane} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={sx} cy={sy} r={strokeWidth + 2} fill={colors.paper} />
      <Circle cx={ex} cy={ey} r={strokeWidth + 3} fill={colors.ink} stroke={colors.lane} strokeWidth={3} />
    </Svg>
  );
}
