import User from '../models/User.js';

export const ACCOUNT_DELETION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function deletionDueDate(from = new Date()) {
  return new Date(from.getTime() + ACCOUNT_DELETION_GRACE_MS);
}

export async function purgeUserData(userId) {
  const { default: Transaction } = await import('../models/Transaction.js');
  const { default: Contact } = await import('../models/Contact.js');
  const { default: Goal } = await import('../models/Goal.js');

  await Promise.all([
    Transaction.deleteMany({ user: userId }),
    Contact.deleteMany({ user: userId }),
    Goal.deleteMany({ user: userId }),
  ]);
  await User.findByIdAndDelete(userId);
}

/** Permanently remove accounts whose 7-day recovery window has ended. */
export async function purgeExpiredDeletions() {
  const due = await User.find({
    deletionScheduledAt: { $ne: null, $lte: new Date() },
  }).select('_id');

  for (const user of due) {
    await purgeUserData(user._id);
  }
  return due.length;
}

/**
 * Cancel a pending deletion if still within the 7-day recovery window.
 * Call only after confirming deletionScheduledAt is in the future (or use finalizeSignIn).
 */
export async function resolvePendingDeletion(user) {
  if (!user?.deletionScheduledAt) {
    return { user, restored: false, purged: false };
  }

  user.deletionScheduledAt = null;
  await user.save();
  return { user, restored: true, purged: false };
}
