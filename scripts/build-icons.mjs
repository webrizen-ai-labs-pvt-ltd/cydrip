// Generates the app icon, adaptive icon layers, splash, notification icon and favicon from src/brand/logo.ts.
// Run: npm run icons   (Node 22.18+ strips the TS types on import)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { MARK_PATHS } from '../src/brand/logo.ts';

const BLACK = '#000000';
const WHITE = '#FFFFFF';

/** The mark (200×200 units centred on 0,0) placed in a square canvas at `ratio` of its size. */
function mark(size, ratio, color = WHITE) {
  const scale = (size * ratio) / 200;
  const paths = MARK_PATHS.map((d) => `<path d="${d}" fill="${color}"/>`).join('');
  return `<g transform="translate(${size / 2},${size / 2}) scale(${scale})">${paths}</g>`;
}

const svg = (size, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
  (bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : '') +
  body +
  `</svg>`;

async function out(file, markup) {
  await sharp(Buffer.from(markup)).png().toFile(file);
  console.log('wrote', file);
}

mkdirSync('assets/images', { recursive: true });
await out('assets/images/icon.png', svg(1024, mark(1024, 0.46), BLACK));
// Adaptive icon: Android masks to roughly the centre 66%, so the mark stays well inside it.
await out('assets/images/android-icon-foreground.png', svg(512, mark(512, 0.36)));
await out('assets/images/android-icon-background.png', svg(512, '', BLACK));
await out('assets/images/android-icon-monochrome.png', svg(432, mark(432, 0.36)));
await out('assets/images/notification-icon.png', svg(96, mark(96, 0.8)));
await out('assets/images/splash-icon.png', svg(1024, mark(1024, 0.9)));
await out('assets/images/favicon.png', svg(48, mark(48, 0.7), BLACK));
