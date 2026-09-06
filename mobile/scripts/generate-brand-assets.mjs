/**
 * Generate BachatCoach icons and splash screens from logo-source.jpg
 * Run: npm run generate-icons
 */
import { createRequire } from 'module';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../assets/images');
const sourcePath = join(outDir, 'logo-source.jpg');
const iconSourcePath = join(outDir, 'icon-source.jpg');

const SPLASH_BG = '#000000';
const ANDROID_BG = '#FFFFFF';
const ICON_BG = '#FFFFFF';

async function main() {
  let sharp;
  try {
    const require = createRequire(import.meta.url);
    sharp = require('sharp');
  } catch {
    console.error('Install sharp first: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!existsSync(sourcePath)) {
    console.error('Missing logo-source.jpg in assets/images/');
    process.exit(1);
  }

  async function knockOutNearBlack(filePath) {
    const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 28 && g < 28 && b < 28) {
        data[i + 3] = 0;
      }
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .trim({ threshold: 8 })
      .toBuffer();
  }

  mkdirSync(outDir, { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  const size = Math.min(meta.width, meta.height);

  const iconSize = Math.round(size * 0.62);
  const iconTop = Math.round(size * 0.02);
  const iconLeft = Math.round((size - iconSize) / 2);

  const iconBuffer = existsSync(iconSourcePath)
    ? await sharp(iconSourcePath)
        .resize(1024, 1024, { fit: 'contain', background: '#FFFFFF' })
        .flatten({ background: '#FFFFFF' })
        .png()
        .toBuffer()
    : await sharp(sourcePath)
        .extract({ left: iconLeft, top: iconTop, width: iconSize, height: iconSize })
        .png()
        .toBuffer();

  const fullBuffer = await knockOutNearBlack(sourcePath);

  writeFileSync(join(outDir, 'logo-icon.png'), iconBuffer);
  writeFileSync(join(outDir, 'logo-full.png'), fullBuffer);
  console.log('✓ logo-icon.png');
  console.log('✓ logo-full.png');

  const fullMeta = await sharp(fullBuffer).metadata();

  async function resizeIcon(w, h, { pad = 0.12, bg = null } = {}) {
    const inner = Math.round(Math.min(w, h) * (1 - pad * 2));
    const resized = await sharp(iconBuffer).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
    if (bg) {
      return sharp({
        create: { width: w, height: h, channels: 4, background: bg },
      })
        .composite([{ input: resized, gravity: 'centre' }])
        .png()
        .toBuffer();
    }
    return sharp({
      create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: resized, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  async function splashWithLogo(w, h) {
    const logoW = Math.round(w * 0.78);
    const logoH = Math.round((fullMeta.height / fullMeta.width) * logoW);
    const resized = await sharp(fullBuffer).resize(logoW, logoH, { fit: 'inside' }).png().toBuffer();

    // Tagline under the mark for native splash screens
    const taglineSvg = Buffer.from(`
      <svg width="${logoW}" height="72">
        <text x="50%" y="42" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif"
          font-size="28" font-weight="700" letter-spacing="3"
          fill="#D1D5DB">SAVE · PLAN · GROW</text>
      </svg>
    `);
    const taglinePng = await sharp(taglineSvg).png().toBuffer();
    const stackH = logoH + 28 + 72;
    const stack = await sharp({
      create: {
        width: logoW,
        height: stackH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: resized, top: 0, left: 0 },
        { input: taglinePng, top: logoH + 28, left: 0 },
      ])
      .png()
      .toBuffer();

    return sharp({
      create: { width: w, height: h, channels: 3, background: SPLASH_BG },
    })
      .composite([{ input: stack, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  // Full mark + tagline for Expo / iOS native splash image
  async function splashLogoAsset() {
    const w = 840;
    const logoW = w;
    const logoH = Math.round((fullMeta.height / fullMeta.width) * logoW);
    const resized = await sharp(fullBuffer).resize(logoW, logoH, { fit: 'inside' }).png().toBuffer();
    const taglineSvg = Buffer.from(`
      <svg width="${w}" height="90">
        <text x="50%" y="50" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif"
          font-size="36" font-weight="700" letter-spacing="4"
          fill="#D1D5DB">SAVE · PLAN · GROW</text>
      </svg>
    `);
    const taglinePng = await sharp(taglineSvg).png().toBuffer();
    const h = logoH + 36 + 90;
    return sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: resized, top: 0, left: 0 },
        { input: taglinePng, top: logoH + 36, left: 0 },
      ])
      .png()
      .toBuffer();
  }

  const assets = [
    { name: 'icon.png', buf: () => resizeIcon(1024, 1024, { pad: 0.04, bg: ICON_BG }) },
    { name: 'splash-icon.png', buf: () => resizeIcon(288, 288) },
    { name: 'splash-logo.png', buf: () => splashLogoAsset() },
    { name: 'favicon.png', buf: () => resizeIcon(48, 48, { pad: 0.04, bg: ICON_BG }) },
    { name: 'android-icon-foreground.png', buf: () => resizeIcon(432, 432, { pad: 0.12 }) },
    {
      name: 'android-icon-background.png',
      buf: () =>
        sharp({
          create: { width: 432, height: 432, channels: 3, background: ANDROID_BG },
        })
          .png()
          .toBuffer(),
    },
    {
      name: 'android-icon-monochrome.png',
      buf: async () => {
        const mono = await sharp(iconBuffer)
          .resize(320, 320, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .greyscale()
          .threshold(200)
          .png()
          .toBuffer();
        return sharp({
          create: { width: 432, height: 432, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        })
          .composite([{ input: mono, gravity: 'centre' }])
          .png()
          .toBuffer();
      },
    },
    { name: 'splash.png', buf: () => splashWithLogo(1284, 2778) },
    { name: 'splash-tablet.png', buf: () => splashWithLogo(2048, 2732) },
  ];

  for (const { name, buf } of assets) {
    const png = await buf();
    writeFileSync(join(outDir, name), png);
    console.log(`✓ ${name}`);
  }

  console.log('\nBrand assets generated from logo-source.jpg');
}

main().catch(console.error);
