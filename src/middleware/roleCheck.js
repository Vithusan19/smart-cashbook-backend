const Cashbook = require('../models/Cashbook');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Checks if the authenticated user is the owner or has any role in the cashbook.
 * Attaches req.cashbook and req.userRole.
 */
const requireCashbookAccess = asyncHandler(async (req, res, next) => {
  const cashbook = await Cashbook.findById(req.params.id || req.params.cashbookId);
  if (!cashbook) {
    return res.status(404).json({ success: false, message: 'Cashbook not found.' });
  }

  const userId = req.user._id.toString();
  const isOwner = cashbook.owner.toString() === userId;
  const memberEntry = cashbook.members.find((m) => m.user.toString() === userId);

  if (!isOwner && !memberEntry) {
    return res.status(403).json({ success: false, message: 'You do not have access to this cashbook.' });
  }

  req.cashbook = cashbook;
  req.userRole = isOwner ? 'owner' : memberEntry.role;
  next();
});

/**
 * Only the owner can perform this action.
 */
const requireOwner = asyncHandler(async (req, res, next) => {
  const cashbook = await Cashbook.findById(req.params.id || req.params.cashbookId);
  if (!cashbook) {
    return res.status(404).json({ success: false, message: 'Cashbook not found.' });
  }

  if (cashbook.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the cashbook owner can perform this action.' });
  }

  req.cashbook = cashbook;
  req.userRole = 'owner';
  next();
});

/**
 * Owner or member can write (add/edit/delete transactions, splits).
 */
const requireMemberOrOwner = asyncHandler(async (req, res, next) => {
  const cashbook = await Cashbook.findById(req.params.id || req.params.cashbookId);
  if (!cashbook) {
    return res.status(404).json({ success: false, message: 'Cashbook not found.' });
  }

  const userId = req.user._id.toString();
  const isOwner = cashbook.owner.toString() === userId;
  const memberEntry = cashbook.members.find((m) => m.user.toString() === userId);

  if (!isOwner && !memberEntry) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const role = isOwner ? 'owner' : memberEntry.role;
  if (role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot modify cashbook data.' });
  }

  req.cashbook = cashbook;
  req.userRole = role;
  next();
});

module.exports = { requireCashbookAccess, requireOwner, requireMemberOrOwner };
