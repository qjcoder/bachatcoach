import af from './af.json';
import am from './am.json';
import ar from './ar.json';
import az from './az.json';
import bg from './bg.json';
import bn from './bn.json';
import cs from './cs.json';
import da from './da.json';
import de from './de.json';
import el from './el.json';
import en from './en.json';
import es from './es.json';
import fa from './fa.json';
import fi from './fi.json';
import fil from './fil.json';
import fr from './fr.json';
import gu from './gu.json';
import ha from './ha.json';
import he from './he.json';
import hi from './hi.json';
import hr from './hr.json';
import hu from './hu.json';
import id from './id.json';
import it from './it.json';
import ja from './ja.json';
import km from './km.json';
import kn from './kn.json';
import ko from './ko.json';
import ku from './ku.json';
import ml from './ml.json';
import mr from './mr.json';
import ms from './ms.json';
import my from './my.json';
import ne from './ne.json';
import nl from './nl.json';
import no from './no.json';
import pa from './pa.json';
import pl from './pl.json';
import ps from './ps.json';
import pt from './pt.json';
import ro from './ro.json';
import roman from './roman.json';
import ru from './ru.json';
import sd from './sd.json';
import si from './si.json';
import sk from './sk.json';
import so from './so.json';
import sq from './sq.json';
import sr from './sr.json';
import sv from './sv.json';
import sw from './sw.json';
import ta from './ta.json';
import te from './te.json';
import th from './th.json';
import tr from './tr.json';
import uk from './uk.json';
import ur from './ur.json';
import uz from './uz.json';
import vi from './vi.json';
import yo from './yo.json';
import zh from './zh.json';
import zu from './zu.json';

export const localeTranslations = {
  af: af,
  am: am,
  ar: ar,
  az: az,
  bg: bg,
  bn: bn,
  cs: cs,
  da: da,
  de: de,
  el: el,
  en: en,
  es: es,
  fa: fa,
  fi: fi,
  fil: fil,
  fr: fr,
  gu: gu,
  ha: ha,
  he: he,
  hi: hi,
  hr: hr,
  hu: hu,
  id: id,
  it: it,
  ja: ja,
  km: km,
  kn: kn,
  ko: ko,
  ku: ku,
  ml: ml,
  mr: mr,
  ms: ms,
  my: my,
  ne: ne,
  nl: nl,
  no: no,
  pa: pa,
  pl: pl,
  ps: ps,
  pt: pt,
  ro: ro,
  roman: roman,
  ru: ru,
  sd: sd,
  si: si,
  sk: sk,
  so: so,
  sq: sq,
  sr: sr,
  sv: sv,
  sw: sw,
  ta: ta,
  te: te,
  th: th,
  tr: tr,
  uk: uk,
  ur: ur,
  uz: uz,
  vi: vi,
  yo: yo,
  zh: zh,
  zu: zu,
} as const;

export type LocaleCode = keyof typeof localeTranslations;
