import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

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
  };
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
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: userResponse(user) });
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
