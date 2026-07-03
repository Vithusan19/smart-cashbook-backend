const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});

// @desc    Update profile (name, avatar)
// @route   PUT /api/users/me
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, notificationsEnabled } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, message: 'Profile updated successfully.', data: user });
});

// @desc    Change password
// @route   PUT /api/users/me/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully.' });
});

// @desc    Get user by email (for friend lookup)
// @route   GET /api/users/search?email=x
// @access  Private
const searchUserByEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email query is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('name email avatar _id');
  if (!user) {
    return res.status(404).json({ success: false, message: 'No user found with that email.' });
  }

  res.json({ success: true, data: user });
});

// @desc    Get user dashboard book details only
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const Cashbook = require('../models/Cashbook');
  const Transaction = require('../models/Transaction');

  const userId = req.user._id;

  const cashbooks = await Cashbook.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });

  const books = await Promise.all(
    cashbooks.map(async (book) => {
      const stats = await Transaction.aggregate([
        { $match: { cashbook: book._id } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]);
      let income = 0;
      let expense = 0;
      stats.forEach((s) => {
        if (s._id === 'income') income = s.total;
        if (s._id === 'expense') expense = s.total;
      });
      const isOwner = book.owner._id.toString() === userId.toString();
      const memberRole = book.members.find((m) => m.user?._id?.toString() === userId.toString())?.role;
      return { ...book.toJSON(), income, expense, balance: income - expense, userRole: isOwner ? 'owner' : memberRole };
    })
  );

  res.json({
    success: true,
    data: {
      books,
      cashbookCount: books.length,
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('name email role isVerified notificationsEnabled createdAt updatedAt').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select(
    'name email role isVerified createdAt updatedAt'
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  res.json({ success: true, message: 'User role updated.', data: user });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { isVerified } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isVerified: !!isVerified }, { new: true }).select(
    'name email role isVerified createdAt updatedAt'
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  res.json({ success: true, message: 'User status updated.', data: user });
});

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  searchUserByEmail,
  getDashboardStats,
  listUsers,
  updateUserRole,
  updateUserStatus,
};
