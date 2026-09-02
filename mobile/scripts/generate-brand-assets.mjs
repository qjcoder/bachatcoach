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

const SPLASH_BG = '#0B1020';
const ANDROID_BG = '#1E3A8A';

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

  mkdirSync(outDir, { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  const size = meta.width;

  const iconSize = Math.round(size * 0.54);
  const iconTop = Math.round(size * 0.04);
  const iconLeft = Math.round((size - iconSize) / 2);

  const iconBuffer = await sharp(sourcePath)
    .extract({ left: iconLeft, top: iconTop, width: iconSize, height: iconSize })
    .png()
    .toBuffer();

  const fullBuffer = await sharp(sourcePath).trim({ threshold: 12 }).png().toBuffer();

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
    const logoW = Math.round(w * 0.72);
    const logoH = Math.round((fullMeta.height / fullMeta.width) * logoW);
    const resized = await sharp(fullBuffer).resize(logoW, logoH, { fit: 'inside' }).png().toBuffer();
    return sharp({
      create: { width: w, height: h, channels: 3, background: SPLASH_BG },
    })
      .composite([{ input: resized, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  const assets = [
    { name: 'icon.png', buf: () => resizeIcon(1024, 1024) },
    { name: 'splash-icon.png', buf: () => resizeIcon(288, 288) },
    { name: 'favicon.png', buf: () => resizeIcon(48, 48) },
    { name: 'android-icon-foreground.png', buf: () => resizeIcon(432, 432, { pad: 0.08 }) },
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
      buf: () =>
        sharp(iconBuffer)
          .resize(320, 320, { fit: 'contain' })
          .negate({ alpha: false })
          .png()
          .toBuffer()
          .then((mono) =>
            sharp({
              create: { width: 432, height: 432, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
            })
              .composite([{ input: mono, gravity: 'centre' }])
              .png()
              .toBuffer()
          ),
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
