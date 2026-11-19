// Capturing the snap card and handing it to the share sheet or the gallery.
// The native modules are required lazily: on an app binary built before they were added, the
// snap screen still opens and these functions throw a clear error instead of crashing the app.
import type { ComponentRef, RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';

export class SnapUnavailableError extends Error {
  constructor() {
    super('Sharing needs the latest CyDrip app. Install the newest APK to share snaps.');
  }
}

function load<T>(get: () => T): T {
  try {
    return get();
  } catch {
    throw new SnapUnavailableError();
  }
}

/** Renders the card to a PNG file at full resolution (1080 px wide). */
export async function captureCard(ref: RefObject<ComponentRef<typeof View> | null>, widthPx: number, heightPx: number): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { captureRef } = load(() => require('react-native-view-shot') as typeof import('react-native-view-shot'));
  const ratio = PixelRatio.get();
  return captureRef(ref as never, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: widthPx / ratio,
    height: heightPx / ratio,
  });
}

export async function shareImage(uri: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = load(() => require('expo-sharing') as typeof import('expo-sharing'));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share snap' });
}

/** Saves to the phone's gallery. Asks only for permission to add photos, not to read them. */
export async function saveImage(uri: string): Promise<'saved' | 'denied'> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Media = load(() => require('expo-media-library') as typeof import('expo-media-library'));
  const perm = await Media.requestPermissionsAsync(true, ['photo']);
  if (!perm.granted) return 'denied';
  await Media.Asset.create(uri);
  return 'saved';
}
