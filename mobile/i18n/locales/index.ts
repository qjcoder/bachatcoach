import en from './en.json';
import ur from './ur.json';
import roman from './roman.json';

/** Eager core locales — keep startup JS light. Others load on demand. */
export const localeTranslations: Record<string, Record<string, unknown>> = {
  en,
  ur,
  roman,
};

const loaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  af: () => import('./af.json'),
  am: () => import('./am.json'),
  ar: () => import('./ar.json'),
  az: () => import('./az.json'),
  bg: () => import('./bg.json'),
  bn: () => import('./bn.json'),
  cs: () => import('./cs.json'),
  da: () => import('./da.json'),
  de: () => import('./de.json'),
  el: () => import('./el.json'),
  es: () => import('./es.json'),
  fa: () => import('./fa.json'),
  fi: () => import('./fi.json'),
  fil: () => import('./fil.json'),
  fr: () => import('./fr.json'),
  gu: () => import('./gu.json'),
  ha: () => import('./ha.json'),
  he: () => import('./he.json'),
  hi: () => import('./hi.json'),
  hr: () => import('./hr.json'),
  hu: () => import('./hu.json'),
  id: () => import('./id.json'),
  it: () => import('./it.json'),
  ja: () => import('./ja.json'),
  km: () => import('./km.json'),
  kn: () => import('./kn.json'),
  ko: () => import('./ko.json'),
  ku: () => import('./ku.json'),
  ml: () => import('./ml.json'),
  mr: () => import('./mr.json'),
  ms: () => import('./ms.json'),
  my: () => import('./my.json'),
  ne: () => import('./ne.json'),
  nl: () => import('./nl.json'),
  no: () => import('./no.json'),
  pa: () => import('./pa.json'),
  pl: () => import('./pl.json'),
  ps: () => import('./ps.json'),
  pt: () => import('./pt.json'),
  ro: () => import('./ro.json'),
  ru: () => import('./ru.json'),
  sd: () => import('./sd.json'),
  si: () => import('./si.json'),
  sk: () => import('./sk.json'),
  so: () => import('./so.json'),
  sq: () => import('./sq.json'),
  sr: () => import('./sr.json'),
  sv: () => import('./sv.json'),
  sw: () => import('./sw.json'),
  ta: () => import('./ta.json'),
  te: () => import('./te.json'),
  th: () => import('./th.json'),
  tr: () => import('./tr.json'),
  uk: () => import('./uk.json'),
  uz: () => import('./uz.json'),
  vi: () => import('./vi.json'),
  yo: () => import('./yo.json'),
  zh: () => import('./zh.json'),
  zu: () => import('./zu.json'),
};

const loading = new Map<string, Promise<Record<string, unknown>>>();

/** Ensure a locale pack is available (no-op if already loaded / core). */
export async function ensureLocaleLoaded(code: string): Promise<Record<string, unknown> | null> {
  const key = String(code || 'en').toLowerCase();
  if (localeTranslations[key]) return localeTranslations[key];
  const loader = loaders[key];
  if (!loader) return null;

  let pending = loading.get(key);
  if (!pending) {
    pending = loader()
      .then((mod) => {
        const data = mod.default || (mod as unknown as Record<string, unknown>);
        localeTranslations[key] = data;
        loading.delete(key);
        return data;
      })
      .catch((err) => {
        loading.delete(key);
        throw err;
      });
    loading.set(key, pending);
  }
  return pending;
}
