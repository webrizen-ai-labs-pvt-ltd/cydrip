import { memo, useMemo, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ARROW_PATH } from '@/brand/logo';
import { colors } from '@/theme';

/**
 * Chase-camera view of the ride: a drone hangs ~160 m behind you and ~58 m up, looking ahead.
 * The ground is a grid that slides toward you as distance grows, your recent track is the blue lane,
 * and the white arrow (one triangle from the mark) is you. Everything rotates so "ahead" is up.
 *
 * Camera maths: a ground point `fwd` metres ahead and `right` metres to the side sits at depth
 * z = fwd + CAM_BACK. It projects to  x = cx + F·right / z,  y = horizon + K / z,  where K = F·CAM_UP.
 * K and CAM_BACK are chosen so you sit at 55% of the height and the bottom edge is 80 m behind.
 */
const CAM_BACK = 160;
const LANE_WIDTH = 4.5; // metres
const GRID = 25; // metres between grid lines
const NEAR = 20;

type Props = {
  width: number;
  height: number;
  trail: [number, number][];
  heading: number | null;
  distanceM: number;
  dimmed?: boolean;
};

function RoadViewImpl({ width, height, trail, heading, distanceM, dimmed }: Props) {
  const H = height;
  const horizon = 0.1 * H;
  const K = 72 * H; // horizon + K / CAM_BACK = 0.55 H ; horizon + K / (CAM_BACK - 80) = H
  const F = 1.25 * H; // lateral focal length
  const cx = width / 2;

  const project = (fwd: number, right: number) => {
    const z = fwd + CAM_BACK;
    return { x: cx + (F * right) / z, y: horizon + K / z, z };
  };

  // Track → local metres → rotate so heading is up.
  const lane = useMemo(() => {
    if (trail.length < 2) return [];
    const [lat0, lon0] = trail[trail.length - 1];
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const h = ((heading ?? 0) * Math.PI) / 180;
    const sin = Math.sin(h);
    const cos = Math.cos(h);
    const pts: { fwd: number; right: number }[] = [];
    for (let i = trail.length - 1; i >= 0; i--) {
      const east = (trail[i][1] - lon0) * kx;
      const north = (trail[i][0] - lat0) * 110540;
      const fwd = east * sin + north * cos;
      const right = east * cos - north * sin;
      pts.push({ fwd, right });
      if (fwd < -(CAM_BACK - NEAR)) break;
    }
    return pts.reverse();
  }, [trail, heading]);

  // Grid lines across the road, sliding toward you as you ride.
  const offset = distanceM % GRID;
  const across: number[] = [];
  for (let f = -100; f <= 600; f += GRID) across.push(f - offset);
  const along: number[] = [];
  for (let r = -150; r <= 150; r += GRID) along.push(r);

  const fade = (z: number) => Math.max(0, Math.min(1, 1.6 - z / 400));
  const rider = project(0, 0);
  const arrowScale = (H * 0.075) / 76;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ink} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={colors.asphalt} />

      <G opacity={dimmed ? 0.5 : 1}>
        {across.map((f) => {
          const z = f + CAM_BACK;
          if (z < NEAR) return null;
          const a = project(f, -400);
          const b = project(f, 400);
          return (
            <Line key={`a${f}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.kerb} strokeOpacity={fade(z)} strokeWidth={1} />
          );
        })}
        {along.map((r) => {
          const a = project(-(CAM_BACK - NEAR), r);
          const b = project(900, r);
          return <Line key={`l${r}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.kerb} strokeWidth={1} />;
        })}

        {/* The way ahead: straight line along your heading. */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = project(10 + i * 30, 0);
          const b = project(25 + i * 30, 0);
          return (
            <Line key={`d${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.paper} strokeOpacity={0.5 - i * 0.07} strokeWidth={2} strokeLinecap="round" />
          );
        })}

        {/* Your track as a lane that widens toward the camera, drawn as one ribbon. */}
        {lane.length > 1 ? (
          <>
            <Path d={ribbon(lane, project, F, LANE_WIDTH * 2.6)} fill={colors.lane} fillOpacity={0.2} />
            <Path d={ribbon(lane, project, F, LANE_WIDTH)} fill={colors.lane} />
          </>
        ) : null}
      </G>

      <Rect width={width} height={horizon + H * 0.18} fill="url(#sky)" />

      <Path
        d={ARROW_PATH}
        fill={colors.paper}
        transform={`translate(${rider.x} ${rider.y}) scale(${arrowScale})`}
      />
    </Svg>
  );
}

/**
 * Closed polygon around the projected track: each point is pushed left/right of the screen-space
 * direction of travel by half the lane width at that depth. Ends are capped with the last edge.
 */
function ribbon(
  lane: { fwd: number; right: number }[],
  project: (fwd: number, right: number) => { x: number; y: number; z: number },
  F: number,
  widthM: number,
): string {
  const pts = lane.map((p) => project(p.fwd, p.right)).filter((p) => p.z > NEAR / 2);
  if (pts.length < 2) return '';
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const half = (F * widthM) / pts[i].z / 2;
    left.push(`${(pts[i].x - dy * half).toFixed(1)},${(pts[i].y + dx * half).toFixed(1)}`);
    right.push(`${(pts[i].x + dy * half).toFixed(1)},${(pts[i].y - dx * half).toFixed(1)}`);
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
}

export const RoadView = memo(RoadViewImpl);

/** RoadView that fills whatever space its parent gives it. */
export function FlexRoadView(props: Omit<Props, 'width' | 'height'> & { style?: ViewStyle }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const { style, ...rest } = props;
  return (
    <View
      style={[{ flex: 1, minHeight: 160, backgroundColor: colors.asphalt }, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size ? <RoadView {...rest} width={size.w} height={size.h} /> : null}
    </View>
  );
}
