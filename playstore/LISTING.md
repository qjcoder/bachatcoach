# BachatCoach — Google Play Store Listing

Use this document when submitting to Google Play Console.

---

## App name
**BachatCoach**

## Package name
`com.bachatcoach.app`

## Category
**Finance**

## Content rating
Everyone (no mature content)

---

## Short description (80 chars max)

```
Track expenses, loans & savings. Your personal finance coach in English & Urdu.
```

**Urdu alternative (if store supports):**
```
خرچ، قرض اور بچت ٹریک کریں۔ انگریزی و اردو میں آپ کا ذاتی بچت کوچ۔
```

---

## Full description (English)

```
BachatCoach — Your Personal Savings Coach

Take control of your money with BachatCoach, the personal finance app built for Pakistan. Track daily expenses, manage loans, hit savings goals, and get motivated to save more — all in English and Urdu (اردو).

💰 DAILY EXPENSE TRACKING
• Log expenses and income in seconds
• 12+ categories: Food, Transport, Bills, Rent, Shopping & more
• Payment methods: Cash, Bank, JazzCash, EasyPaisa, Card

📊 MONTHLY SAVINGS DASHBOARD
• See how much you saved this month
• Savings rate % from your income
• Compare with last month

👥 LOANS & PEOPLE (Personal Khata)
• Track money you lent and borrowed
• WhatsApp payment reminders in one tap
• Know who owes you and whom you owe

🎯 SAVINGS GOALS
• Set targets: Emergency fund, Phone, Eid, Trip
• Track progress with visual bars
• Add contributions anytime

📈 SMART INSIGHTS
• Spending breakdown by category
• "Where to save more" suggestions
• Month-over-month comparison

💡 DAILY MOTIVATION
• Tips to build better money habits
• Encouraging messages in English & Urdu

🔒 PRIVACY & SECURITY
• PIN lock + fingerprint / Face ID
• Your data stays on your secure account

Perfect for students, salaried professionals, freelancers, and anyone who wants to save smarter in PKR.

Download BachatCoach today — Track. Save. Grow.
```

---

## Full description (Urdu)

```
بچت کوچ — آپ کا ذاتی بچت کوچ

پاکستان کے لیے بنائی گئی ذاتی مالیات ایپ۔ روزانہ خرچ، قرض، بچت کے اہداف ٹریک کریں اور زیادہ بچت کی تحریک حاصل کریں — انگریزی اور اردو دونوں میں۔

• روزانہ خرچ و آمدنی کا حساب
• قرض دیا / لیا — واٹس ایپ یاد دہانی
• ماہانہ بچت ڈیش بورڈ
• بچت کے اہداف
• خرچ کا تجزیہ
• روزانہ نصیحت
• PIN اور فنگر پرنٹ لاک

ابھی ڈاؤن لوڈ کریں — ٹریک کریں۔ بچائیں۔ بڑھائیں۔
```

---

## Keywords (for ASO)
personal finance, expense tracker, savings, budget, khata, udhaar, loan tracker, Pakistan, PKR, Urdu, bachat, money manager

---

## Screenshots needed (prepare 6–8)

1. **Home** — Savings dashboard with green hero card
2. **Add expense** — Category chips + amount
3. **Loans** — I Lent list with WhatsApp remind button
4. **Insights** — Category breakdown bars
5. **Goals** — Progress bars on savings goals
6. **Settings** — Language toggle EN/UR + PIN lock
7. **Urdu RTL** — Home screen in Urdu
8. **Motivation tip** — Daily tip card on home

**Sizes:** Phone 1080×1920 or 1080×2340 (Play Console will specify)

---

## Feature graphic
**Size:** 1024 × 500 px  
**Text:** "BachatCoach — Track. Save. Grow."  
**Colors:** Green #059669, white text, coin/piggy bank icon

---

## Privacy policy URL
https://bachatcoach-api.vercel.app/privacy

## Terms of Service URL
https://bachatcoach-api.vercel.app/terms

---

## Data safety (Play Console form)

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email | Yes | No | Account authentication |
| Name | Yes | No | Profile display |
| Financial info (transactions) | Yes | No | App functionality |
| Photos (receipts, optional) | Yes | No (may sync to user's Google Drive) | Receipts / backup |
| Device ID | No | No | — |

**Encryption:** Data encrypted in transit (HTTPS)  
**Deletion:** In-app Settings → Delete Account (7-day recovery window), or email support

---

## Support email
`qjcoder@gmail.com`

## Website / legal
- Privacy: https://bachatcoach-api.vercel.app/privacy
- Terms: https://bachatcoach-api.vercel.app/terms

---

## Release checklist

- [ ] Rotate Google web client secret (was previously in mobile `.env`); set `GOOGLE_CLIENT_SECRET` on Vercel only
- [ ] `eas build --platform android --profile production` (signed AAB, not debug keystore)
- [ ] `eas build --platform ios --profile production`
- [ ] Privacy + Terms URLs live (see above)
- [ ] App icon 512×512 uploaded
- [ ] Feature graphic 1024×500 uploaded
- [ ] Screenshots (min 2, recommend 8)
- [ ] Content rating questionnaire completed
- [ ] Data safety / App Privacy forms completed
- [ ] Target countries: Pakistan (+ optional global)
- [ ] Google OAuth: production SHA-1 for Play upload key; publish consent screen
