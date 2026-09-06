import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatMoney } from '@/lib/format';

export type MonthlyReportRow = {
  month: number;
  income: number;
  expenses: number;
  toSavings?: number;
  saved: number;
};

export type MonthlyReportData = {
  year: number;
  months: MonthlyReportRow[];
  totals: { income: number; expenses: number; toSavings?: number; saved: number };
};

type ReportLabels = {
  title: string;
  subtitle: string;
  month: string;
  income: string;
  expenses: string;
  toSavings: string;
  saved: string;
  total: string;
  savingsRate: string;
  generated: string;
  currency: string;
};

function formatAmount(amount: number, currencyCode: string, lang: 'en' | 'ur') {
  return formatMoney(amount, currencyCode, lang);
}

function formatMonthName(month: number, year: number, locale: string) {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long' });
}

function buildReportHtml(
  data: MonthlyReportData,
  userName: string,
  lang: 'en' | 'ur',
  labels: ReportLabels
) {
  const locale = lang === 'ur' ? 'ur-PK' : 'en-PK';
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const align = lang === 'ur' ? 'right' : 'left';
  const savingsRate = data.totals.income > 0
    ? Math.round((data.totals.saved / data.totals.income) * 100)
    : 0;

  const rows = data.months
    .map((row) => {
      const savedColor = row.saved >= 0 ? '#047857' : '#DC2626';
      return `
        <tr>
          <td>${formatMonthName(row.month, data.year, locale)}</td>
          <td class="num income">${formatAmount(row.income, labels.currency, lang)}</td>
          <td class="num expense">${formatAmount(row.expenses, labels.currency, lang)}</td>
          <td class="num to-savings">${formatAmount(row.toSavings || 0, labels.currency, lang)}</td>
          <td class="num saved" style="color:${savedColor}">${formatAmount(row.saved, labels.currency, lang)}</td>
        </tr>`;
    })
    .join('');

  const generatedAt = new Date().toLocaleString(locale, {
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
      padding: 32px;
      direction: ${dir};
      text-align: ${align};
    }
    .header {
      background: linear-gradient(135deg, #10B981, #047857);
      color: #fff;
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 24px;
    }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .title { font-size: 18px; font-weight: 700; margin-top: 8px; }
    .meta { font-size: 12px; opacity: 0.9; margin-top: 6px; }
    .summary {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat {
      flex: 1;
      min-width: 140px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #F8FAFC;
    }
    .stat-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; }
    .stat-value { font-size: 18px; font-weight: 800; margin-top: 6px; }
    .income { color: #047857; }
    .expense { color: #DC2626; }
    .to-savings { color: #D97706; }
    .saved { color: #047857; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 12px 10px;
      border-bottom: 1px solid #E2E8F0;
      text-align: ${align};
    }
    th {
      background: #F1F5F9;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
    }
    td.num { font-weight: 700; white-space: nowrap; }
    tfoot td {
      font-weight: 800;
      background: #F8FAFC;
      border-top: 2px solid #CBD5E1;
    }
    .footer {
      margin-top: 28px;
      font-size: 11px;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">BachatCoach</div>
    <div class="title">${labels.title} — ${data.year}</div>
    <div class="meta">${userName} · ${labels.currency}</div>
  </div>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">${labels.income}</div>
      <div class="stat-value income">${formatAmount(data.totals.income, labels.currency, lang)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${labels.expenses}</div>
      <div class="stat-value expense">${formatAmount(data.totals.expenses, labels.currency, lang)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${labels.toSavings}</div>
      <div class="stat-value to-savings">${formatAmount(data.totals.toSavings || 0, labels.currency, lang)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${labels.saved}</div>
      <div class="stat-value saved">${formatAmount(data.totals.saved, labels.currency, lang)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${labels.savingsRate}</div>
      <div class="stat-value">${savingsRate}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${labels.month}</th>
        <th>${labels.income}</th>
        <th>${labels.expenses}</th>
        <th>${labels.toSavings}</th>
        <th>${labels.saved}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td>${labels.total}</td>
        <td class="num income">${formatAmount(data.totals.income, labels.currency, lang)}</td>
        <td class="num expense">${formatAmount(data.totals.expenses, labels.currency, lang)}</td>
        <td class="num to-savings">${formatAmount(data.totals.toSavings || 0, labels.currency, lang)}</td>
        <td class="num saved">${formatAmount(data.totals.saved, labels.currency, lang)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">${labels.generated}: ${generatedAt}</div>
</body>
</html>`;
}

export async function exportMonthlyReportPdf(
  data: MonthlyReportData,
  userName: string,
  lang: 'en' | 'ur',
  labels: ReportLabels
) {
  const html = buildReportHtml(data, userName, lang, labels);
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
