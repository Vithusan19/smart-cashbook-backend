const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all transactions for a cashbook (with filters + search)
// @route   GET /api/cashbooks/:id/transactions
// @access  Private (cashbook access)
const getTransactions = asyncHandler(async (req, res) => {
  const { type, category, startDate, endDate, search, page = 1, limit = 50 } = req.query;
  const cashbookId = req.params.id;

  const filter = { cashbook: cashbookId };
  if (type && ['income', 'expense'].includes(type)) filter.type = type;
  if (category) filter.category = { $regex: category, $options: 'i' };
  if (search) filter.description = { $regex: search, $options: 'i' };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name avatar'),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: transactions.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: transactions,
  });
});

// @desc    Get summary (income/expense/balance)
// @route   GET /api/cashbooks/:id/transactions/summary
// @access  Private
const getTransactionSummary = asyncHandler(async (req, res) => {
  const cashbookId = req.params.id;

  const summary = await Transaction.aggregate([
    { $match: { cashbook: require('mongoose').Types.ObjectId.createFromHexString(cashbookId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const categoryBreakdown = await Transaction.aggregate([
    { $match: { cashbook: require('mongoose').Types.ObjectId.createFromHexString(cashbookId) } },
    { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
  summary.forEach((s) => {
    if (s._id === 'income') { income = s.total; incomeCount = s.count; }
    if (s._id === 'expense') { expense = s.total; expenseCount = s.count; }
  });

  res.json({
    success: true,
    data: {
      income,
      expense,
      balance: income - expense,
      incomeCount,
      expenseCount,
      categoryBreakdown,
    },
  });
});

// @desc    Add transaction
// @route   POST /api/cashbooks/:id/transactions
// @access  Private (member or owner)
const createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, date, description, category, paymentMethod } = req.body;

  const transaction = await Transaction.create({
    cashbook: req.params.id,
    type,
    amount: parseFloat(amount),
    date: date || new Date(),
    description,
    category: category || 'General',
    paymentMethod: paymentMethod || 'cash',
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Transaction added.', data: transaction });
});

// @desc    Update transaction
// @route   PUT /api/cashbooks/:id/transactions/:tid
// @access  Private (creator or owner)
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.tid,
    cashbook: req.params.id,
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }

  // Only creator or cashbook owner can edit
  if (
    transaction.createdBy.toString() !== req.user._id.toString() &&
    req.userRole !== 'owner'
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this transaction.' });
  }

  const { type, amount, date, description, category, paymentMethod } = req.body;
  Object.assign(transaction, {
    type: type || transaction.type,
    amount: amount !== undefined ? parseFloat(amount) : transaction.amount,
    date: date || transaction.date,
    description: description !== undefined ? description : transaction.description,
    category: category || transaction.category,
    paymentMethod: paymentMethod || transaction.paymentMethod,
  });

  await transaction.save();
  res.json({ success: true, message: 'Transaction updated.', data: transaction });
});

// @desc    Delete transaction
// @route   DELETE /api/cashbooks/:id/transactions/:tid
// @access  Private (creator or owner)
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.tid,
    cashbook: req.params.id,
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }

  if (
    transaction.createdBy.toString() !== req.user._id.toString() &&
    req.userRole !== 'owner'
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this transaction.' });
  }

  await transaction.deleteOne();
  res.json({ success: true, message: 'Transaction deleted.' });
});

module.exports = { getTransactions, getTransactionSummary, createTransaction, updateTransaction, deleteTransaction };
