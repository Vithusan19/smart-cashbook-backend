const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  register, verifyEmail, login, refreshAccessToken,
  logout, forgotPassword, verifyForgotPasswordOtp, resetPassword, resendVerification,
} = require('../controllers/auth.controller');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], register);

router.post('/verify-email', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A 6 digit OTP is required'),
  validate,
], verifyEmail);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
], login);

router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  validate,
], forgotPassword);

router.post('/forgot-password/verify-otp', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A 6 digit OTP is required'),
  validate,
], verifyForgotPasswordOtp);

router.post('/reset-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A 6 digit OTP is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], resetPassword);

router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail(),
  validate,
], resendVerification);

module.exports = router;
