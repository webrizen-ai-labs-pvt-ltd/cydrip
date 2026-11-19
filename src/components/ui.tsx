import * as Haptics from 'expo-haptics';
import { ReactNode, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, type } from '@/theme';

/** A number with its unit, and a quiet label underneath. */
export function Metric({
  value,
  unit,
  label,
  size = type.stat,
  style,
}: {
  value: string;
  unit?: string;
  label: string;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1 }, style]} accessible accessibilityLabel={`${label} ${value} ${unit ?? ''}`}>
      <View style={s.valueRow}>
        <Text style={[s.value, { fontSize: size, lineHeight: size * 1.05 }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={[s.unit, { fontSize: Math.max(13, size * 0.42) }]}>{unit}</Text> : null}
      </View>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export function Hairline({ style }: { style?: ViewStyle }) {
  return <View style={[s.hairline, style]} />;
}

export function ScreenTitle({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return (
    <Text style={[s.title, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Two or three mutually exclusive choices, e.g. Ride / Run. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.seg, style]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[s.segItem, on && s.segOn]}
          >
            <Text style={[s.segText, { color: on ? colors.ink : colors.fog }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Label on the left, value on the right — for totals and bests. */
export function DefRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={s.defRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.defLabel}>{label}</Text>
        {detail ? <Text style={s.defDetail}>{detail}</Text> : null}
      </View>
      <Text style={s.defValue}>{value}</Text>
    </View>
  );
}

/** A row that opens a web page in the phone's browser. */
export function LinkRow({ label, detail, url }: { label: string; detail?: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Opens in your browser"
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [s.defRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.defLabel}>{label}</Text>
        {detail ? <Text style={s.defDetail}>{detail}</Text> : null}
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.fog} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 17 17 7M9 7h8v8" />
      </Svg>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  icon?: ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        primary ? s.buttonPrimary : s.buttonQuiet,
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {icon}
      <Text style={[s.buttonText, { color: primary ? colors.ink : colors.paper }]}>{title}</Text>
    </Pressable>
  );
}

/**
 * Press-and-hold to confirm. Used for finishing a ride so a bump in the road
 * can't end it by accident. The fill shows how long is left to hold.
 */
export function HoldButton({
  title,
  holdingTitle,
  onComplete,
  color = colors.rec,
  duration = 1100,
  style,
}: {
  title: string;
  holdingTitle: string;
  onComplete: () => void;
  color?: string;
  duration?: number;
  style?: ViewStyle;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const holding = useRef(false);
  const [isHolding, setHolding] = useState(false);

  function begin() {
    holding.current = true;
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished && holding.current) {
          holding.current = false;
          setHolding(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          progress.setValue(0);
          onComplete();
        }
      },
    );
  }

  function cancel() {
    holding.current = false;
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }

  const width = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), [progress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Press and hold to confirm"
      onPressIn={begin}
      onPressOut={cancel}
      style={[s.button, s.hold, { borderColor: color }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, width }]} />
      <Text style={[s.buttonText, { color: colors.paper }]}>{isHolding ? holdingTitle : title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { color: colors.paper, fontFamily: fonts.num, fontVariant: ['tabular-nums'] },
  unit: { color: colors.fog, fontFamily: fonts.numMedium },
  label: { color: colors.fog, fontFamily: fonts.body, fontSize: type.caption, marginTop: 2 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.kerb },
  title: { color: colors.paper, fontFamily: fonts.numBold, fontSize: 40, lineHeight: 44 },
  defRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  defLabel: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: type.body },
  defDetail: { color: colors.fog, fontFamily: fonts.body, fontSize: type.caption, marginTop: 2 },
  defValue: { color: colors.paper, fontFamily: fonts.num, fontSize: 24, fontVariant: ['tabular-nums'] },
  button: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  buttonPrimary: { backgroundColor: colors.paper },
  buttonQuiet: { borderWidth: 1, borderColor: colors.kerb },
  hold: { borderWidth: 1.5 },
  seg: { flexDirection: 'row', backgroundColor: colors.asphalt, borderRadius: 999, padding: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.paper },
  segText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 17 },
});
