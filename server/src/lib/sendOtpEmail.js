/**
 * Send OTP email via Resend when RESEND_API_KEY is set.
 * Otherwise log the code to the console (local/dev fallback).
 */
export async function sendOtpEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'BachatCoach <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[Email OTP] ${email} → code ${code} (RESEND_API_KEY not set; console fallback)`);
    return { mode: 'console' };
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: 'Your BachatCoach sign-in code',
    text: `Your BachatCoach verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your BachatCoach verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
<p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }

  return { mode: 'resend' };
}
