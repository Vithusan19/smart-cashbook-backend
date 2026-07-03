const mongoose = require('mongoose');

const splitMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  share: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  paidAt: { type: Date, default: null },
});

const splitSchema = new mongoose.Schema(
  {
    cashbook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cashbook',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Split title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidByName: {
      type: String,
      required: true,
    },
    members: [splitMemberSchema],
    description: {
      type: String,
      trim: true,
      maxlength: [300, ''],
      default: '',
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

splitSchema.index({ cashbook: 1 });

module.exports = mongoose.model('Split', splitSchema);
