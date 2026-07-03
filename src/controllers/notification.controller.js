const Notification = require('../models/Notification');
const Split = require('../models/Split');
const Cashbook = require('../models/Cashbook');
const asyncHandler = require('../utils/asyncHandler');
const { sendSplitReminderEmail } = require('../services/email.service');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'name avatar');

  res.json({ success: true, data: notifications });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true });
  res.json({ success: true, message: 'Marked as read.' });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

const acceptCashbookInvite = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
    type: 'cashbook_invite',
    'metadata.status': 'pending',
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Pending invitation not found.' });
  }

  const cashbook = await Cashbook.findById(notification.metadata.cashbookId);
  if (!cashbook) {
    notification.metadata.status = 'declined';
    notification.read = true;
    await notification.save();
    return res.status(404).json({ success: false, message: 'This share book no longer exists.' });
  }

  const isOwner = cashbook.owner.toString() === req.user._id.toString();
  const alreadyMember = cashbook.members.some((m) => m.user.toString() === req.user._id.toString());

  if (!isOwner && !alreadyMember) {
    cashbook.members.push({
      user: req.user._id,
      role: notification.metadata.role || 'member',
    });
    await cashbook.save();
  }

  notification.metadata.status = 'accepted';
  notification.read = true;
  await notification.save();

  if (notification.sender) {
    await Notification.create({
      recipient: notification.sender,
      sender: req.user._id,
      type: 'general',
      title: 'Invitation Accepted',
      message: `${req.user.name} accepted your invitation to "${cashbook.name}".`,
      metadata: { cashbookId: cashbook._id },
    });
  }

  res.json({ success: true, message: `You joined "${cashbook.name}".`, data: cashbook });
});

const declineCashbookInvite = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
    type: 'cashbook_invite',
    'metadata.status': 'pending',
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Pending invitation not found.' });
  }

  notification.metadata.status = 'declined';
  notification.read = true;
  await notification.save();

  res.json({ success: true, message: 'Invitation declined.' });
});

// @desc    Send split reminder email to a specific member
// @route   POST /api/notifications/split-reminder
// @access  Private (cashbook owner)
const sendSplitReminder = asyncHandler(async (req, res) => {
  const { splitId, memberId, cashbookId } = req.body;

  const [split, cashbook] = await Promise.all([
    Split.findById(splitId).populate('paidBy', 'name'),
    Cashbook.findById(cashbookId),
  ]);

  if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });
  if (!cashbook) return res.status(404).json({ success: false, message: 'Cashbook not found.' });

  // Only owner can send reminders
  if (cashbook.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the owner can send reminders.' });
  }

  const member = split.members.id(memberId);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
  if (!member.email) return res.status(400).json({ success: false, message: 'Member has no email address.' });

  await sendSplitReminderEmail({
    recipientEmail: member.email,
    recipientName: member.name,
    cashbookName: cashbook.name,
    splitTitle: split.title,
    amountOwed: member.share,
    paidByName: split.paidByName,
    status: member.status,
    currency: cashbook.currency,
  });

  // Create in-app notification if user is registered
  if (member.user) {
    await Notification.create({
      recipient: member.user,
      sender: req.user._id,
      type: 'split_reminder',
      title: 'Payment Reminder',
      message: `${req.user.name} reminded you about "${split.title}" — you owe ${cashbook.currency} ${member.share}.`,
      metadata: { cashbookId: cashbook._id, splitId: split._id },
    });
  }

  res.json({ success: true, message: `Reminder sent to ${member.email}.` });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  res.json({ success: true, message: 'Notification deleted.' });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  acceptCashbookInvite,
  declineCashbookInvite,
  sendSplitReminder,
  deleteNotification,
};
