import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatMoney } from '@/lib/format';

export type LoanEntryReport = {
  id?: string;
  type: 'lent' | 'received' | 'repaid' | 'paid_back';
  amount: number;
  note: string;
  date: string;
};

export type LoanContactReport = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  entries: LoanEntryReport[];
  createdAt?: string;
  updatedAt?: string;
};

export type LoanSectionReport = {
  direction: 'i_lent' | 'i_borrowed';
  summary: {
    contactCount: number;
    totalOutstanding: number;
    totalGiven: number;
    totalReturned: number;
  };
  contacts: LoanContactReport[];
};

export type LoansReportData = {
  generatedAt: string;
  lent: LoanSectionReport;
  borrowed: LoanSectionReport;
};

type LoansReportLabels = {
  title: string;
  lentTitle: string;
  borrowedTitle: string;
  generated: string;
  person: string;
  phone: string;
  balance: string;
  date: string;
  time: string;
  type: string;
  amount: string;
  note: string;
  summary: string;
  people: string;
  outstanding: string;
  totalGiven: string;
  totalReturned: string;
  noEntries: string;
  noContacts: string;
  entryLent: string;
  entryRepaid: string;
  entryReceived: string;
  entryPaidBack: string;
  currency: string;
};

function formatAmount(amount: number, currencyCode: string, lang: 'en' | 'ur') {
  return formatMoney(amount, currencyCode, lang);
}

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: string, locale: string) {
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function entryTypeLabel(type: LoanEntryReport['type'], labels: LoansReportLabels) {
  switch (type) {
    case 'lent':
      return labels.entryLent;
    case 'repaid':
      return labels.entryRepaid;
    case 'received':
      return labels.entryReceived;
    case 'paid_back':
      return labels.entryPaidBack;
    default:
      return type;
  }
}

function entryTypeColor(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  const isIncrease =
    (direction === 'i_lent' && type === 'lent') || (direction === 'i_borrowed' && type === 'received');
  return isIncrease ? '#DC2626' : '#047857';
}

function renderSection(section: LoanSectionReport, labels: LoansReportLabels, locale: string, lang: 'en' | 'ur', accent: string) {
  const title = section.direction === 'i_lent' ? labels.lentTitle : labels.borrowedTitle;

  const summaryHtml = `
    <div class="summary">
      <div class="stat"><div class="stat-label">${labels.people}</div><div class="stat-value">${section.summary.contactCount}</div></div>
      <div class="stat"><div class="stat-label">${labels.outstanding}</div><div class="stat-value" style="color:${accent}">${formatAmount(section.summary.totalOutstanding, labels.currency, lang)}</div></div>
      <div class="stat"><div class="stat-label">${labels.totalGiven}</div><div class="stat-value">${formatAmount(section.summary.totalGiven, labels.currency, lang)}</div></div>
      <div class="stat"><div class="stat-label">${labels.totalReturned}</div><div class="stat-value">${formatAmount(section.summary.totalReturned, labels.currency, lang)}</div></div>
    </div>`;

  if (!section.contacts.length) {
    return `
      <div class="section">
        <h2 class="section-title" style="color:${accent}">${title}</h2>
        ${summaryHtml}
        <p class="empty">${labels.noContacts}</p>
      </div>`;
  }

  const contactsHtml = section.contacts
    .map((contact) => {
      const entriesHtml = contact.entries.length
        ? `
          <table class="entries">
            <thead>
              <tr>
                <th>${labels.date}</th>
                <th>${labels.time}</th>
                <th>${labels.type}</th>
                <th>${labels.amount}</th>
                <th>${labels.note}</th>
              </tr>
            </thead>
            <tbody>
              ${contact.entries
                .map(
                  (entry) => `
                <tr>
                  <td>${formatDate(entry.date, locale)}</td>
                  <td>${formatTime(entry.date, locale)}</td>
                  <td>${entryTypeLabel(entry.type, labels)}</td>
                  <td class="num" style="color:${entryTypeColor(entry.type, section.direction)}">${formatAmount(entry.amount, labels.currency, lang)}</td>
                  <td>${entry.note || '—'}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        : `<p class="empty">${labels.noEntries}</p>`;

      return `
        <div class="contact-card">
          <div class="contact-head">
            <div>
              <div class="contact-name">${contact.name}</div>
              <div class="contact-meta">${labels.phone}: ${contact.phone || '—'}</div>
            </div>
            <div class="contact-balance" style="color:${accent}">
              <div class="balance-label">${labels.balance}</div>
              <div class="balance-value">${formatAmount(contact.balance, labels.currency, lang)}</div>
            </div>
          </div>
          ${entriesHtml}
        </div>`;
    })
    .join('');

  return `
    <div class="section">
      <h2 class="section-title" style="color:${accent}">${title}</h2>
      ${summaryHtml}
      ${contactsHtml}
    </div>`;
}

function buildLoansReportHtml(
  data: LoansReportData,
  userName: string,
  lang: 'en' | 'ur',
  labels: LoansReportLabels
) {
  const locale = lang === 'ur' ? 'ur-PK' : 'en-PK';
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const align = lang === 'ur' ? 'right' : 'left';
  const generatedAt = new Date(data.generatedAt).toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 28px;
      direction: ${dir};
      text-align: ${align};
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #10B981, #047857);
      color: #fff;
      border-radius: 16px;
      padding: 22px 24px;
      margin-bottom: 22px;
    }
    .brand { font-size: 20px; font-weight: 800; }
    .title { font-size: 17px; font-weight: 700; margin-top: 6px; }
    .meta { font-size: 11px; opacity: 0.9; margin-top: 4px; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E2E8F0;
    }
    .summary {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .stat {
      flex: 1;
      min-width: 110px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px 12px;
      background: #F8FAFC;
    }
    .stat-label {
      font-size: 10px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value { font-size: 15px; font-weight: 800; margin-top: 4px; }
    .contact-card {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 14px;
      background: #fff;
    }
    .contact-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .contact-name { font-size: 15px; font-weight: 800; }
    .contact-meta { font-size: 11px; color: #64748B; margin-top: 4px; }
    .contact-balance { text-align: ${lang === 'ur' ? 'left' : 'right'}; }
    .balance-label { font-size: 10px; color: #64748B; text-transform: uppercase; }
    .balance-value { font-size: 16px; font-weight: 800; margin-top: 2px; }
    table.entries {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    table.entries th, table.entries td {
      padding: 8px 6px;
      border-bottom: 1px solid #E2E8F0;
      text-align: ${align};
      vertical-align: top;
    }
    table.entries th {
      background: #F1F5F9;
      font-size: 10px;
      text-transform: uppercase;
      color: #64748B;
    }
    td.num { font-weight: 700; white-space: nowrap; }
    .empty { color: #94A3B8; font-style: italic; margin: 8px 0; }
    .footer {
      margin-top: 24px;
      font-size: 10px;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">BachatCoach</div>
    <div class="title">${labels.title}</div>
    <div class="meta">${userName} · ${labels.currency}</div>
  </div>

  ${renderSection(data.lent, labels, locale, lang, '#047857')}
  ${renderSection(data.borrowed, labels, locale, lang, '#DC2626')}

  <div class="footer">${labels.generated}: ${generatedAt}</div>
</body>
</html>`;
}

export async function exportLoansReportPdf(
  data: LoansReportData,
  userName: string,
  lang: 'en' | 'ur',
  labels: LoansReportLabels
) {
  const html = buildLoansReportHtml(data, userName, lang, labels);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: labels.title,
    });
  }
  return uri;
}

export async function exportLoansSectionPdf(
  section: LoanSectionReport,
  generatedAt: string,
  userName: string,
  lang: 'en' | 'ur',
  labels: LoansReportLabels
) {
  const data: LoansReportData = {
    generatedAt,
    lent: section.direction === 'i_lent' ? section : { direction: 'i_lent', summary: { contactCount: 0, totalOutstanding: 0, totalGiven: 0, totalReturned: 0 }, contacts: [] },
    borrowed: section.direction === 'i_borrowed' ? section : { direction: 'i_borrowed', summary: { contactCount: 0, totalOutstanding: 0, totalGiven: 0, totalReturned: 0 }, contacts: [] },
  };
  return exportLoansReportPdf(data, userName, lang, labels);
}

export type LoanContactReportDetail = LoanContactReport & {
  direction: 'i_lent' | 'i_borrowed';
  summary: {
    totalOutstanding: number;
    totalGiven: number;
    totalReturned: number;
  };
};

function buildSingleContactReportHtml(
  contact: LoanContactReportDetail,
  generatedAt: string,
  userName: string,
  lang: 'en' | 'ur',
  labels: LoansReportLabels,
  sectionTitle: string
) {
  const locale = lang === 'ur' ? 'ur-PK' : 'en-PK';
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const align = lang === 'ur' ? 'right' : 'left';
  const accent = contact.direction === 'i_lent' ? '#047857' : '#DC2626';
  const generatedLabel = new Date(generatedAt).toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const entriesHtml = contact.entries.length
    ? `
      <table class="entries">
        <thead>
          <tr>
            <th>${labels.date}</th>
            <th>${labels.time}</th>
            <th>${labels.type}</th>
            <th>${labels.amount}</th>
            <th>${labels.note}</th>
          </tr>
        </thead>
        <tbody>
          ${contact.entries
            .map(
              (entry) => `
            <tr>
              <td>${formatDate(entry.date, locale)}</td>
              <td>${formatTime(entry.date, locale)}</td>
              <td>${entryTypeLabel(entry.type, labels)}</td>
              <td class="num" style="color:${entryTypeColor(entry.type, contact.direction)}">${formatAmount(entry.amount, labels.currency, lang)}</td>
              <td>${entry.note || '—'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : `<p class="empty">${labels.noEntries}</p>`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; margin: 0; padding: 28px; direction: ${dir}; text-align: ${align}; font-size: 12px; }
    .header { background: linear-gradient(135deg, #10B981, #047857); color: #fff; border-radius: 16px; padding: 22px 24px; margin-bottom: 22px; }
    .brand { font-size: 20px; font-weight: 800; }
    .title { font-size: 17px; font-weight: 700; margin-top: 6px; }
    .meta { font-size: 11px; opacity: 0.9; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 800; color: ${accent}; margin-bottom: 12px; }
    .summary { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat { flex: 1; min-width: 110px; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; background: #F8FAFC; }
    .stat-label { font-size: 10px; color: #64748B; text-transform: uppercase; }
    .stat-value { font-size: 15px; font-weight: 800; margin-top: 4px; }
    .contact-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; background: #fff; }
    .contact-name { font-size: 18px; font-weight: 800; }
    .contact-meta { font-size: 11px; color: #64748B; margin-top: 4px; margin-bottom: 14px; }
    table.entries { width: 100%; border-collapse: collapse; font-size: 11px; }
    table.entries th, table.entries td { padding: 8px 6px; border-bottom: 1px solid #E2E8F0; text-align: ${align}; }
    table.entries th { background: #F1F5F9; font-size: 10px; text-transform: uppercase; color: #64748B; }
    td.num { font-weight: 700; }
    .empty { color: #94A3B8; font-style: italic; }
    .footer { margin-top: 24px; font-size: 10px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">BachatCoach</div>
    <div class="title">${contact.name}</div>
    <div class="meta">${sectionTitle} · ${userName}</div>
  </div>
  <div class="section-title">${sectionTitle}</div>
  <div class="summary">
    <div class="stat"><div class="stat-label">${labels.balance}</div><div class="stat-value" style="color:${accent}">${formatAmount(contact.balance, labels.currency, lang)}</div></div>
    <div class="stat"><div class="stat-label">${labels.totalGiven}</div><div class="stat-value">${formatAmount(contact.summary.totalGiven, labels.currency, lang)}</div></div>
    <div class="stat"><div class="stat-label">${labels.totalReturned}</div><div class="stat-value">${formatAmount(contact.summary.totalReturned, labels.currency, lang)}</div></div>
  </div>
  <div class="contact-card">
    <div class="contact-name">${contact.name}</div>
    <div class="contact-meta">${labels.phone}: ${contact.phone || '—'}</div>
    ${entriesHtml}
  </div>
  <div class="footer">${labels.generated}: ${generatedLabel}</div>
</body>
</html>`;
}

export async function exportLoansContactPdf(
  contact: LoanContactReportDetail,
  generatedAt: string,
  userName: string,
  lang: 'en' | 'ur',
  labels: LoansReportLabels,
  sectionTitle: string
) {
  const html = buildSingleContactReportHtml(contact, generatedAt, userName, lang, labels, sectionTitle);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${contact.name} — ${labels.title}`,
    });
  }
  return uri;
}
