import type { ImageSourcePropType } from 'react-native';

/** Brand color + website domain for logo lookup. Local mark only when remote is weak/missing. */

export type BankBrand = {
  color: string;
  domain?: string;
  /** Local asset — only for brands without a good remote mark */
  logo?: ImageSourcePropType;
};

/** Wallets / marks that Clearbit often misses — local assets only. */
const LOCAL_ONLY = {
  jazzcash: require('../assets/banks/jazzcash.png'),
  easypaisa: require('../assets/banks/easypaisa.png'),
  nayapay: require('../assets/banks/nayapay.png'),
  sadapay: require('../assets/banks/sadapay.png'),
  alfalah: require('../assets/banks/bank-alfalah.png'),
  alfalahIslamic: require('../assets/banks/bank-alfalah-islamic.png'),
  ubl: require('../assets/banks/ubl.png'),
  summit: require('../assets/banks/summit-bank.png'),
  nbp: require('../assets/banks/nbp.png'),
  silkbank: require('../assets/banks/silkbank.png'),
  telenor: require('../assets/banks/telenor-microfinance.png'),
  ubank: require('../assets/banks/u-microfinance.png'),
} as const;

/** Keys must match catalog names in banks.ts (lowercase). */
const BRANDS: Record<string, BankBrand> = {
  // Pakistan
  'habib bank limited (hbl)': { color: '#00843D', domain: 'hbl.com' },
  'united bank limited (ubl)': { color: '#0033A0', domain: 'ubldirect.com', logo: LOCAL_ONLY.ubl },
  'mcb bank': { color: '#004B87', domain: 'mcb.com.pk' },
  'allied bank (abl)': { color: '#003DA5', domain: 'abl.com' },
  'bank alfalah': { color: '#E31837', domain: 'bankalfalah.com', logo: LOCAL_ONLY.alfalah },
  'bank alfalah islamic': {
    color: '#0D7377',
    domain: 'bankalfalah.com',
    logo: LOCAL_ONLY.alfalahIslamic,
  },
  'meezan bank': { color: '#8B1A1A', domain: 'meezanbank.com' },
  'askari bank': { color: '#003366', domain: 'askaribank.com' },
  'bank of punjab (bop)': { color: '#006633', domain: 'bop.com.pk' },
  'national bank of pakistan (nbp)': { color: '#006B3F', domain: 'nbp.com.pk', logo: LOCAL_ONLY.nbp },
  'faysal bank': { color: '#7A0019', domain: 'faysalbank.com' },
  'js bank': { color: '#00A3E0', domain: 'jsbl.com' },
  'habib metropolitan bank': { color: '#1B4F72', domain: 'habibmetro.com' },
  'standard chartered pakistan': { color: '#0072AA', domain: 'sc.com' },
  'soneri bank': { color: '#C8102E', domain: 'soneribank.com' },
  silkbank: { color: '#D11F5F', domain: 'silkbank.com.pk', logo: LOCAL_ONLY.silkbank },
  'bankislami pakistan': { color: '#006B3F', domain: 'bankislami.com.pk' },
  'dubai islamic bank pakistan': { color: '#00A651', domain: 'dibpak.com' },
  'al baraka bank (pakistan)': { color: '#009639', domain: 'albaraka.com.pk' },
  'samba bank': { color: '#003DA5', domain: 'samba.com.pk' },
  'the bank of khyber': { color: '#8B0000', domain: 'bok.com.pk' },
  'sindh bank': { color: '#006400', domain: 'sindhbank.com.pk' },
  'first women bank': { color: '#9B1B5C', domain: 'fwbl.com.pk' },
  'bank al habib': { color: '#003366', domain: 'bankalhabib.com' },
  'summit bank': { color: '#E31837', domain: 'summitbank.com.pk', logo: LOCAL_ONLY.summit },
  'industrial and commercial bank of china (icbc)': { color: '#C8102E', domain: 'icbc.com.cn' },
  'citibank pakistan': { color: '#003B70', domain: 'citibank.com' },
  'zarai taraqiati bank (ztbl)': { color: '#2E7D32', domain: 'ztbl.com.pk' },
  'khushhali microfinance bank': { color: '#F15A29', domain: 'khushhalibank.com.pk' },
  'telenor microfinance bank': {
    color: '#00ADEF',
    domain: 'telenorbank.pk',
    logo: LOCAL_ONLY.telenor,
  },
  'mobilink microfinance bank': {
    color: '#ED1C24',
    domain: 'jazzcash.com.pk',
    logo: LOCAL_ONLY.jazzcash,
  },
  'u microfinance bank': {
    color: '#0A6B7C',
    domain: 'ubank.com.pk',
    logo: LOCAL_ONLY.ubank,
  },
  'nrsp microfinance bank': { color: '#007A33', domain: 'nrspbank.com' },

  // Wallets — local collage marks (remote logos were missing/wrong)
  jazzcash: { color: '#ED1C24', domain: 'jazzcash.com.pk', logo: LOCAL_ONLY.jazzcash },
  easypaisa: { color: '#00A651', domain: 'easypaisa.com.pk', logo: LOCAL_ONLY.easypaisa },
  nayapay: { color: '#F15A22', domain: 'nayapay.com', logo: LOCAL_ONLY.nayapay },
  sadapay: { color: '#E91E8C', domain: 'sadapay.pk', logo: LOCAL_ONLY.sadapay },

  // India
  'state bank of india (sbi)': { color: '#22409A', domain: 'sbi.co.in' },
  'hdfc bank': { color: '#004C8F', domain: 'hdfcbank.com' },
  'icici bank': { color: '#F58220', domain: 'icicibank.com' },
  'axis bank': { color: '#97144D', domain: 'axisbank.com' },
  'kotak mahindra bank': { color: '#ED1C24', domain: 'kotak.com' },
  'punjab national bank': { color: '#8B0000', domain: 'pnbindia.in' },
  'bank of baroda': { color: '#F15A22', domain: 'bankofbaroda.in' },
  'canara bank': { color: '#FFD100', domain: 'canarabank.com' },
  'union bank of india': { color: '#E31837', domain: 'unionbankofindia.co.in' },
  'indusind bank': { color: '#7B2D8E', domain: 'indusind.com' },
  'yes bank': { color: '#004C8F', domain: 'yesbank.in' },
  'idfc first bank': { color: '#9B1B5C', domain: 'idfcfirstbank.com' },
  'federal bank': { color: '#003DA5', domain: 'federalbank.co.in' },
  'bandhan bank': { color: '#E31837', domain: 'bandhanbank.com' },
  'indian bank': { color: '#ED1C24', domain: 'indianbank.in' },
  'bank of india': { color: '#F15A22', domain: 'bankofindia.co.in' },

  // US
  chase: { color: '#117ACA', domain: 'chase.com' },
  'bank of america': { color: '#E31837', domain: 'bankofamerica.com' },
  'wells fargo': { color: '#D71E28', domain: 'wellsfargo.com' },
  citibank: { color: '#003B70', domain: 'citi.com' },
  'capital one': { color: '#004977', domain: 'capitalone.com' },
  'us bank': { color: '#0C2074', domain: 'usbank.com' },
  'pnc bank': { color: '#F48024', domain: 'pnc.com' },
  'td bank': { color: '#34A853', domain: 'td.com' },
  truist: { color: '#5C2D91', domain: 'truist.com' },
  'ally bank': { color: '#7A004B', domain: 'ally.com' },
  'american express national bank': { color: '#006FCF', domain: 'americanexpress.com' },
  'navy federal credit union': { color: '#00205B', domain: 'navyfederal.org' },

  // UAE
  'emirates nbd': { color: '#5C2D91', domain: 'emiratesnbd.com' },
  'first abu dhabi bank (fab)': { color: '#C8102E', domain: 'bankfab.com' },
  'abu dhabi commercial bank (adcb)': { color: '#E31837', domain: 'adcb.com' },
  'dubai islamic bank': { color: '#00A651', domain: 'dib.ae' },
  'mashreq bank': { color: '#E31837', domain: 'mashreqbank.com' },
  rakbank: { color: '#E30613', domain: 'rakbank.ae' },
  'commercial bank of dubai': { color: '#003DA5', domain: 'cbd.ae' },
  'hsbc uae': { color: '#DB0011', domain: 'hsbc.ae' },
  'standard chartered uae': { color: '#0072AA', domain: 'sc.com' },
  'citibank uae': { color: '#003B70', domain: 'citibank.ae' },
  'ajman bank': { color: '#8B1A1A', domain: 'ajmanbank.ae' },
  'sharjah islamic bank': { color: '#006B3F', domain: 'sib.ae' },

  // Saudi
  'al rajhi bank': { color: '#003DA5', domain: 'alrajhibank.com.sa' },
  'saudi national bank (snb)': { color: '#003366', domain: 'alahli.com' },
  'riyad bank': { color: '#003DA5', domain: 'riyadbank.com' },

  // UK
  barclays: { color: '#00AEEF', domain: 'barclays.co.uk' },
  'hsbc uk': { color: '#DB0011', domain: 'hsbc.co.uk' },
  'lloyds bank': { color: '#006A4D', domain: 'lloydsbank.com' },
  natwest: { color: '#5A287D', domain: 'natwest.com' },
  'santander uk': { color: '#EC0000', domain: 'santander.co.uk' },
  monzo: { color: '#E31837', domain: 'monzo.com' },
  revolut: { color: '#191C1F', domain: 'revolut.com' },
};

function normalizeBankKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getBankBrand(name?: string | null): BankBrand | null {
  if (!name) return null;
  const key = normalizeBankKey(name);
  if (key === 'other bank' || key === 'other…' || key === 'other') return null;
  if (BRANDS[key]) return BRANDS[key];

  for (const [brandKey, brand] of Object.entries(BRANDS)) {
    if (key.includes(brandKey) || brandKey.includes(key)) return brand;
    const short = brandKey.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
    if (short && (key === short || key.includes(` ${short}`) || key.startsWith(`${short} `))) {
      return brand;
    }
  }
  return null;
}

export function bankInitials(name: string) {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase() || 'BK';
}

/** Prefer clearbit mark; fall back to Google favicon. */
export function bankLogoCandidates(name: string): string[] {
  const brand = getBankBrand(name);
  if (!brand?.domain) return [];
  return [
    `https://logo.clearbit.com/${brand.domain}`,
    `https://www.google.com/s2/favicons?domain=${brand.domain}&sz=128`,
  ];
}
