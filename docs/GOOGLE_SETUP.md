# Google Sign-In & Drive Backup Setup

BachatCoach uses Google OAuth for **Sign-In / Sign-Up** and **Google Drive** backups (stored in each user’s own Drive).

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create (or select) a project, e.g. `BachatCoach`.
3. Enable APIs:
   - **Google Drive API**
   - **Google Identity / People API** (if prompted)

## 2. OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External**
3. App name: `BachatCoach`
4. Scopes for **Sign-In** (free path — publish without a custom domain):
   - `openid`
   - `email`
   - `profile`
5. **Drive** (`https://www.googleapis.com/auth/drive.file`) is requested **only** when a user enables Backup or saves a receipt — not at Sign-In. Full Google verification of that scope needs a domain you own later; until then users may see an “unverified app” warning when connecting Drive.
6. While status is **Testing**, add each Gmail under **Test users**.
7. To let **any** Google account Sign-In: **Publish app** (Audience → In production). Sign-In scopes above are enough for free public Sign-Up.

Privacy / Terms URLs (already live, free on Vercel):

- https://bachatcoach-api.vercel.app/privacy
- https://bachatcoach-api.vercel.app/terms

Optional later: point a paid custom domain at these pages when you want Drive brand verification without warnings.

## 3. OAuth client IDs

### Web client (required for Expo AuthSession + server token verify)

1. **Credentials → Create credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URIs (Expo):
   - `https://auth.expo.io/@YOUR_EXPO_USERNAME/bachatcoach` (if using Expo proxy)
   - Or your app scheme callback if using custom schemes: `bachatcoach://`
4. Copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and include it in server `GOOGLE_CLIENT_IDS`.

### Android client

1. Application type: **Android**
2. Package name: `com.bachatcoach.app`
3. SHA-1 certificate fingerprint (must match the keystore that signs the APK):

**Local / current Release installs** (project `android/app/debug.keystore`):

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Also add your machine debug keystore if needed:

```
7D:C4:01:5E:61:20:7B:72:1D:B4:F0:7C:0A:92:72:52:B4:96:F1:F5
```

Without the matching SHA-1, Google shows **Access blocked / Error 400: invalid_request**.

In Google Cloud → **Clients** → your **Android** client → edit → add these SHA-1 values (you can add more than one).

4. Copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and include it in server `GOOGLE_CLIENT_IDS`.

### Troubleshooting: “Access blocked… request is invalid”

1. Confirm Android SHA-1(s) above are on the Android OAuth client (`com.bachatcoach.app`).
2. Confirm iOS client Bundle ID is `com.bachatcoach.app`.
3. Rebuild the app after OAuth client changes (SHA-1 updates can take a few minutes).
4. Sign-In must not use `access_type=offline` (fixed in app code).

### iOS client

1. Application type: **iOS**
2. Bundle ID: `com.bachatcoach.app`
3. Copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
4. Also add this Client ID to server `GOOGLE_CLIENT_IDS`.

## 4. Environment variables

### Mobile `mobile/.env`

```bash
EXPO_PUBLIC_API_URL=https://bachatcoach-api.vercel.app/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### Server `server/.env` (and Vercel Production env)

```bash
GOOGLE_CLIENT_IDS=WEB_CLIENT_ID,IOS_CLIENT_ID,ANDROID_CLIENT_ID
GOOGLE_CLIENT_SECRET=WEB_CLIENT_SECRET
```

- `GOOGLE_CLIENT_IDS` — comma-separated list of allowed `aud` values when verifying ID tokens.
- `GOOGLE_CLIENT_SECRET` — **server only**. Used if the API exchanges a web auth code. Never put this in the mobile app or any `EXPO_PUBLIC_*` variable (it would ship inside the store binary).

If a client secret was ever stored in `mobile/.env`, rotate it in Google Cloud Console and update Vercel.

## 5. Rebuild the native app

After adding client IDs and `app.json` URL schemes:

```bash
cd mobile
npx expo prebuild --clean   # if needed
npx eas build --platform all --profile production
# or local device:
npx expo run:ios --device --configuration Release
```

## 6. Deploy API

Set `GOOGLE_CLIENT_IDS` and `GOOGLE_CLIENT_SECRET` on Vercel for **bachatcoach-api**, then redeploy.

Privacy / Terms (for store consoles):

- https://bachatcoach-api.vercel.app/privacy
- https://bachatcoach-api.vercel.app/terms
