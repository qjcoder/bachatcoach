/**
 * Generate BachatCoach icons and splash screens from logo-source.jpg
 * Run: npm run generate-icons
 */
import { createRequire } from 'module';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../assets/images');
const sourcePath = join(outDir, 'logo-source.jpg');
const iconSourcePath = join(outDir, 'icon-source.jpg');
const splashSourcePath = join(outDir, 'logo-splash-source.png');
const iosAppIcon = join(
  __dirname,
  '../ios/BachatCoach/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'
);
const iosSplashDir = join(__dirname, '../ios/BachatCoach/Images.xcassets/SplashScreenLogo.imageset');

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

  /**
   * Full-bleed square app mark: trim white margins, slight zoom so the B
   * fills the iOS icon tile (Apple's mask still rounds corners).
   */
  async function buildIconMark() {
    const raw = existsSync(iconSourcePath) ? iconSourcePath : sourcePath;
    const trimmed = await sharp(raw)
      .trim({ background: '#FFFFFF', threshold: 18 })
      .png()
      .toBuffer();

    const tMeta = await sharp(trimmed).metadata();
    const side = Math.max(tMeta.width || 1, tMeta.height || 1);
    // Stronger zoom so home-screen icon doesn't look like a tiny logo on white.
    const zoom = 1.22;
    const draw = Math.round(side / zoom);

    const covered = await sharp(trimmed)
      .resize(draw, draw, {
        fit: 'cover',
        position: 'centre',
        background: '#FFFFFF',
      })
      .png()
      .toBuffer();

    return sharp({
      create: { width: 1024, height: 1024, channels: 3, background: ICON_BG },
    })
      .composite([{ input: await sharp(covered).resize(1024, 1024).png().toBuffer(), gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  const iconBuffer = await buildIconMark();
  const fullBuffer = await knockOutNearBlack(sourcePath);

  writeFileSync(join(outDir, 'logo-icon.png'), iconBuffer);
  writeFileSync(join(outDir, 'logo-full.png'), fullBuffer);
  console.log('✓ logo-icon.png');
  console.log('✓ logo-full.png');

  const fullMeta = await sharp(fullBuffer).metadata();

  async function resizeIcon(w, h, { pad = 0.02, bg = null } = {}) {
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

    const taglineSvg = Buffer.from(`
      <svg width="${logoW}" height="72">
        <text x="50%" y="42" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif"
          font-size="28" font-weight="700" letter-spacing="3"
          fill="#D1D5DB">PLAN · SAVE · GROW</text>
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

  /**
   * Native / Expo splash mark: trim empty black margins so the logo reads large,
   * then render on transparent (storyboard supplies black background).
   */
  async function splashLogoAsset() {
    const splashSrc = existsSync(splashSourcePath) ? splashSourcePath : sourcePath;
    const trimmed = await sharp(splashSrc)
      .trim({ threshold: 12 })
      .png()
      .toBuffer();
    const meta = await sharp(trimmed).metadata();
    const w = 1200;
    const h = Math.max(1, Math.round(((meta.height || 1) / (meta.width || 1)) * w));
    return sharp(trimmed)
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  const splashLogoBuf = await splashLogoAsset();
  const splashMeta = await sharp(splashLogoBuf).metadata();
  const splashAspect = `${splashMeta.width}:${splashMeta.height}`;

  const assets = [
    { name: 'icon.png', buf: () => resizeIcon(1024, 1024, { pad: 0.02, bg: ICON_BG }) },
    { name: 'splash-icon.png', buf: () => resizeIcon(288, 288, { pad: 0.03 }) },
    { name: 'splash-logo.png', buf: async () => splashLogoBuf },
    { name: 'favicon.png', buf: () => resizeIcon(48, 48, { pad: 0.03, bg: ICON_BG }) },
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
      buf: async () => {
        const mono = await sharp(iconBuffer)
          .resize(340, 340, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
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

  // Keep native iOS assets in sync (Release builds do not re-run Expo prebuild).
  if (existsSync(dirname(iosAppIcon))) {
    const iconPng = await resizeIcon(1024, 1024, { pad: 0.02, bg: ICON_BG });
    writeFileSync(iosAppIcon, iconPng);
    console.log('✓ ios AppIcon');
  }
  if (existsSync(iosSplashDir)) {
    const w1 = 400;
    const h1 = Math.round(((splashMeta.height || 1) / (splashMeta.width || 1)) * w1);
    const s1 = await sharp(splashLogoBuf).resize(w1, h1).png().toBuffer();
    const s2 = await sharp(splashLogoBuf).resize(w1 * 2, h1 * 2).png().toBuffer();
    const s3 = await sharp(splashLogoBuf).resize(w1 * 3, h1 * 3).png().toBuffer();
    writeFileSync(join(iosSplashDir, 'image.png'), s1);
    writeFileSync(join(iosSplashDir, 'image@2x.png'), s2);
    writeFileSync(join(iosSplashDir, 'image@3x.png'), s3);
    console.log(`✓ ios SplashScreenLogo (${splashAspect})`);
  }

  // Hint for storyboard / app.json consumers
  writeFileSync(
    join(outDir, 'splash-logo.meta.json'),
    JSON.stringify(
      { width: splashMeta.width, height: splashMeta.height, aspect: splashAspect },
      null,
      2
    )
  );

  console.log('\nBrand assets generated from logo-source.jpg');
}

main().catch(console.error);
