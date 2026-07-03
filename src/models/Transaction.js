const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    cashbook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cashbook',
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online', 'cheque', 'other'],
      default: 'cash',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ cashbook: 1, date: -1 });
transactionSchema.index({ cashbook: 1, type: 1 });
transactionSchema.index({ cashbook: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
