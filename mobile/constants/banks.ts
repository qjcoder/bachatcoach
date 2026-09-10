/** Popular retail banks by currency (used as the user's country signal). */

export type CountryBanks = {
  countryCode: string;
  countryName: string;
  banks: string[];
};

const PK_BANKS = [
  'Habib Bank Limited (HBL)',
  'United Bank Limited (UBL)',
  'MCB Bank',
  'Allied Bank (ABL)',
  'Bank Alfalah',
  'Bank Alfalah Islamic',
  'Meezan Bank',
  'Askari Bank',
  'Bank of Punjab (BOP)',
  'National Bank of Pakistan (NBP)',
  'Faysal Bank',
  'JS Bank',
  'Habib Metropolitan Bank',
  'Standard Chartered Pakistan',
  'Bank Al Habib',
  'Dubai Islamic Bank Pakistan',
  'Summit Bank',
  'First Women Bank',
  'JazzCash',
  'EasyPaisa',
  'NayaPay',
  'SadaPay',
  'Soneri Bank',
  'Silkbank',
  'BankIslami Pakistan',
  'Al Baraka Bank (Pakistan)',
  'Samba Bank',
  'The Bank of Khyber',
  'Sindh Bank',
  'Industrial and Commercial Bank of China (ICBC)',
  'Citibank Pakistan',
  'Zarai Taraqiati Bank (ZTBL)',
  'Khushhali Microfinance Bank',
  'Telenor Microfinance Bank',
  'Mobilink Microfinance Bank',
  'U Microfinance Bank',
  'NRSP Microfinance Bank',
];

const IN_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'Yes Bank',
  'IDFC First Bank',
  'Federal Bank',
  'Bandhan Bank',
  'Indian Bank',
  'Bank of India',
];

const US_BANKS = [
  'Chase',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  'Capital One',
  'US Bank',
  'PNC Bank',
  'TD Bank',
  'Truist',
  'Ally Bank',
  'American Express National Bank',
  'Navy Federal Credit Union',
];

const AE_BANKS = [
  'Emirates NBD',
  'First Abu Dhabi Bank (FAB)',
  'Abu Dhabi Commercial Bank (ADCB)',
  'Dubai Islamic Bank',
  'Mashreq Bank',
  'RAKBANK',
  'Commercial Bank of Dubai',
  'HSBC UAE',
  'Standard Chartered UAE',
  'Citibank UAE',
  'Ajman Bank',
  'Sharjah Islamic Bank',
];

const SA_BANKS = [
  'Al Rajhi Bank',
  'Saudi National Bank (SNB)',
  'Riyad Bank',
  'Banque Saudi Fransi',
  'Arab National Bank',
  'Alinma Bank',
  'Bank AlJazira',
  'Bank Albilad',
  'Saudi Awwal Bank (SAB)',
  'Gulf International Bank',
];

const GB_BANKS = [
  'Barclays',
  'HSBC UK',
  'Lloyds Bank',
  'NatWest',
  'Santander UK',
  'Nationwide',
  'Halifax',
  'TSB',
  'Metro Bank',
  'Starling Bank',
  'Monzo',
  'Revolut',
];

const BD_BANKS = [
  'Dutch-Bangla Bank',
  'BRAC Bank',
  'Islami Bank Bangladesh',
  'City Bank',
  'Eastern Bank',
  'Pubali Bank',
  'Sonali Bank',
  'Agrani Bank',
  'Janata Bank',
  'Standard Chartered Bangladesh',
];

const OTHER_COMMON = ['Other bank'];

const BY_CURRENCY: Record<string, CountryBanks> = {
  PKR: { countryCode: 'PK', countryName: 'Pakistan', banks: PK_BANKS },
  INR: { countryCode: 'IN', countryName: 'India', banks: IN_BANKS },
  USD: { countryCode: 'US', countryName: 'United States', banks: US_BANKS },
  AED: { countryCode: 'AE', countryName: 'United Arab Emirates', banks: AE_BANKS },
  SAR: { countryCode: 'SA', countryName: 'Saudi Arabia', banks: SA_BANKS },
  GBP: { countryCode: 'GB', countryName: 'United Kingdom', banks: GB_BANKS },
  BDT: { countryCode: 'BD', countryName: 'Bangladesh', banks: BD_BANKS },
  EUR: {
    countryCode: 'EU',
    countryName: 'Eurozone',
    banks: [
      'Deutsche Bank',
      'BNP Paribas',
      'ING',
      'Société Générale',
      'Commerzbank',
      'Santander',
      'UniCredit',
      'Intesa Sanpaolo',
      'Rabobank',
      'CaixaBank',
      'Revolut',
      'N26',
    ],
  },
  CAD: {
    countryCode: 'CA',
    countryName: 'Canada',
    banks: [
      'Royal Bank of Canada (RBC)',
      'TD Canada Trust',
      'Scotiabank',
      'Bank of Montreal (BMO)',
      'CIBC',
      'National Bank of Canada',
      'Tangerine',
    ],
  },
  AUD: {
    countryCode: 'AU',
    countryName: 'Australia',
    banks: [
      'Commonwealth Bank',
      'Westpac',
      'ANZ',
      'NAB',
      'Macquarie Bank',
      'Bendigo Bank',
      'ING Australia',
    ],
  },
  MYR: {
    countryCode: 'MY',
    countryName: 'Malaysia',
    banks: [
      'Maybank',
      'CIMB Bank',
      'Public Bank',
      'RHB Bank',
      'Hong Leong Bank',
      'AmBank',
      'Bank Islam Malaysia',
    ],
  },
  QAR: {
    countryCode: 'QA',
    countryName: 'Qatar',
    banks: [
      'Qatar National Bank (QNB)',
      'Commercial Bank of Qatar',
      'Doha Bank',
      'Masraf Al Rayan',
      'Qatar Islamic Bank',
      'Ahli Bank',
    ],
  },
  KWD: {
    countryCode: 'KW',
    countryName: 'Kuwait',
    banks: [
      'National Bank of Kuwait',
      'Kuwait Finance House',
      'Gulf Bank',
      'Burgan Bank',
      'Commercial Bank of Kuwait',
      'Al Ahli Bank of Kuwait',
    ],
  },
  OMR: {
    countryCode: 'OM',
    countryName: 'Oman',
    banks: [
      'Bank Muscat',
      'National Bank of Oman',
      'Bank Dhofar',
      'Sohar International',
      'Bank Nizwa',
      'Ahli Bank Oman',
    ],
  },
  BHD: {
    countryCode: 'BH',
    countryName: 'Bahrain',
    banks: [
      'Ahli United Bank',
      'Bank of Bahrain and Kuwait',
      'National Bank of Bahrain',
      'Bahrain Islamic Bank',
      'Al Salam Bank',
      'Ithmaar Bank',
    ],
  },
  LKR: {
    countryCode: 'LK',
    countryName: 'Sri Lanka',
    banks: [
      'Bank of Ceylon',
      'People\'s Bank',
      'Commercial Bank of Ceylon',
      'Hatton National Bank',
      'Sampath Bank',
      'Nations Trust Bank',
    ],
  },
  NPR: {
    countryCode: 'NP',
    countryName: 'Nepal',
    banks: [
      'Nepal Bank Limited',
      'Rastriya Banijya Bank',
      'Nabil Bank',
      'Nepal Investment Mega Bank',
      'Global IME Bank',
      'Himalayan Bank',
    ],
  },
  AFN: {
    countryCode: 'AF',
    countryName: 'Afghanistan',
    banks: [
      'Afghanistan International Bank',
      'Azizi Bank',
      'Bank-e-Millie Afghan',
      'Pashtany Bank',
      'New Kabul Bank',
    ],
  },
  TRY: {
    countryCode: 'TR',
    countryName: 'Türkiye',
    banks: [
      'Ziraat Bankası',
      'İş Bankası',
      'Garanti BBVA',
      'Akbank',
      'Yapı Kredi',
      'QNB Finansbank',
      'DenizBank',
    ],
  },
  EGP: {
    countryCode: 'EG',
    countryName: 'Egypt',
    banks: [
      'National Bank of Egypt',
      'Banque Misr',
      'Commercial International Bank (CIB)',
      'Banque du Caire',
      'QNB Al Ahli',
      'HSBC Egypt',
    ],
  },
};

export function getCountryBanks(currencyCode?: string): CountryBanks {
  const code = (currencyCode || 'PKR').toUpperCase();
  return (
    BY_CURRENCY[code] || {
      countryCode: code,
      countryName: code,
      banks: OTHER_COMMON,
    }
  );
}

export function searchCountryBanks(currencyCode: string | undefined, query: string): string[] {
  const { banks } = getCountryBanks(currencyCode);
  const list = banks.includes('Other bank') ? banks : [...banks, 'Other bank'];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((name) => name.toLowerCase().includes(q));
}
