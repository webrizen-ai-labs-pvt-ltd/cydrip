// 3D street map on Android/iOS. The MapLibre implementation is required lazily so an app binary
// without the native module (an older APK) still launches; callers check MAP_AVAILABLE first.
import type { ComponentType } from 'react';

import { MAP_AVAILABLE } from './available';
import type { StreetMapProps } from './types';

const Impl: ComponentType<StreetMapProps> | null = MAP_AVAILABLE
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./NativeStreetMap').NativeStreetMap
  : null;

export function StreetMap(props: StreetMapProps) {
  return Impl ? <Impl {...props} /> : null;
}
