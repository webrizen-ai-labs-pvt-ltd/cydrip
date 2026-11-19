import { TurboModuleRegistry } from 'react-native';

/**
 * True when the installed app binary includes MapLibre's native code. An APK built before the map
 * was added doesn't, and importing the library there would crash on launch — so the map is only
 * loaded when this is true, and the app falls back to the simple road view otherwise.
 */
export const MAP_AVAILABLE = TurboModuleRegistry.get('MLRNCameraModule') != null;
