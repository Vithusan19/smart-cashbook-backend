const express = require('express');
const { body } = require('express-validator');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireCashbookAccess, requireMemberOrOwner } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const {
  getTransactions, getTransactionSummary, createTransaction,
  updateTransaction, deleteTransaction,
} = require('../controllers/transaction.controller');

router.use(protect);

router.get('/:id/transactions', requireCashbookAccess, getTransactions);
router.get('/:id/transactions/summary', requireCashbookAccess, getTransactionSummary);
router.post('/:id/transactions', requireMemberOrOwner, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be > 0'),
  body('date').optional().isISO8601(),
  validate,
], createTransaction);
router.put('/:id/transactions/:tid', requireMemberOrOwner, updateTransaction);
router.delete('/:id/transactions/:tid', requireMemberOrOwner, deleteTransaction);

module.exports = router;
