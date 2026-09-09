# Store publish prep — remaining manual steps

## Done in repo
- Removed Google client secret from mobile (`EXPO_PUBLIC_*`)
- Privacy + Terms hosted at API URLs
- EAS project linked: `@qjcoder/bachatcoach`
- Version aligned to **1.1.0** (build / versionCode **22**)
- Account deletion copy matches 7-day grace
- Trimmed unused Android permissions (mic / overlay / legacy storage)
- **Google Sign-In uses only `openid` / `email` / `profile`** — Drive is requested later (backup / receipts)

## Free Google Sign-Up for everyone
1. Google Cloud → OAuth consent → **Publish app** (In production)
2. Keep Sign-In scopes to openid/email/profile (already how the app signs in)
3. Rebuild the app so this split ships
4. Optional: when a user enables Drive, they may see an “unverified app” warning until you verify `drive.file` with a domain you own

## You still need to do

1. ~~Rotate Google web client secret + set on Vercel~~ (done)
2. **EAS Android production build** (in progress / latest):
   - https://expo.dev/accounts/qjcoder/projects/bachatcoach/builds/90456b5b-02e8-48f6-b288-e064cd1130df
   - version **1.1.0** / versionCode **23**
3. After build finishes: open [EAS Android credentials](https://expo.dev/accounts/qjcoder/projects/bachatcoach/credentials) → copy **SHA-1** → add to Google Cloud **Android** OAuth client (`com.bachatcoach.app`).
4. Upload Play assets from `playstore/assets/`:
   - `feature-graphic.png` (1024×500)
   - `icon-512.png`
   - screenshots (log into app, capture Home / Expense / Loans / Insights / Goals / Settings — see `playstore/assets/README.md`)
5. Store consoles — Privacy / Terms:
   - https://bachatcoach-api.vercel.app/privacy
   - https://bachatcoach-api.vercel.app/terms
6. Optional later: `eas build --platform ios --profile production`

## Legal URLs (live)
- https://bachatcoach-api.vercel.app/privacy
- https://bachatcoach-api.vercel.app/terms
