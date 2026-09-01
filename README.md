# BachatCoach

Personal finance coach for Pakistan — track daily expenses, loans, monthly savings, and stay motivated to save more.

**Languages:** English & Urdu (اردو)  
**Currency:** PKR (₨)

## Features (MVP)

- Daily expense tracking with categories (JazzCash, EasyPaisa, cash, bank)
- Income logging & monthly savings dashboard
- Loan given / loan taken with **WhatsApp reminders**
- **Savings goals** with progress tracking
- Insights: category breakdown, month vs month
- **PIN + biometric lock**
- English & Urdu (RTL) UI
- Daily motivation tips

## Project structure

```
bachatcoach/
├── mobile/     # Expo React Native app
└── server/     # Node.js + Express + MongoDB API
```

## Quick start

### Server

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI
npm install
npm run dev
```

API runs at `http://localhost:5001` (port 5001 avoids macOS AirPlay conflict on 5000)

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` if not using localhost (use your machine IP for physical device).

### Play Store

See `playstore/LISTING.md` for store descriptions and `playstore/PRIVACY_POLICY.md` for privacy policy text.

### Regenerate app icons

```bash
cd mobile && npm run generate-icons
```

## Tech stack

| Layer   | Technology              |
|---------|-------------------------|
| Mobile  | React Native (Expo)     |
| Backend | Node.js, Express        |
| Database| MongoDB (Mongoose)      |
| i18n    | i18next, expo-localization |
