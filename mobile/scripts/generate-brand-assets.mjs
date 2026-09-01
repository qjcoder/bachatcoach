/**
 * Generate BachatCoach brand icons and splash screens (PNG)
 * Run: npm run generate-icons
 */
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../assets/images');

const PRIMARY = '#059669';
const PRIMARY_DARK = '#047857';
const PRIMARY_DEEP = '#065F46';
const ACCENT = '#10B981';
const WHITE = '#FFFFFF';

function logoBlock(size, { monochrome = false, onDark = false } = {}) {
  const markColor = monochrome ? PRIMARY : onDark ? PRIMARY : WHITE;
  const bgColor = monochrome ? WHITE : onDark ? WHITE : PRIMARY;
  const textColor = monochrome ? PRIMARY : onDark ? PRIMARY : WHITE;
  const subColor = monochrome ? PRIMARY_DARK : onDark ? PRIMARY_DARK : 'rgba(255,255,255,0.85)';
  const radius = size * 0.18;
  const inner = size * 0.22;

  return `
    <rect width="100%" height="100%" fill="${bgColor}" rx="${radius}"/>
    <rect x="${size * 0.22}" y="${size * 0.2}" width="${size * 0.56}" height="${size * 0.56}" rx="${inner}" fill="${onDark ? PRIMARY : WHITE}" opacity="0.98"/>
    <text x="50%" y="${size * 0.54}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="800"
      font-size="${size * 0.18}" fill="${markColor}">BC</text>
    <text x="50%" y="${size * 0.78}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="700"
      font-size="${size * 0.07}" fill="${textColor}">BachatCoach</text>
    <text x="50%" y="${size * 0.9}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="500"
      font-size="${size * 0.045}" fill="${subColor}">Track. Save. Grow.</text>
  `;
}

function splashBlock(width, height) {
  const logoSize = Math.min(width, height) * 0.28;
  const cx = width / 2;
  const cy = height * 0.42;

  return `
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${ACCENT}"/>
        <stop offset="45%" stop-color="${PRIMARY}"/>
        <stop offset="100%" stop-color="${PRIMARY_DEEP}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.85}" cy="${height * 0.12}" r="${width * 0.18}" fill="rgba(255,255,255,0.08)"/>
    <circle cx="${width * 0.1}" cy="${height * 0.78}" r="${width * 0.22}" fill="rgba(255,255,255,0.06)"/>
    <circle cx="${width * 0.7}" cy="${height * 0.88}" r="${width * 0.12}" fill="rgba(255,255,255,0.05)"/>
    <g transform="translate(${cx - logoSize / 2}, ${cy - logoSize / 2})">
      <svg width="${logoSize}" height="${logoSize}" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <rect x="18" y="18" width="64" height="64" rx="18" fill="${WHITE}"/>
        <text x="50" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="28" fill="${PRIMARY}">BC</text>
      </svg>
    </g>
    <text x="50%" y="${cy + logoSize * 0.72}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="800"
      font-size="${width * 0.08}" fill="${WHITE}">BachatCoach</text>
    <text x="50%" y="${cy + logoSize * 0.98}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="500"
      font-size="${width * 0.032}" fill="rgba(255,255,255,0.88)">"Small savings today become big dreams tomorrow."</text>
  `;
}

async function main() {
  let sharp;
  try {
    const require = createRequire(import.meta.url);
    sharp = require('sharp');
  } catch {
    console.error('Install sharp first: npm install --save-dev sharp');
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const assets = [
    { name: 'icon.png', w: 1024, h: 1024, body: logoBlock(1024) },
    { name: 'splash-icon.png', w: 512, h: 512, body: logoBlock(512, { onDark: true }) },
    { name: 'favicon.png', w: 48, h: 48, body: logoBlock(48) },
    {
      name: 'android-icon-foreground.png',
      w: 432,
      h: 432,
      body: logoBlock(432, { onDark: true }),
    },
    {
      name: 'android-icon-background.png',
      w: 432,
      h: 432,
      body: `<rect width="100%" height="100%" fill="${PRIMARY}"/>`,
    },
    {
      name: 'android-icon-monochrome.png',
      w: 432,
      h: 432,
      body: logoBlock(432, { monochrome: true }),
    },
    { name: 'splash.png', w: 1284, h: 2778, body: splashBlock(1284, 2778) },
    { name: 'splash-tablet.png', w: 2048, h: 2732, body: splashBlock(2048, 2732) },
  ];

  for (const { name, w, h, body } of assets) {
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(outDir, name), buffer);
    console.log(`✓ ${name} (${w}x${h})`);
  }

  console.log('\nBrand assets generated in assets/images/');
}

main().catch(console.error);
