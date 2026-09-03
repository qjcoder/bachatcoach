import express from 'express';
import Contact from '../models/Contact.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

function mapContactReport(contact) {
  const direction = contact.direction;
  let totalGiven = 0;
  let totalReturned = 0;

  const entries = [...contact.entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((entry) => {
      const isOutflow =
        (direction === 'i_lent' && entry.type === 'lent') ||
        (direction === 'i_borrowed' && entry.type === 'received');
      if (isOutflow) totalGiven += entry.amount;
      else totalReturned += entry.amount;

      return {
        id: entry._id,
        type: entry.type,
        amount: entry.amount,
        note: entry.note || '',
        date: entry.date,
      };
    });

  return {
    id: contact._id,
    name: contact.name,
    nameUr: contact.nameUr || '',
    phone: contact.phone || '',
    direction,
    balance: contact.balance,
    entries,
    summary: {
      totalOutstanding: contact.balance,
      totalGiven,
      totalReturned,
    },
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

router.get('/report', async (req, res, next) => {
  try {
    const contacts = await Contact.find({ user: req.userId, isSettled: false }).sort({ direction: 1, name: 1 });

    const buildSection = (direction) => {
      const sectionContacts = contacts.filter((c) => c.direction === direction);
      let totalOutstanding = 0;
      let totalGiven = 0;
      let totalReturned = 0;

      const mapped = sectionContacts.map((contact) => {
        const report = mapContactReport(contact);
        totalOutstanding += report.balance;
        totalGiven += report.summary.totalGiven;
        totalReturned += report.summary.totalReturned;
        const { summary, direction: _dir, ...rest } = report;
        return rest;
      });

      return {
        direction,
        summary: {
          contactCount: mapped.length,
          totalOutstanding,
          totalGiven,
          totalReturned,
        },
        contacts: mapped,
      };
    };

    res.json({
      generatedAt: new Date().toISOString(),
      lent: buildSection('i_lent'),
      borrowed: buildSection('i_borrowed'),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/report', async (req, res, next) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.userId });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    res.json({
      generatedAt: new Date().toISOString(),
      contact: mapContactReport(contact),
    });
  } catch (err) {
    next(err);
  }
});

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
    const { name, nameUr, phone, direction, amount, note } = req.body;
    if (!name || !direction || !amount) {
      return res.status(400).json({ message: 'Name, direction and amount are required' });
    }

    const entryType = direction === 'i_lent' ? 'lent' : 'received';
    const contact = await Contact.create({
      user: req.userId,
      name,
      nameUr: nameUr || '',
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

router.patch('/:id', async (req, res, next) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.userId });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    const { name, nameUr, phone, amount } = req.body;
    if (typeof name === 'string' && name.trim()) contact.name = name.trim();
    if (typeof nameUr === 'string') contact.nameUr = nameUr.trim();
    if (typeof phone === 'string') contact.phone = phone.trim();

    if (amount != null && amount !== '') {
      const nextAmount = Number(amount);
      if (Number.isNaN(nextAmount) || nextAmount < 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }
      const current = contact.balance;
      const diff = nextAmount - current;
      if (diff > 0) {
        contact.entries.push({
          type: contact.direction === 'i_lent' ? 'lent' : 'received',
          amount: diff,
          note: 'Balance updated',
        });
      } else if (diff < 0) {
        contact.entries.push({
          type: contact.direction === 'i_lent' ? 'repaid' : 'paid_back',
          amount: Math.abs(diff),
          note: 'Balance updated',
        });
      }
      if (contact.balance <= 0) contact.isSettled = true;
      else contact.isSettled = false;
    }

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
