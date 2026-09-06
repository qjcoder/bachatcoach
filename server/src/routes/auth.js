import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User, { randomUnusedPassword } from '../models/User.js';
import EmailOtp, {
  generateOtpCode,
  hashOtpCode,
  otpExpiryDate,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
} from '../models/EmailOtp.js';
import { sendOtpEmail } from '../lib/sendOtpEmail.js';
import { auth } from '../middleware/auth.js';
import {
  deletionDueDate,
  purgeExpiredDeletions,
  purgeUserData,
  resolvePendingDeletion,
} from '../lib/accountDeletion.js';

const router = express.Router();
const googleClient = new OAuth2Client();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

function allowedGoogleAudiences() {
  return String(process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    nameUr: user.nameUr || '',
    email: user.email,
    language: user.language,
    currency: user.currency,
    salaryDay: user.salaryDay,
    avatar: user.avatar || '',
    googleLinked: Boolean(user.googleId),
    backupEnabled: Boolean(user.backupEnabled),
    backupFrequency: user.backupFrequency || 'off',
    lastBackupAt: user.lastBackupAt || null,
    deletionScheduledAt: user.deletionScheduledAt || null,
  };
}

/** Login / Google / OTP: restore within grace period, or purge if expired. */
async function finalizeSignIn(user) {
  if (!user) return { user: null, restored: false, purged: false };

  if (user.deletionScheduledAt && new Date(user.deletionScheduledAt) <= new Date()) {
    await purgeUserData(user._id);
    return { user: null, restored: false, purged: true };
  }

  return resolvePendingDeletion(user);
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, nameUr, email, password, language, currency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      nameUr: nameUr || '',
      email,
      password,
      language: language || 'en',
      currency: currency ? String(currency).toUpperCase() : 'PKR',
    });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const found = await User.findOne({ email });
    if (!found || !(await found.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { user, restored, purged } = await finalizeSignIn(found);
    if (purged || !user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: userResponse(user),
      restoredFromDeletion: restored,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { idToken, authCode, language, currency } = req.body;
    if (!idToken && !authCode) {
      return res.status(400).json({ message: 'Google idToken or authCode is required' });
    }

    const audiences = allowedGoogleAudiences();
    if (!audiences.length) {
      return res.status(503).json({
        message: 'Google Sign-In is not configured. Set GOOGLE_CLIENT_IDS on the server.',
      });
    }

    let payload;

    if (authCode) {
      // Exchange auth code for tokens on the server side
      const webClientId = (process.env.GOOGLE_CLIENT_IDS || '').split(',')[0]?.trim();
      const webClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      if (!webClientId || !webClientSecret) {
        return res.status(503).json({
          message: 'Server is not configured for auth code exchange. Set GOOGLE_CLIENT_SECRET.',
        });
      }
      const { OAuth2Client: OC } = await import('google-auth-library');
      const oauthClient = new OC(webClientId, webClientSecret);
      const { tokens } = await oauthClient.getToken({
        code: authCode,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://auth.expo.io/@anonymous/bachatcoach',
      });
      if (!tokens.id_token) {
        return res.status(401).json({ message: 'Auth code exchange did not return id_token' });
      }
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    }

    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const googleId = payload.sub;
    const email = String(payload.email).toLowerCase();
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || '';

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      if (name && user.name === user.email.split('@')[0]) user.name = name;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        password: randomUnusedPassword(),
        avatar,
        language: language || 'en',
        currency: currency ? String(currency).toUpperCase() : 'PKR',
      });
    }

    const resolved = await finalizeSignIn(user);
    if (resolved.purged || !resolved.user) {
      return res.status(401).json({ message: 'No account found for this Google sign-in' });
    }

    const token = signToken(resolved.user._id);
    res.json({
      token,
      user: userResponse(resolved.user),
      restoredFromDeletion: resolved.restored,
    });
  } catch (err) {
    if (err?.message?.includes('Wrong number of segments') || err?.message?.includes('Token used too early')) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    next(err);
  }
});

router.post('/otp/send', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === 'register' ? 'register' : 'login';

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    if (purpose === 'login') {
      const existing = await User.findOne({ email });
      if (!existing) {
        return res.status(404).json({ message: 'No account found. Create an account first.' });
      }
      if (existing.deletionScheduledAt && new Date(existing.deletionScheduledAt) <= new Date()) {
        await purgeUserData(existing._id);
        return res.status(404).json({ message: 'No account found. Create an account first.' });
      }
    }

    const recent = await EmailOtp.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - new Date(recent.createdAt).getTime())) / 1000
      );
      return res.status(429).json({
        message: `Please wait ${waitSec}s before requesting another code`,
        retryAfterSec: waitSec,
      });
    }

    const code = generateOtpCode();
    await EmailOtp.deleteMany({ email, purpose });
    await EmailOtp.create({
      email,
      purpose,
      codeHash: hashOtpCode(code),
      expiresAt: otpExpiryDate(),
      attempts: 0,
    });

    const { mode } = await sendOtpEmail(email, code);

    const payload = {
      message: 'Verification code sent',
      email,
      purpose,
      expiresInSec: 600,
    };
    if (process.env.NODE_ENV === 'development' && mode === 'console') {
      payload.devCode = code;
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.post('/otp/verify', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const purpose = req.body.purpose === 'register' ? 'register' : 'login';
    const { name, nameUr, language, currency } = req.body;

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter the 6-digit code' });
    }

    const record = await EmailOtp.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ message: 'No code found. Request a new one.' });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await EmailOtp.deleteMany({ email, purpose });
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await EmailOtp.deleteMany({ email, purpose });
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }

    if (record.codeHash !== hashOtpCode(code)) {
      record.attempts += 1;
      await record.save();
      const left = MAX_ATTEMPTS - record.attempts;
      return res.status(401).json({
        message: left > 0 ? `Invalid code. ${left} attempts left.` : 'Too many attempts. Request a new code.',
      });
    }

    await EmailOtp.deleteMany({ email, purpose });

    let user = await User.findOne({ email });

    if (purpose === 'login') {
      if (!user) {
        return res.status(404).json({ message: 'No account found. Create an account first.' });
      }
    } else if (!user) {
      const displayName = String(name || '').trim();
      if (!displayName) {
        return res.status(400).json({ message: 'Name is required to create an account' });
      }
      user = await User.create({
        name: displayName,
        nameUr: nameUr ? String(nameUr).trim() : '',
        email,
        password: randomUnusedPassword(),
        language: language || 'en',
        currency: currency ? String(currency).toUpperCase() : 'PKR',
      });
    }

    const resolved = await finalizeSignIn(user);
    if (resolved.purged || !resolved.user) {
      return res.status(404).json({ message: 'No account found. Create an account first.' });
    }

    const token = signToken(resolved.user._id);
    res.json({
      token,
      user: userResponse(resolved.user),
      restoredFromDeletion: resolved.restored,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    let user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.deletionScheduledAt && new Date(user.deletionScheduledAt) <= new Date()) {
      await purgeExpiredDeletions();
      return res.status(401).json({ message: 'Account deleted' });
    }

    res.json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/account', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const due = deletionDueDate();
    user.deletionScheduledAt = due;
    await user.save();

    res.json({
      message: 'Account scheduled for deletion',
      deletionScheduledAt: due,
      graceDays: 7,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', auth, async (req, res, next) => {
  try {
    const { currency, language, name, nameUr, avatar } = req.body;
    const updates = {};
    if (currency) updates.currency = String(currency).toUpperCase();
    if (language) updates.language = language;
    if (name) updates.name = String(name).trim();
    if (nameUr !== undefined) updates.nameUr = String(nameUr).trim();
    if (avatar !== undefined) {
      if (avatar && String(avatar).length > 3_000_000) {
        return res.status(400).json({ message: 'Profile image is too large' });
      }
      updates.avatar = avatar ? String(avatar) : '';
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
