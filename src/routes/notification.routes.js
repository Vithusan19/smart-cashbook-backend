const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  acceptCashbookInvite,
  declineCashbookInvite,
  sendSplitReminder,
  deleteNotification,
} = require('../controllers/notification.controller');

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.post('/:id/accept-cashbook-invite', acceptCashbookInvite);
router.post('/:id/decline-cashbook-invite', declineCashbookInvite);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/split-reminder', sendSplitReminder);

module.exports = router;
