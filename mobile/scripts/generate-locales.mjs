/**
 * Generate locale JSON files from en.json using Google Translate (gtx).
 * Run: node scripts/generate-locales.mjs [--force]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, '../i18n');
const LOCALES_DIR = path.join(I18N_DIR, 'locales');
const FORCE = process.argv.includes('--force');

const SOURCE = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));

const CODES = [
  'en', 'ur', 'roman', 'hi', 'bn', 'pa', 'sd', 'ps', 'ne', 'si', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
  'ar', 'fa', 'tr', 'he', 'ku', 'az', 'uz', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk', 'ro',
  'el', 'sv', 'no', 'da', 'fi', 'cs', 'hu', 'sk', 'bg', 'sr', 'hr', 'sq', 'zh', 'ja', 'ko', 'id', 'ms',
  'th', 'vi', 'fil', 'my', 'km', 'sw', 'am', 'ha', 'yo', 'zu', 'af', 'so',
];

const TL_MAP = {
  fil: 'tl',
  no: 'no',
  zh: 'zh-CN',
};

const KEEP_LITERAL = new Set(['BachatCoach', 'JazzCash', 'EasyPaisa', 'PKR', '₨', 'Face ID']);

function flatten(obj, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flatten(value, fullKey));
    } else {
      entries.push({ key: fullKey, value: String(value) });
    }
  }
  return entries;
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

const SEP = '\n###\n';

async function translateBatch(texts, target) {
  if (!texts.length) return [];
  if (texts.length === 1) {
    const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: texts[0] });
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
    if (!res.ok) throw new Error(`Translate failed (${res.status}) for ${target}`);
    const data = await res.json();
    return [data[0]?.[0]?.[0] ?? texts[0]];
  }

  const combined = texts.join(SEP);
  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: combined });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!res.ok) throw new Error(`Translate failed (${res.status}) for ${target}`);
  const data = await res.json();
  const translated = data[0]?.map((chunk) => chunk?.[0] ?? '').join('') ?? '';
  const parts = translated.split(SEP);
  if (parts.length !== texts.length) {
    throw new Error(`Split mismatch for ${target}: got ${parts.length}, expected ${texts.length}`);
  }
  return parts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateLocale(targetCode) {
  const tl = TL_MAP[targetCode] ?? targetCode;
  const output = JSON.parse(JSON.stringify(SOURCE));
  const flat = flatten(SOURCE);
  const batchSize = 20;

  for (let i = 0; i < flat.length; i += batchSize) {
    const slice = flat.slice(i, i + batchSize);
    const pending = [];

    for (const entry of slice) {
      if (KEEP_LITERAL.has(entry.value)) continue;
      pending.push(entry);
    }

    if (!pending.length) continue;

    const texts = pending.map((p) => p.value);
    const results = await translateBatch(texts, tl);
    pending.forEach((entry, idx) => {
      const translated = results[idx]?.trim();
      if (translated) setByPath(output, entry.key, translated);
    });
    await sleep(400);
  }

  return output;
}

function copyHandMaintained(code) {
  const src = path.join(I18N_DIR, `${code}.json`);
  const dest = path.join(LOCALES_DIR, `${code}.json`);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${code}.json`);
}

function writeIndex(codes) {
  const imports = codes.map((c) => `import ${c.replace(/-/g, '_')} from './${c}.json';`).join('\n');
  const entries = codes.map((c) => `  ${c}: ${c.replace(/-/g, '_')},`).join('\n');
  const content = `${imports}\n\nexport const localeTranslations = {\n${entries}\n} as const;\n\nexport type LocaleCode = keyof typeof localeTranslations;\n`;
  fs.writeFileSync(path.join(LOCALES_DIR, 'index.ts'), content);
  console.log('Wrote locales/index.ts');
}

function keyCount(obj) {
  let n = 0;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') n += keyCount(v);
    else n++;
  }
  return n;
}

async function main() {
  fs.mkdirSync(LOCALES_DIR, { recursive: true });
  const expected = keyCount(SOURCE);

  copyHandMaintained('en');
  copyHandMaintained('ur');
  copyHandMaintained('roman');

  for (const code of CODES) {
    if (['en', 'ur', 'roman'].includes(code)) continue;
    const outPath = path.join(LOCALES_DIR, `${code}.json`);
    if (fs.existsSync(outPath) && !FORCE) {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (keyCount(existing) >= expected - 5) {
        console.log(`Skip complete ${code}.json`);
        continue;
      }
    }
    try {
      console.log(`Translating ${code}...`);
      const json = await translateLocale(code);
      if (keyCount(json) < expected - 5) {
        throw new Error(`Incomplete translation (${keyCount(json)}/${expected} keys)`);
      }
      fs.writeFileSync(outPath, `${JSON.stringify(json, null, 2)}\n`);
      console.log(`Wrote ${code}.json (${keyCount(json)} keys)`);
      await sleep(500);
    } catch (err) {
      console.error(`Failed ${code}:`, err.message);
      process.exitCode = 1;
    }
  }

  const existing = fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
  writeIndex(existing.sort());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
