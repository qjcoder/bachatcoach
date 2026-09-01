import express from 'express';
import Goal from '../models/Goal.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.userId, isCompleted: false }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, titleUr, targetAmount, deadline, icon } = req.body;
    if (!title || !targetAmount) {
      return res.status(400).json({ message: 'Title and target amount are required' });
    }

    const goal = await Goal.create({
      user: req.userId,
      title,
      titleUr,
      targetAmount,
      deadline,
      icon,
    });

    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/contribute', async (req, res, next) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.currentAmount += Number(amount);
    if (goal.currentAmount >= goal.targetAmount) {
      goal.currentAmount = goal.targetAmount;
      goal.isCompleted = true;
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

export default router;
