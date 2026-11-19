// The shareable image made after a ride or run. No captions — the route and the numbers say it.
// Always laid out at 360 × 640 (story) or 360 × 360 (square) logical points; the snap screen scales
// it for preview and captures it at full size.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Rect, Stop } from 'react-native-svg';

import { Mark } from '@/components/Mark';
import type { Ride } from '@/lib/db';
import { avgSpeed, fmtDuration, fmtKm, fmtPace, fmtSpeed } from '@/lib/format';
import { floorProjector, projectFlat, projectFloor, toPolyline } from '@/lib/projection';
import { colors, fonts } from '@/theme';

export type SnapStyle = 'line' | 'poster' | 'floor' | 'sticker';
export type SnapFormat = 'story' | 'square';

export const SNAP_STYLES: { value: SnapStyle; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'poster', label: 'Poster' },
  { value: 'floor', label: 'Floor' },
  { value: 'sticker', label: 'Sticker' },
];

export const CARD_W = 360;
export const cardHeight = (f: SnapFormat) => (f === 'story' ? 640 : 360);

type Props = { ride: Ride; track: [number, number][]; style: SnapStyle; format: SnapFormat };

/** The numbers, in the order they're shown. Units only — no labels. */
function numbers(ride: Ride) {
  const run = ride.kind === 'run';
  const v = avgSpeed(ride.distance_m, ride.moving_ms);
  return {
    distance: fmtKm(ride.distance_m, ride.distance_m >= 100000 ? 1 : 2),
    time: fmtDuration(ride.moving_ms),
    rate: run ? fmtPace(v) : fmtSpeed(v),
    rateUnit: run ? '/km' : 'km/h',
    climb: String(Math.round(ride.elev_gain)),
    date: new Date(ride.started_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

export function SnapCard({ ride, track, style, format }: Props) {
  const H = cardHeight(format);
  const transparent = style === 'sticker';
  return (
    <View
      collapsable={false}
      style={{ width: CARD_W, height: H, backgroundColor: transparent ? 'transparent' : colors.ink, overflow: 'hidden' }}
    >
      {style === 'line' ? <LineCard ride={ride} track={track} format={format} /> : null}
      {style === 'poster' ? <PosterCard ride={ride} track={track} format={format} /> : null}
      {style === 'floor' ? <FloorCard ride={ride} track={track} format={format} /> : null}
      {style === 'sticker' ? <StickerCard ride={ride} track={track} format={format} /> : null}
    </View>
  );
}

type Part = Omit<Props, 'style'>;

// ---------- shared bits ----------

function Route({ pts, color = colors.lane, width = 4, glow = true, ends = true }: {
  pts: [number, number][];
  color?: string;
  width?: number;
  glow?: boolean;
  ends?: boolean;
}) {
  if (pts.length < 2) return null;
  const line = toPolyline(pts);
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <>
      {glow ? (
        <Polyline points={line} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={width * 3.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      <Polyline points={line} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {ends ? (
        <>
          <Circle cx={sx} cy={sy} r={width * 1.1} fill={colors.paper} />
          <Circle cx={ex} cy={ey} r={width * 1.4} fill={colors.ink} stroke={color} strokeWidth={width * 0.8} />
        </>
      ) : null}
    </>
  );
}

function Num({ value, unit, size, color = colors.paper, shadow }: {
  value: string;
  unit?: string;
  size: number;
  color?: string;
  shadow?: boolean;
}) {
  const sh = shadow ? styles.shadow : null;
  return (
    <View style={styles.numRow}>
      <Text style={[styles.num, { fontSize: size, lineHeight: size * 1.02, color }, sh]}>{value}</Text>
      {unit ? (
        <Text style={[styles.unit, { fontSize: Math.max(12, size * 0.36), color: shadow ? color : colors.fog }, sh]}>{unit}</Text>
      ) : null}
    </View>
  );
}

function Footer({ date, color = colors.fog, shadow }: { date: string; color?: string; shadow?: boolean }) {
  return (
    <View style={styles.footer}>
      <Text style={[styles.date, { color }, shadow && styles.shadow]}>{date}</Text>
      <Mark size={18} color={shadow ? colors.paper : colors.paper} />
    </View>
  );
}

// ---------- styles ----------

/** Route as the hero, numbers underneath. */
function LineCard({ ride, track, format }: Part) {
  const n = numbers(ride);
  const story = format === 'story';
  const mapH = story ? 380 : 190;
  const pts = projectFlat(track, CARD_W, mapH, 40);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={CARD_W} height={mapH}>
        <Route pts={pts} />
      </Svg>
      <View style={[styles.pad, { flex: 1, justifyContent: 'space-between' }]}>
        <View style={{ gap: story ? 10 : 4 }}>
          <Num value={n.distance} unit="km" size={story ? 92 : 56} />
          <View style={styles.row3}>
            <Num value={n.time} size={story ? 30 : 22} />
            <Num value={n.rate} unit={n.rateUnit} size={story ? 30 : 22} />
            <Num value={n.climb} unit="m" size={story ? 30 : 22} />
          </View>
        </View>
        <Footer date={n.date} />
      </View>
    </View>
  );
}

/** Typography first: the distance fills the card, the route sits quietly behind. */
function PosterCard({ ride, track, format }: Part) {
  const n = numbers(ride);
  const story = format === 'story';
  const H = cardHeight(format);
  const pts = projectFlat(track, CARD_W, H, 28);
  const size = n.distance.length > 5 ? 118 : 140;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={CARD_W} height={H} style={StyleSheet.absoluteFill}>
        <Route pts={pts} color={colors.paper} width={2} glow={false} ends={false} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      <View style={[styles.pad, { flex: 1, justifyContent: 'space-between' }]}>
        <Footer date={n.date} />
        <View>
          <Text style={[styles.num, { fontSize: story ? size : size * 0.72, lineHeight: (story ? size : size * 0.72) * 0.95 }]}>
            {n.distance}
          </Text>
          <Text style={[styles.unit, { fontSize: 26, color: colors.paper, marginTop: -4 }]}>kilometres</Text>
        </View>
        <View style={[styles.row3, { borderTopWidth: 1, borderTopColor: colors.paper, paddingTop: 12 }]}>
          <Num value={n.time} size={story ? 28 : 22} />
          <Num value={n.rate} unit={n.rateUnit} size={story ? 28 : 22} />
          <Num value={n.climb} unit="m" size={story ? 28 : 22} />
        </View>
      </View>
    </View>
  );
}

/** The route laid on a receding grid floor — the app's road view, frozen. */
function FloorCard({ ride, track, format }: Part) {
  const n = numbers(ride);
  const story = format === 'story';
  const H = cardHeight(format);
  const top = story ? 250 : 150;
  const floorH = H - top;
  const horizon = story ? 40 : 24;
  const project = floorProjector(CARD_W, floorH, horizon);
  const pts = projectFloor(track, CARD_W, floorH, horizon);
  const grid: { a: [number, number]; b: [number, number] }[] = [];
  for (let v = 0; v <= 1.6; v += 0.1) grid.push({ a: project(-3, v), b: project(3, v) });
  for (let u = -3; u <= 3; u += 0.25) grid.push({ a: project(u, -0.1), b: project(u, 4) });
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.pad, { height: top, justifyContent: 'space-between' }]}>
        <Footer date={n.date} />
        <View style={{ gap: 6 }}>
          <Num value={n.distance} unit="km" size={story ? 84 : 52} />
          <View style={styles.row3}>
            <Num value={n.time} size={story ? 26 : 20} />
            <Num value={n.rate} unit={n.rateUnit} size={story ? 26 : 20} />
            <Num value={n.climb} unit="m" size={story ? 26 : 20} />
          </View>
        </View>
      </View>
      <Svg width={CARD_W} height={floorH}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.ink} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.ink} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={horizon} width={CARD_W} height={floorH - horizon} fill={colors.asphalt} />
        {grid.map((g, i) => (
          <Line key={i} x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]} stroke={colors.kerb} strokeWidth={1} />
        ))}
        <Route pts={pts} width={3.5} />
        <Rect x={0} y={0} width={CARD_W} height={horizon + floorH * 0.22} fill="url(#fade)" />
      </Svg>
    </View>
  );
}

/** Transparent PNG to lay over your own photo: white route and numbers only. */
function StickerCard({ ride, track, format }: Part) {
  const n = numbers(ride);
  const story = format === 'story';
  const mapH = story ? 300 : 170;
  const pts = projectFlat(track, CARD_W, mapH, 48);
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
      <Svg width={CARD_W} height={mapH}>
        <Route pts={pts} color={colors.paper} width={4} glow={false} ends={false} />
      </Svg>
      <View style={[styles.pad, { alignItems: 'center', gap: 6 }]}>
        <Num value={n.distance} unit="km" size={story ? 80 : 52} shadow />
        <View style={[styles.row3, { justifyContent: 'center', gap: 22 }]}>
          <Num value={n.time} size={story ? 26 : 20} shadow />
          <Num value={n.rate} unit={n.rateUnit} size={story ? 26 : 20} shadow />
        </View>
        <View style={{ marginTop: 10 }}>
          <Mark size={20} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 28, paddingVertical: 24 },
  numRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  num: { color: colors.paper, fontFamily: fonts.num, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: fonts.numMedium },
  row3: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: fonts.body, fontSize: 13 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
});
