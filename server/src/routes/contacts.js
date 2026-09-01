import express from 'express';
import Contact from '../models/Contact.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { direction } = req.query;
    const filter = { user: req.userId, isSettled: false };
    if (direction) filter.direction = direction;

    const contacts = await Contact.find(filter).sort({ updatedAt: -1 });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, direction, amount, note } = req.body;
    if (!name || !direction || !amount) {
      return res.status(400).json({ message: 'Name, direction and amount are required' });
    }

    const entryType = direction === 'i_lent' ? 'lent' : 'received';
    const contact = await Contact.create({
      user: req.userId,
      name,
      phone,
      direction,
      entries: [{ type: entryType, amount, note }],
    });

    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/entry', async (req, res, next) => {
  try {
    const { type, amount, note, date } = req.body;
    const contact = await Contact.findOne({ _id: req.params.id, user: req.userId });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    contact.entries.push({ type, amount, note, date: date ? new Date(date) : new Date() });

    const balance = contact.balance;
    if (balance <= 0) contact.isSettled = true;

    await contact.save();
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/settle', async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isSettled: true },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

export default router;
