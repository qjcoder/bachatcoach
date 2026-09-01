/**
 * Seed demo account + sample data for BachatCoach
 * Run: npm run seed:demo
 *
 * Login credentials:
 *   Email:    demo@bachatcoach.app
 *   Password: demo123
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Transaction from '../src/models/Transaction.js';
import Contact from '../src/models/Contact.js';
import Goal from '../src/models/Goal.js';

const DEMO_EMAIL = 'demo@bachatcoach.app';
const DEMO_PASSWORD = 'demo123';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dayOfMonth(day, monthOffset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset, day);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function clearDemoData() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (!existing) return;

  await Promise.all([
    Transaction.deleteMany({ user: existing._id }),
    Contact.deleteMany({ user: existing._id }),
    Goal.deleteMany({ user: existing._id }),
    User.deleteOne({ _id: existing._id }),
  ]);
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bachatcoach';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await clearDemoData();

  const user = await User.create({
    name: 'Ahmed Khan',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    language: 'ur',
    currency: 'PKR',
    salaryDay: 1,
  });

  const transactions = [
    // Current month — income
    { type: 'income', amount: 150000, category: 'salary', paymentMethod: 'bank', note: 'September salary', date: dayOfMonth(1) },
    { type: 'income', amount: 25000, category: 'freelance', paymentMethod: 'jazzcash', note: 'Logo design project', date: dayOfMonth(5) },

    // Current month — expenses
    { type: 'expense', amount: 45000, category: 'rent', paymentMethod: 'bank', note: 'Apartment rent', date: dayOfMonth(1) },
    { type: 'expense', amount: 8500, category: 'food', paymentMethod: 'cash', note: 'Groceries — Al-Fatah', date: daysAgo(2) },
    { type: 'expense', amount: 3200, category: 'food', paymentMethod: 'easypaisa', note: 'Lunch & dinner', date: daysAgo(1) },
    { type: 'expense', amount: 4500, category: 'transport', paymentMethod: 'cash', note: 'Careem rides', date: daysAgo(3) },
    { type: 'expense', amount: 2800, category: 'transport', paymentMethod: 'cash', note: 'Petrol', date: daysAgo(5) },
    { type: 'expense', amount: 12000, category: 'bills', paymentMethod: 'bank', note: 'Electricity + gas', date: dayOfMonth(3) },
    { type: 'expense', amount: 2500, category: 'bills', paymentMethod: 'jazzcash', note: 'Mobile recharge', date: dayOfMonth(4) },
    { type: 'expense', amount: 6500, category: 'shopping', paymentMethod: 'card', note: 'Clothes — Sapphire', date: daysAgo(4) },
    { type: 'expense', amount: 1800, category: 'entertainment', paymentMethod: 'card', note: 'Netflix + Spotify', date: dayOfMonth(2) },
    { type: 'expense', amount: 3500, category: 'subscriptions', paymentMethod: 'card', note: 'Gym membership', date: dayOfMonth(1) },
    { type: 'expense', amount: 2000, category: 'health', paymentMethod: 'cash', note: 'Pharmacy', date: daysAgo(6) },
    { type: 'expense', amount: 15000, category: 'savings', paymentMethod: 'bank', note: 'Monthly savings transfer', date: dayOfMonth(2) },

    // Last month — for insights comparison
    { type: 'income', amount: 150000, category: 'salary', paymentMethod: 'bank', note: 'August salary', date: dayOfMonth(1, -1) },
    { type: 'income', amount: 10000, category: 'gift', paymentMethod: 'cash', note: 'Eid gift from uncle', date: dayOfMonth(15, -1) },
    { type: 'expense', amount: 45000, category: 'rent', paymentMethod: 'bank', note: 'August rent', date: dayOfMonth(1, -1) },
    { type: 'expense', amount: 22000, category: 'food', paymentMethod: 'cash', note: 'August groceries & dining', date: dayOfMonth(10, -1) },
    { type: 'expense', amount: 15000, category: 'food', paymentMethod: 'cash', note: 'Eid groceries', date: dayOfMonth(14, -1) },
    { type: 'expense', amount: 9500, category: 'transport', paymentMethod: 'cash', note: 'August transport', date: dayOfMonth(12, -1) },
    { type: 'expense', amount: 11000, category: 'bills', paymentMethod: 'bank', note: 'August utilities', date: dayOfMonth(5, -1) },
    { type: 'expense', amount: 18000, category: 'shopping', paymentMethod: 'card', note: 'Eid shopping', date: dayOfMonth(13, -1) },
    { type: 'expense', amount: 8000, category: 'entertainment', paymentMethod: 'cash', note: 'Eid outings', date: dayOfMonth(16, -1) },
    { type: 'expense', amount: 12000, category: 'savings', paymentMethod: 'bank', note: 'August savings', date: dayOfMonth(3, -1) },
  ];

  await Transaction.insertMany(
    transactions.map((t) => ({ ...t, user: user._id }))
  );

  await Contact.insertMany([
    {
      user: user._id,
      name: 'Ali Hassan',
      phone: '03001234567',
      direction: 'i_lent',
      entries: [
        { type: 'lent', amount: 15000, note: 'Emergency medical expenses', date: daysAgo(45) },
        { type: 'repaid', amount: 5000, note: 'First installment', date: daysAgo(12) },
      ],
    },
    {
      user: user._id,
      name: 'Sana Malik',
      phone: '03219876543',
      direction: 'i_lent',
      entries: [{ type: 'lent', amount: 8000, note: 'Laptop repair loan', date: daysAgo(20) }],
    },
    {
      user: user._id,
      name: 'Usman Ali',
      phone: '03335556677',
      direction: 'i_borrowed',
      entries: [
        { type: 'received', amount: 20000, note: 'Borrowed for rent', date: daysAgo(30) },
        { type: 'paid_back', amount: 5000, note: 'Partial repayment', date: daysAgo(8) },
      ],
    },
    {
      user: user._id,
      name: 'Fatima Khan',
      phone: '03447778899',
      direction: 'i_borrowed',
      entries: [{ type: 'received', amount: 5000, note: 'Quick cash need', date: daysAgo(5) }],
    },
  ]);

  const nextEid = new Date();
  nextEid.setMonth(nextEid.getMonth() + 4);

  await Goal.insertMany([
    {
      user: user._id,
      title: 'Emergency Fund',
      titleUr: 'ایمرجنسی فنڈ',
      targetAmount: 100000,
      currentAmount: 45000,
      deadline: new Date(new Date().getFullYear(), 11, 31),
      icon: 'shield',
    },
    {
      user: user._id,
      title: 'New Bike',
      titleUr: 'نئی موٹر سائیکل',
      targetAmount: 80000,
      currentAmount: 22000,
      deadline: new Date(new Date().getFullYear(), 9, 1),
      icon: 'bike',
    },
    {
      user: user._id,
      title: 'Eid Shopping',
      titleUr: 'عید کی شاپنگ',
      targetAmount: 30000,
      currentAmount: 12000,
      deadline: nextEid,
      icon: 'gift',
    },
  ]);

  console.log('\n✅ Demo data seeded successfully!\n');
  console.log('   Email:    demo@bachatcoach.app');
  console.log('   Password: demo123');
  console.log('\n   Data includes:');
  console.log('   • 22 transactions (current + last month)');
  console.log('   • 4 loan contacts (2 lent, 2 borrowed)');
  console.log('   • 3 savings goals\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
