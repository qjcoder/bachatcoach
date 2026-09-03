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
2. User type: **External** (or Internal for Workspace-only)
3. App name: `BachatCoach`
4. Scopes to add:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.file`
5. Add test users while the app is in Testing mode.

## 3. OAuth client IDs

### Web client (required for Expo AuthSession + server token verify)

1. **Credentials → Create credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URIs (Expo):
   - `https://auth.expo.io/@YOUR_EXPO_USERNAME/bachatcoach` (if using Expo proxy)
   - Or your app scheme callback if using custom schemes: `bachatcoach://`
4. Copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and include it in server `GOOGLE_CLIENT_IDS`.

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
GOOGLE_CLIENT_IDS=WEB_CLIENT_ID,IOS_CLIENT_ID
```

Comma-separated list of allowed `aud` values when verifying ID tokens.

## 5. Rebuild the native app

After adding client IDs and `app.json` URL schemes:

```bash
cd mobile
npx expo prebuild --clean   # if needed
npx expo run:ios --device --configuration Release
```

## 6. Deploy API

Set `GOOGLE_CLIENT_IDS` on Vercel for **bachatcoach-api**, then redeploy.
