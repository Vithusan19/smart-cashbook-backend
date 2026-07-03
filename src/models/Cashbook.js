const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['owner', 'member', 'viewer'],
    default: 'viewer',
  },
  addedAt: { type: Date, default: Date.now },
});

const cashbookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cashbook name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    bookType: {
      type: String,
      enum: ['personal', 'shared'],
      default: 'personal',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: 'book',
    },
  },
  { timestamps: true }
);

// Index for faster queries
cashbookSchema.index({ owner: 1 });
cashbookSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Cashbook', cashbookSchema);
