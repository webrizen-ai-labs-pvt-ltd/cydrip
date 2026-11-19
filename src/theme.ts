// CyDrip design tokens. Instrument-cluster look: true black (matches the mark, saves OLED battery,
// strongest contrast in sunlight), white type, one blue reserved for your route, red only for recording.

export const colors = {
  ink: '#000000', // background
  asphalt: '#141619', // raised surfaces: road view, thumbnails, inputs
  kerb: '#2B2F35', // hairlines and grid
  fog: '#8F959D', // secondary text
  paper: '#F4F5F6', // primary text and primary buttons
  lane: '#3D8BFF', // your route — only ever the route
  rec: '#FF3B30', // recording indicator and destructive actions
  amber: '#FFB020', // weak GPS warning
};

// Barlow was drawn after California highway signage: built for reading at speed.
export const fonts = {
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  numMedium: 'BarlowCondensed_500Medium',
  num: 'BarlowCondensed_600SemiBold',
  numBold: 'BarlowCondensed_700Bold',
};

// Type scale (≈ perfect fourth, 1.333) for UI; ride numerals are sized to the screen.
export const type = {
  caption: 13,
  body: 16,
  title: 21,
  stat: 28,
  display: 48,
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
