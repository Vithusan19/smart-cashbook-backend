const Split = require('../models/Split');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get splits for cashbook
// @route   GET /api/cashbooks/:id/splits
// @access  Private
const getSplits = asyncHandler(async (req, res) => {
  const splits = await Split.find({ cashbook: req.params.id })
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name')
    .populate('members.user', 'name email avatar')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: splits.length, data: splits });
});

// @desc    Get single split
// @route   GET /api/cashbooks/:id/splits/:sid
// @access  Private
const getSplit = asyncHandler(async (req, res) => {
  const split = await Split.findOne({ _id: req.params.sid, cashbook: req.params.id })
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name')
    .populate('members.user', 'name email');

  if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });
  res.json({ success: true, data: split });
});

// @desc    Create split
// @route   POST /api/cashbooks/:id/splits
// @access  Private (member or owner)
const createSplit = asyncHandler(async (req, res) => {
  const { title, totalAmount, paidBy, paidByName, members, splitType, description } = req.body;

  // Validate members shares sum
  const memberTotal = members.reduce((sum, m) => sum + parseFloat(m.share), 0);
  if (Math.abs(memberTotal - parseFloat(totalAmount)) > 0.01) {
    return res.status(400).json({
      success: false,
      message: `Member shares (${memberTotal}) must equal total amount (${totalAmount}).`,
    });
  }

  const split = await Split.create({
    cashbook: req.params.id,
    title,
    totalAmount: parseFloat(totalAmount),
    paidBy,
    paidByName,
    members: members.map((m) => ({
      user: m.userId || null,
      name: m.name,
      email: m.email || '',
      share: parseFloat(m.share),
      status: 'pending',
    })),
    splitType: splitType || 'equal',
    description: description || '',
    createdBy: req.user._id,
  });

  const populated = await split.populate('paidBy', 'name email avatar');
  res.status(201).json({ success: true, message: 'Split created.', data: populated });
});

// @desc    Update split
// @route   PUT /api/cashbooks/:id/splits/:sid
// @access  Private (creator or owner)
const updateSplit = asyncHandler(async (req, res) => {
  const split = await Split.findOne({ _id: req.params.sid, cashbook: req.params.id });
  if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

  if (split.createdBy.toString() !== req.user._id.toString() && req.userRole !== 'owner') {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this split.' });
  }

  const { title, totalAmount, paidBy, paidByName, members, splitType, description } = req.body;
  if (title !== undefined) split.title = title;
  if (totalAmount !== undefined) split.totalAmount = parseFloat(totalAmount);
  if (paidBy !== undefined) split.paidBy = paidBy;
  if (paidByName !== undefined) split.paidByName = paidByName;
  if (members !== undefined) {
    split.members = members.map((m) => ({
      user: m.userId || null,
      name: m.name,
      email: m.email || '',
      share: parseFloat(m.share),
      status: m.status || 'pending',
      paidAt: m.status === 'paid' ? new Date() : null,
    }));
  }
  if (splitType !== undefined) split.splitType = splitType;
  if (description !== undefined) split.description = description;

  await split.save();
  res.json({ success: true, message: 'Split updated.', data: split });
});

// @desc    Delete split
// @route   DELETE /api/cashbooks/:id/splits/:sid
// @access  Private (creator or owner)
const deleteSplit = asyncHandler(async (req, res) => {
  const split = await Split.findOne({ _id: req.params.sid, cashbook: req.params.id });
  if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

  if (split.createdBy.toString() !== req.user._id.toString() && req.userRole !== 'owner') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this split.' });
  }

  await split.deleteOne();
  res.json({ success: true, message: 'Split deleted.' });
});

// @desc    Mark a member as paid
// @route   PATCH /api/cashbooks/:id/splits/:sid/members/:memberId/mark-paid
// @access  Private (owner only)
const markMemberPaid = asyncHandler(async (req, res) => {
  const split = await Split.findOne({ _id: req.params.sid, cashbook: req.params.id });
  if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

  const member = split.members.id(req.params.memberId);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found in split.' });

  member.status = member.status === 'paid' ? 'pending' : 'paid';
  member.paidAt = member.status === 'paid' ? new Date() : null;
  await split.save();

  res.json({ success: true, message: `Member marked as ${member.status}.`, data: split });
});

module.exports = { getSplits, getSplit, createSplit, updateSplit, deleteSplit, markMemberPaid };
