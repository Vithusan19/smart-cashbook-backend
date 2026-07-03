const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getMe,
  updateProfile,
  changePassword,
  searchUserByEmail,
  getDashboardStats,
  listUsers,
  updateUserRole,
  updateUserStatus,
} = require('../controllers/user.controller');

router.use(protect);

router.get('/me', getMe);
router.put('/me', updateProfile);
router.put('/me/password', changePassword);
router.get('/search', searchUserByEmail);
router.get('/dashboard', getDashboardStats);
router.get('/admin', requireAdmin, listUsers);
router.patch('/admin/:id/role', requireAdmin, [
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  validate,
], updateUserRole);
router.patch('/admin/:id/status', requireAdmin, [
  body('isVerified').isBoolean().withMessage('isVerified must be true or false'),
  validate,
], updateUserStatus);

module.exports = router;
