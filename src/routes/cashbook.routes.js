const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireCashbookAccess, requireOwner } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const {
  getCashbooks, getCashbook, createCashbook,
  updateCashbook, deleteCashbook, addMember,
  removeMember, getSharedCashbooks,
} = require('../controllers/cashbook.controller');

router.use(protect);

router.get('/', getCashbooks);
router.get('/shared', getSharedCashbooks);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Cashbook name is required'),
  validate,
], createCashbook);

router.get('/:id', requireCashbookAccess, getCashbook);
router.put('/:id', requireOwner, [
  body('name').optional().trim().notEmpty(),
  validate,
], updateCashbook);
router.delete('/:id', requireOwner, deleteCashbook);

router.post('/:id/members', requireOwner, [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('role').optional().isIn(['member', 'viewer']),
  validate,
], addMember);
router.delete('/:id/members/:userId', requireOwner, removeMember);

module.exports = router;
