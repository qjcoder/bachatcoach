import express from 'express';
import Contact from '../models/Contact.js';
import { auth } from '../middleware/auth.js';
import { phoneKey } from '../lib/phone.js';

const router = express.Router();

router.use(auth);

function computeBalance(direction, entries = []) {
  let total = 0;
  for (const entry of entries) {
    if (direction === 'i_lent') {
      if (entry.type === 'lent') total += entry.amount;
      if (entry.type === 'repaid') total -= entry.amount;
    } else {
      if (entry.type === 'received') total += entry.amount;
      if (entry.type === 'paid_back') total -= entry.amount;
    }
  }
  return total;
}

/** List payload — balance only, no full ledger (ledger comes from /:id/report). */
function mapContactListItem(c) {
  return {
    _id: c._id,
    name: c.name,
    nameUr: c.nameUr || '',
    phone: c.phone || '',
    phoneKey: c.phoneKey || '',
    direction: c.direction,
    isSettled: Boolean(c.isSettled),
    balance: computeBalance(c.direction, c.entries),
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  };
}

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
    const { direction, q, includeSettled } = req.query;
    const filter = { user: req.userId };
    if (includeSettled !== '1' && includeSettled !== 'true') filter.isSettled = false;
    if (direction) filter.direction = direction;

    const contacts = await Contact.find(filter)
      .select('name nameUr phone phoneKey direction isSettled entries.type entries.amount updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    const query = String(q || '').trim().toLowerCase();
    const queryDigits = phoneKey(query);

    const filtered = query
      ? contacts.filter((c) => {
          const name = `${c.name || ''} ${c.nameUr || ''}`.toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          const key = c.phoneKey || phoneKey(c.phone);
          if (name.includes(query) || phone.includes(query)) return true;
          if (queryDigits && key.includes(queryDigits)) return true;
          return false;
        })
      : contacts;

    res.json(filtered.map(mapContactListItem));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, nameUr, phone, direction, amount, note } = req.body;
    if (!name || !direction) {
      return res.status(400).json({ message: 'Name and direction are required' });
    }

    const key = phoneKey(phone);
    if (!key) {
      return res.status(400).json({
        message: 'Phone number is required',
        code: 'PHONE_REQUIRED',
      });
    }

    let existing = await Contact.findOne({ user: req.userId, phoneKey: key });
    if (!existing) {
      // Legacy rows may lack phoneKey — narrow scan only when needed
      const withPhone = await Contact.find({
        user: req.userId,
        phone: { $ne: '' },
        $or: [{ phoneKey: '' }, { phoneKey: { $exists: false } }],
      }).select('phone direction name nameUr phoneKey entries isSettled');
      existing = withPhone.find((c) => phoneKey(c.phone) === key) || null;
    }
    const amt = Number(amount);
    const hasAmount = amount != null && amount !== '' && !Number.isNaN(amt) && amt > 0;
    const entryType = direction === 'i_lent' ? 'lent' : 'received';

    if (existing) {
      if (existing.direction !== direction) {
        return res.status(409).json({
          message: 'This phone number is already saved for this person',
          code: 'PHONE_TAKEN',
          direction: existing.direction,
        });
      }

      existing.name = String(name).trim();
      if (typeof nameUr === 'string') existing.nameUr = nameUr.trim();
      existing.phone = String(phone).trim();
      if (hasAmount) {
        existing.entries.push({ type: entryType, amount: amt, note: note || '' });
      }
      existing.isSettled = existing.balance <= 0;
      await existing.save();
      return res.status(200).json(existing);
    }

    const contact = await Contact.create({
      user: req.userId,
      name,
      nameUr: nameUr || '',
      phone: String(phone).trim(),
      direction,
      entries: hasAmount ? [{ type: entryType, amount: amt, note }] : [],
    });

    res.status(201).json(contact);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: 'This phone number is already saved for this person',
        code: 'PHONE_TAKEN',
      });
    }
    next(err);
  }
});

router.post('/:id/entry', async (req, res, next) => {
  try {
    const { type, amount, note, date } = req.body;
    const contact = await Contact.findOne({ _id: req.params.id, user: req.userId });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const entryType =
      type || (contact.direction === 'i_lent' ? 'lent' : 'received');

    contact.entries.push({
      type: entryType,
      amount: amt,
      note,
      date: date ? new Date(date) : new Date(),
    });
    contact.isSettled = contact.balance <= 0;

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
    if (typeof phone === 'string') {
      const nextKey = phoneKey(phone);
      if (!nextKey) {
        return res.status(400).json({
          message: 'Phone number is required',
          code: 'PHONE_REQUIRED',
        });
      }
      const clash = await Contact.findOne({
        user: req.userId,
        phoneKey: nextKey,
        _id: { $ne: contact._id },
      });
      if (clash) {
        return res.status(409).json({
          message: 'This phone number is already saved for this person',
          code: 'PHONE_TAKEN',
          direction: clash.direction,
        });
      }
      contact.phone = phone.trim();
    }

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
