import type { ViewStyle } from 'react-native';

import type { Track } from './style';

export type StreetMapProps = {
  /** Route to draw, as [lat, lon] points. */
  track: Track;
  /** Planned route to a destination, drawn under your track, with a pin at its end. */
  plan?: Track | null;
  /**
   * Chase-camera mode: keep this position centred low on screen, tilted, turned to `heading`.
   * Leave out to frame the whole track instead.
   */
  follow?: { lat: number; lon: number; heading: number | null } | null;
  /** Frame the whole planned route (and you) instead of chasing. */
  overview?: boolean;
  /** Allow pan / zoom / tilt. Off on the ride dashboard so bumps don't move the map. */
  interactive?: boolean;
  /** Fade the map (ride paused). */
  dimmed?: boolean;
  style?: ViewStyle;
};
