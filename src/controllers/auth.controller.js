const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { sendEmailVerificationOtp, sendOtpEmail } = require('../services/email.service');
const jwt = require('jsonwebtoken');

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildAuthPayload = (user, accessToken, refreshToken) => ({
  accessToken,
  refreshToken,
  user: {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
    notificationsEnabled: user.notificationsEnabled,
  },
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }

  const verificationOtp = generateOtp();
  const verificationTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

  const user = await User.create({
    name,
    email,
    password,
    verificationToken: verificationOtp,
    verificationTokenExpiry,
  });

  sendEmailVerificationOtp({ name: user.name, email: user.email, otp: verificationOtp }).catch((err) =>
    console.error('Verification OTP email error:', err.message)
  );

  res.status(201).json({
    success: true,
    message: 'Account created! Please enter the OTP sent to your email to verify your account.',
    data: { id: user._id, name: user.name, email: user.email },
  });
});

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    verificationToken: otp,
    verificationTokenExpiry: { $gt: Date.now() },
  }).select('+verificationToken +verificationTokenExpiry');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification OTP.' });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in.',
      needsVerification: true,
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Login successful.', data: buildAuthPayload(user, accessToken, refreshToken) });
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+loginOtp +loginOtpExpiry +loginOtpAttempts +refreshToken');
  if (!user || !user.loginOtp || !user.loginOtpExpiry || user.loginOtpExpiry < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please sign in again.' });
  }

  if (user.loginOtpAttempts >= 5) {
    return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please sign in again.' });
  }

  if (user.loginOtp !== otp) {
    user.loginOtpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.loginOtp = undefined;
  user.loginOtpExpiry = undefined;
  user.loginOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Login verified successfully.', data: buildAuthPayload(user, accessToken, refreshToken) });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
    }

    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch {
    return res.status(403).json({ success: false, message: 'Refresh token expired or invalid.' });
  }
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshToken');
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// @desc    Forgot password - send OTP email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond the same to prevent email enumeration
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  }

  const otp = generateOtp();
  user.forgotOtp = otp;
  user.forgotOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  user.forgotOtpVerified = false;
  await user.save({ validateBeforeSave: false });

  sendOtpEmail({ name: user.name, email: user.email, otp, purpose: 'forgot-password' }).catch((err) =>
    console.error('Forgot password OTP email error:', err.message)
  );

  res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
});

const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+forgotOtp +forgotOtpExpiry +forgotOtpVerified');
  if (!user || !user.forgotOtp || !user.forgotOtpExpiry || user.forgotOtpExpiry < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  if (user.forgotOtp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  user.forgotOtpVerified = true;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'OTP verified. You can now set a new password.' });
});

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  const user = await User.findOne({ email }).select('+forgotOtp +forgotOtpExpiry +forgotOtpVerified');

  if (!user || !user.forgotOtpVerified || user.forgotOtp !== otp || user.forgotOtpExpiry < Date.now()) {
    return res.status(400).json({ success: false, message: 'Please verify a valid OTP before resetting password.' });
  }

  user.password = password;
  user.forgotOtp = undefined;
  user.forgotOtpExpiry = undefined;
  user.forgotOtpVerified = false;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('+verificationToken +verificationTokenExpiry');

  if (!user || user.isVerified) {
    return res.json({ success: true, message: 'If applicable, a new verification email has been sent.' });
  }

  const verificationOtp = generateOtp();
  user.verificationToken = verificationOtp;
  user.verificationTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save({ validateBeforeSave: false });

  sendEmailVerificationOtp({ name: user.name, email: user.email, otp: verificationOtp }).catch(console.error);

  res.json({ success: true, message: 'If applicable, a new verification OTP has been sent.' });
});

module.exports = {
  register,
  verifyEmail,
  login,
  verifyLoginOtp,
  refreshAccessToken,
  logout,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  resendVerification,
};
