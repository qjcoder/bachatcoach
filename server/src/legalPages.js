/**
 * Public legal pages for App Store / Play Console (Privacy + Terms).
 * Served at /privacy and /terms (and /api/* aliases for Vercel rewrites).
 */
function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — BachatCoach</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.55; max-width: 720px; margin: 0 auto; padding: 24px 18px 64px;
      color: #111; background: #fafafa; }
    @media (prefers-color-scheme: dark) {
      body { color: #f2f2f2; background: #111; }
      a { color: #6ee7b7; }
    }
    h1 { font-size: 1.75rem; margin: 0 0 8px; }
    h2 { font-size: 1.15rem; margin: 28px 0 8px; }
    p, li { font-size: 0.98rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
    @media (prefers-color-scheme: dark) { .meta { color: #aaa; } }
    a { color: #047857; }
    ul { padding-left: 1.2rem; }
    footer { margin-top: 40px; font-size: 0.85rem; opacity: 0.75; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">BachatCoach · com.bachatcoach.app · Last updated: September 9, 2026</p>
  ${bodyHtml}
  <footer>
    <p>Contact: <a href="mailto:qjcoder@gmail.com">qjcoder@gmail.com</a></p>
    <p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>
  </footer>
</body>
</html>`;
}

export const PRIVACY_HTML = page(
  'Privacy Policy',
  `
  <p>BachatCoach ("we", "our", "the app") is a personal finance management application. This Privacy Policy explains how we collect, use, and protect your information.</p>

  <h2>Information We Collect</h2>
  <p><strong>Account information:</strong> name, email address, and password (hashed; never stored in plain text). If you use Google Sign-In, we receive your Google account ID, name, email, and profile photo from Google.</p>
  <p><strong>Financial data:</strong> expense and income transactions, loan/contact records (names, optional phone numbers, amounts), savings goals, categories, payment methods, and optional notes or receipt references.</p>
  <p><strong>Device data (stored on your device):</strong> PIN lock (SecureStore), biometric unlock preference, and language preference. PIN codes never leave your device.</p>
  <p>We do <strong>not</strong> collect bank credentials, SMS/call logs, precise location, or advertising identifiers.</p>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>Provide expense tracking, loan management, and savings features</li>
    <li>Calculate summaries and insights</li>
    <li>Authenticate your account across devices</li>
    <li>Send email one-time passwords for sign-in or recovery when you request them</li>
    <li>Optional WhatsApp reminders you initiate (we open WhatsApp with a pre-filled message; we do not access your WhatsApp account)</li>
  </ul>
  <p>We do <strong>not</strong> sell your data to third parties.</p>

  <h2>Google Sign-In &amp; Google Drive</h2>
  <p>If you choose Google Sign-In, authentication is handled by Google. If you enable Google Drive backup or receipt storage, the app uses Google's <code>drive.file</code> scope to create and manage files <strong>you</strong> create through BachatCoach in your own Drive. We do not request full Drive access.</p>

  <h2>Data Storage &amp; Security</h2>
  <ul>
    <li>Data is transmitted over HTTPS</li>
    <li>Passwords are hashed before storage</li>
    <li>API data is stored in MongoDB with access controls</li>
    <li>Receipts may be stored as references to files in your Google Drive</li>
  </ul>

  <h2>Third-Party Services</h2>
  <ul>
    <li><strong>Google</strong> — Sign-In and optional Drive backup/receipts</li>
    <li><strong>Email delivery (e.g. Resend)</strong> — OTP emails when configured</li>
    <li><strong>Hosting</strong> — API and database on cloud providers (e.g. Vercel, MongoDB Atlas)</li>
  </ul>
  <p>We do not use third-party advertising SDKs.</p>

  <h2>Your Rights &amp; Account Deletion</h2>
  <p>You may access and update your data in the app. You can schedule account deletion in <strong>Settings → Delete Account</strong>. After you confirm, your account enters a <strong>7-day recovery window</strong>. Signing in again during that window cancels deletion. After the window ends, your account and associated server data are permanently deleted. You may also email us for help.</p>
  <p>Export of your data may be offered in a future update (Drive backup is available today when enabled).</p>

  <h2>Children's Privacy</h2>
  <p>BachatCoach is not intended for children under 13. We do not knowingly collect data from children.</p>

  <h2>Changes</h2>
  <p>We may update this policy and will note the last-updated date above. Significant changes may also be communicated in the app or by email.</p>

  <h2>Contact</h2>
  <p>Privacy questions: <a href="mailto:qjcoder@gmail.com">qjcoder@gmail.com</a></p>
  `
);

export const TERMS_HTML = page(
  'Terms of Service',
  `
  <p>By downloading or using BachatCoach, you agree to these Terms of Service.</p>

  <h2>The Service</h2>
  <p>BachatCoach is a personal finance tracker for expenses, income, savings goals, and informal loans between people you know. It is <strong>not</strong> a bank, payment processor, remittance service, investment advisor, or credit provider.</p>

  <h2>Accounts</h2>
  <p>You are responsible for keeping your login credentials and device lock (PIN/biometrics) secure. You must provide accurate account information and use the app only for lawful personal purposes.</p>

  <h2>Your Content</h2>
  <p>You retain ownership of the financial and personal data you enter. You grant us permission to store and process that data solely to operate the app. Optional Google Drive backups and receipts remain in your Google account under Google's terms.</p>

  <h2>Acceptable Use</h2>
  <p>Do not misuse the service (including attempting unauthorized access, abusing email OTP, or uploading unlawful content). We may suspend accounts that harm the service or other users.</p>

  <h2>Disclaimers</h2>
  <p>The app is provided “as is.” Summaries and insights are for personal organization only and are not professional financial advice. We do not guarantee uninterrupted availability.</p>

  <h2>Limitation of Liability</h2>
  <p>To the fullest extent permitted by law, BachatCoach and its operators are not liable for indirect, incidental, or consequential damages, or for decisions you make based on data in the app.</p>

  <h2>Account Deletion</h2>
  <p>You may delete your account in Settings. Deletion is scheduled with a 7-day recovery window as described in the Privacy Policy.</p>

  <h2>Changes</h2>
  <p>We may update these Terms. Continued use after updates constitutes acceptance of the revised Terms.</p>

  <h2>Contact</h2>
  <p><a href="mailto:qjcoder@gmail.com">qjcoder@gmail.com</a></p>
  `
);
