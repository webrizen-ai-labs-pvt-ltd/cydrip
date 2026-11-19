import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CARD_W, cardHeight, SNAP_STYLES, SnapCard, SnapFormat, SnapStyle } from '@/components/SnapCard';
import { Button, Segmented } from '@/components/ui';
import { getPoints, getRide, Ride } from '@/lib/db';
import { captureCard, saveImage, shareImage, SnapUnavailableError } from '@/lib/snapExport';
import { colors, fonts, space } from '@/theme';

export default function SnapScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const rideId = Number(id);
  const { width, height } = useWindowDimensions();
  const [ride, setRide] = useState<Ride | null>(null);
  const [track, setTrack] = useState<[number, number][]>([]);
  const [style, setStyle] = useState<SnapStyle>('line');
  const [format, setFormat] = useState<SnapFormat>('story');
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    getRide(rideId).then(setRide);
    getPoints(rideId).then((pts) => setTrack(pts.map((p) => [p.lat, p.lon])));
  }, [rideId]);

  // Preview: the full-size card scaled to fit; capture uses the unscaled card inside.
  const H = cardHeight(format);
  const maxH = height * (format === 'story' ? 0.56 : 0.44);
  const scale = Math.min((width - space.lg * 2) / CARD_W, maxH / H, 1);
  const preview = useMemo(() => ({ w: CARD_W * scale, h: H * scale }), [scale, H]);

  function close() {
    if (fresh) router.replace({ pathname: '/ride/[id]', params: { id: String(rideId) } });
    else router.back();
  }

  async function run(kind: 'share' | 'save') {
    if (busy) return;
    setBusy(kind);
    try {
      const uri = await captureCard(cardRef, 1080, format === 'story' ? 1920 : 1080);
      if (kind === 'share') await shareImage(uri);
      else {
        const result = await saveImage(uri);
        if (result === 'denied') {
          Alert.alert('Allow photos to save', 'CyDrip needs permission to add images to your gallery.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Saved to your gallery');
        }
      }
    } catch (e) {
      const msg = e instanceof SnapUnavailableError || e instanceof Error ? e.message : String(e);
      Alert.alert(kind === 'share' ? "Couldn't share" : "Couldn't save", msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={s.header}>
        <Text style={s.title}>Snap</Text>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={fresh ? 'Done' : 'Close'}>
          {fresh ? (
            <Text style={s.done}>Done</Text>
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6L6 18" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.previewWrap, { width: preview.w, height: preview.h }, style === 'sticker' && s.checker]}>
          {ride ? (
            <View
              style={{
                position: 'absolute',
                width: CARD_W,
                height: H,
                left: (preview.w - CARD_W) / 2,
                top: (preview.h - H) / 2,
                transform: [{ scale }],
              }}
            >
              <View ref={cardRef} collapsable={false}>
                <SnapCard ride={ride} track={track} style={style} format={format} />
              </View>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.styles}>
          {SNAP_STYLES.map((o) => {
            const on = o.value === style;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setStyle(o.value)}
                style={[s.chip, on && s.chipOn]}
              >
                <Text style={[s.chipText, { color: on ? colors.ink : colors.paper }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Segmented
          options={[
            { value: 'story', label: 'Story' },
            { value: 'square', label: 'Square' },
          ]}
          value={format}
          onChange={setFormat}
          style={{ alignSelf: 'stretch' }}
        />
      </ScrollView>

      <View style={s.actions}>
        <Button
          title={busy === 'save' ? 'Saving…' : 'Save'}
          variant="quiet"
          onPress={() => run('save')}
          disabled={!ride || busy != null}
          style={{ flex: 1 }}
        />
        <Button
          title={busy === 'share' ? 'Sharing…' : 'Share'}
          onPress={() => run('share')}
          disabled={!ride || busy != null}
          style={{ flex: 1.4 }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { color: colors.paper, fontFamily: fonts.numBold, fontSize: 28 },
  done: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 17 },
  body: { alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingBottom: space.lg },
  previewWrap: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kerb,
    backgroundColor: colors.ink,
  },
  // Stand-in "photo" behind the transparent sticker so you can see what it will look like.
  checker: { backgroundColor: '#3A4250' },
  styles: { gap: space.sm, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.kerb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
});
