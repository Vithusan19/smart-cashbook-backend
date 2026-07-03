const Cashbook = require('../models/Cashbook');
const Transaction = require('../models/Transaction');
const Split = require('../models/Split');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { sendCashbookInviteEmail } = require('../services/email.service');

const parseInviteMembers = (members = [], ownerEmail = '') => {
  const seen = new Set();
  return (Array.isArray(members) ? members : [])
    .map((m) => ({
      email: String(m.email || '').toLowerCase().trim(),
      role: ['member', 'viewer'].includes(m.role) ? m.role : 'member',
    }))
    .filter((m) => {
      if (!m.email || m.email === ownerEmail || seen.has(m.email)) return false;
      seen.add(m.email);
      return true;
    });
};

const validateInviteUsers = async (invites) => {
  if (!invites.length) return { users: [], missingEmails: [] };
  const users = await User.find({ email: { $in: invites.map((m) => m.email) } }).select('name email');
  const foundEmails = new Set(users.map((u) => u.email));
  return {
    users,
    missingEmails: invites.map((m) => m.email).filter((email) => !foundEmails.has(email)),
  };
};

const createCashbookInvites = async ({ cashbook, users, invites, sender }) => {
  const created = [];

  for (const invitedUser of users) {
    const role = invites.find((m) => m.email === invitedUser.email)?.role || 'member';
    const alreadyMember =
      cashbook.owner.toString() === invitedUser._id.toString() ||
      cashbook.members.some((m) => m.user.toString() === invitedUser._id.toString());

    if (alreadyMember) continue;

    const existingPending = await Notification.findOne({
      recipient: invitedUser._id,
      sender: sender._id,
      type: 'cashbook_invite',
      'metadata.cashbookId': cashbook._id,
      'metadata.status': 'pending',
    });

    if (existingPending) continue;

    const notification = await Notification.create({
      recipient: invitedUser._id,
      sender: sender._id,
      type: 'cashbook_invite',
      title: 'Share Book Invitation',
      message: `${sender.name} invited you to join "${cashbook.name}" as a ${role}.`,
      metadata: { cashbookId: cashbook._id, role, status: 'pending' },
    });
    created.push(notification);

    sendCashbookInviteEmail({
      recipientEmail: invitedUser.email,
      recipientName: invitedUser.name,
      inviterName: sender.name,
      cashbookName: cashbook.name,
      role,
    }).catch(console.error);
  }

  return created;
};

// @desc    Get all cashbooks (owned + member)
// @route   GET /api/cashbooks
// @access  Private
const getCashbooks = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const userId = req.user._id;

  const query = {
    $or: [{ owner: userId }, { 'members.user': userId }],
  };

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const cashbooks = await Cashbook.find(query)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });

  // Attach transaction summary per book
  const booksWithStats = await Promise.all(
    cashbooks.map(async (book) => {
      const stats = await Transaction.aggregate([
        { $match: { cashbook: book._id } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]);
      let income = 0, expense = 0;
      stats.forEach((s) => { if (s._id === 'income') income = s.total; else expense = s.total; });
      return { ...book.toJSON(), income, expense, balance: income - expense };
    })
  );

  res.json({ success: true, count: booksWithStats.length, data: booksWithStats });
});

// @desc    Get single cashbook
// @route   GET /api/cashbooks/:id
// @access  Private (owner/member/viewer)
const getCashbook = asyncHandler(async (req, res) => {
  const cashbook = req.cashbook; // set by roleCheck middleware
  await cashbook.populate('owner', 'name email avatar');
  await cashbook.populate('members.user', 'name email avatar');

  const stats = await Transaction.aggregate([
    { $match: { cashbook: cashbook._id } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  let income = 0, expense = 0;
  stats.forEach((s) => { if (s._id === 'income') income = s.total; else expense = s.total; });

  res.json({
    success: true,
    data: { ...cashbook.toJSON(), income, expense, balance: income - expense, userRole: req.userRole },
  });
});

// @desc    Create cashbook
// @route   POST /api/cashbooks
// @access  Private
const createCashbook = asyncHandler(async (req, res) => {
  const { name, description, currency, color, icon, members = [], bookType = 'personal' } = req.body;
  const normalizedBookType = bookType === 'shared' ? 'shared' : 'personal';
  const normalizedMembers = normalizedBookType === 'shared' ? parseInviteMembers(members, req.user.email) : [];
  const { users: memberUsers, missingEmails } = await validateInviteUsers(normalizedMembers);

  if (missingEmails.length) {
    return res.status(400).json({
      success: false,
      message: `These emails are not registered: ${missingEmails.join(', ')}.`,
      missingEmails,
    });
  }

  const cashbook = await Cashbook.create({
    name,
    description,
    currency: currency || 'USD',
    bookType: normalizedBookType,
    color: color || '#6366f1',
    icon: icon || 'book',
    owner: req.user._id,
    members: [],
  });

  const invites = await createCashbookInvites({ cashbook, users: memberUsers, invites: normalizedMembers, sender: req.user });

  res.status(201).json({
    success: true,
    message: invites.length
      ? `Share book created. ${invites.length} invitation${invites.length === 1 ? '' : 's'} sent.`
      : normalizedBookType === 'shared'
        ? 'Share book created successfully.'
        : 'Personal cashbook created successfully.',
    data: cashbook,
  });
});

// @desc    Update cashbook
// @route   PUT /api/cashbooks/:id
// @access  Private (owner only)
const updateCashbook = asyncHandler(async (req, res) => {
  const { name, description, currency, color, icon, bookType } = req.body;
  const updateData = { name, description, currency, color, icon };
  if (bookType && ['personal', 'shared'].includes(bookType)) updateData.bookType = bookType;

  const cashbook = await Cashbook.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({ success: true, message: 'Cashbook updated.', data: cashbook });
});

// @desc    Delete cashbook
// @route   DELETE /api/cashbooks/:id
// @access  Private (owner only)
const deleteCashbook = asyncHandler(async (req, res) => {
  const cashbookId = req.params.id;

  await Transaction.deleteMany({ cashbook: cashbookId });
  await Split.deleteMany({ cashbook: cashbookId });
  await Cashbook.findByIdAndDelete(cashbookId);

  res.json({ success: true, message: 'Cashbook and all its data deleted.' });
});

// @desc    Add member to cashbook by email
// @route   POST /api/cashbooks/:id/members
// @access  Private (owner only)
const addMember = asyncHandler(async (req, res) => {
  const { email, role = 'viewer' } = req.body;
  const cashbook = req.cashbook;

  if (email === req.user.email) {
    return res.status(400).json({ success: false, message: 'You cannot add yourself.' });
  }

  const newUser = await User.findOne({ email: email.toLowerCase() });
  if (!newUser) {
    return res.status(404).json({ success: false, message: 'No registered user found with that email.' });
  }

  const alreadyMember = cashbook.members.some((m) => m.user.toString() === newUser._id.toString());
  if (alreadyMember || cashbook.owner.toString() === newUser._id.toString()) {
    return res.status(400).json({ success: false, message: 'User is already a member of this cashbook.' });
  }

  const pendingInvite = await Notification.findOne({
    recipient: newUser._id,
    type: 'cashbook_invite',
    'metadata.cashbookId': cashbook._id,
    'metadata.status': 'pending',
  });
  if (pendingInvite) {
    return res.status(400).json({ success: false, message: 'This user already has a pending invitation.' });
  }

  const invites = await createCashbookInvites({
    cashbook,
    users: [newUser],
    invites: [{ email: newUser.email, role }],
    sender: req.user,
  });

  if (invites.length && cashbook.bookType !== 'shared') {
    cashbook.bookType = 'shared';
    await cashbook.save();
  }

  res.json({ success: true, message: `Invitation sent to ${newUser.name}.`, data: { invited: invites.length } });
});

// @desc    Remove member from cashbook
// @route   DELETE /api/cashbooks/:id/members/:userId
// @access  Private (owner only)
const removeMember = asyncHandler(async (req, res) => {
  const cashbook = req.cashbook;
  const { userId } = req.params;

  cashbook.members = cashbook.members.filter((m) => m.user.toString() !== userId);
  await cashbook.save();

  res.json({ success: true, message: 'Member removed from cashbook.' });
});

// @desc    Get shared cashbooks (user is a member, not owner)
// @route   GET /api/cashbooks/shared
// @access  Private
const getSharedCashbooks = asyncHandler(async (req, res) => {
  const cashbooks = await Cashbook.find({
    'members.user': req.user._id,
    owner: { $ne: req.user._id },
  })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });

  res.json({ success: true, count: cashbooks.length, data: cashbooks });
});

module.exports = { getCashbooks, getCashbook, createCashbook, updateCashbook, deleteCashbook, addMember, removeMember, getSharedCashbooks };
