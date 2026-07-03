const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['split_reminder', 'cashbook_invite', 'split_paid', 'general'],
      default: 'general',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: {
      cashbookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cashbook' },
      splitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Split' },
      role: {
        type: String,
        enum: ['member', 'viewer'],
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
      },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
