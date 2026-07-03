const { createTransporter } = require('../config/email');

const BASE_STYLES = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f4f6fb;
  margin: 0; padding: 0;
`;

const CARD_STYLES = `
  max-width: 560px; margin: 40px auto;
  background: #fff; border-radius: 16px;
  box-shadow: 0 4px 24px rgba(99,102,241,0.10);
  overflow: hidden;
`;

const HEADER_STYLES = `
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  padding: 32px 32px 24px;
  text-align: center;
`;

const BODY_STYLES = `padding: 32px;`;

const BTN_STYLES = `
  display: inline-block;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff !important; text-decoration: none;
  padding: 14px 36px; border-radius: 8px;
  font-weight: 600; font-size: 15px;
  margin: 20px 0;
`;

const FOOTER_STYLES = `
  background: #f8fafc; padding: 20px 32px;
  text-align: center; font-size: 12px; color: #94a3b8;
`;

const buildEmail = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLES}">
  <div style="${CARD_STYLES}">
    <div style="${HEADER_STYLES}">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">💰 Smart Cashbook</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${title}</p>
    </div>
    <div style="${BODY_STYLES}">
      ${body}
    </div>
    <div style="${FOOTER_STYLES}">
      <p>© ${new Date().getFullYear()} Smart Cashbook. All rights reserved.</p>
      <p>If you did not request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>`;

/**
 * Send email verification link
 */
const sendVerificationEmail = async ({ name, email, token }) => {
  const transporter = createTransporter();
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = buildEmail(
    'Verify Your Email Address',
    `<h2 style="color:#1e293b;margin:0 0 12px">Hello, ${name}! 👋</h2>
     <p style="color:#475569;line-height:1.6">
       Welcome to Smart Cashbook! Please verify your email address to activate your account and get started.
     </p>
     <div style="text-align:center">
       <a href="${verifyUrl}" style="${BTN_STYLES}">Verify Email Address</a>
     </div>
     <p style="color:#94a3b8;font-size:13px">This link expires in 24 hours.</p>
     <p style="color:#94a3b8;font-size:12px;word-break:break-all">
       Or copy: <a href="${verifyUrl}">${verifyUrl}</a>
     </p>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Verify your Smart Cashbook account',
    html,
  });
};

const sendEmailVerificationOtp = async ({ name, email, otp }) => {
  const transporter = createTransporter();

  const html = buildEmail(
    'Verify Your Email Address',
    `<h2 style="color:#1e293b;margin:0 0 12px">Hello, ${name}!</h2>
     <p style="color:#475569;line-height:1.6">
       Use this one-time password to verify your Smart Cashbook account.
     </p>
     <div style="text-align:center;margin:28px 0">
       <div style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:800;color:#1e293b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 22px">${otp}</div>
     </div>
     <p style="color:#ef4444;font-size:13px">This OTP expires in 10 minutes. Never share it with anyone.</p>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your Smart Cashbook email OTP',
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async ({ name, email, token }) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const html = buildEmail(
    'Reset Your Password',
    `<h2 style="color:#1e293b;margin:0 0 12px">Password Reset Request</h2>
     <p style="color:#475569;line-height:1.6">
       Hi ${name}, we received a request to reset your password. Click the button below to create a new password.
     </p>
     <div style="text-align:center">
       <a href="${resetUrl}" style="${BTN_STYLES}">Reset Password</a>
     </div>
     <p style="color:#ef4444;font-size:13px">⚠️ This link expires in 1 hour. If you did not request this, please ignore this email.</p>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Reset your Smart Cashbook password',
    html,
  });
};

const sendOtpEmail = async ({ name, email, otp, purpose }) => {
  const transporter = createTransporter();
  const purposeCopy = purpose === 'login' ? 'Login Verification' : 'Password Reset Verification';
  const html = buildEmail(
    purposeCopy,
    `<h2 style="color:#1e293b;margin:0 0 12px">Hi ${name},</h2>
     <p style="color:#475569;line-height:1.6">
       Use this one-time password to ${purpose === 'login' ? 'finish signing in to' : 'reset your password for'} Smart Cashbook.
     </p>
     <div style="text-align:center;margin:28px 0">
       <div style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:800;color:#1e293b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 22px">${otp}</div>
     </div>
     <p style="color:#ef4444;font-size:13px">This OTP expires in 10 minutes. Never share it with anyone.</p>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Smart Cashbook ${purposeCopy} OTP`,
    html,
  });
};

/**
 * Send cashbook invitation email
 */
const sendCashbookInviteEmail = async ({ recipientEmail, recipientName, inviterName, cashbookName, role }) => {
  const transporter = createTransporter();
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = buildEmail(
    'You have been invited to a Cashbook',
    `<h2 style="color:#1e293b;margin:0 0 12px">You're invited!</h2>
     <p style="color:#475569;line-height:1.6">
       <strong>${inviterName}</strong> invited you to join the share book 
       <strong>"${cashbookName}"</strong> as a <strong>${role}</strong>.
     </p>
     <p style="color:#475569;">Log in to Smart Cashbook and accept the invitation from your dashboard before it appears in your shared books.</p>
     <div style="text-align:center">
       <a href="${loginUrl}" style="${BTN_STYLES}">Open Smart Cashbook</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `📖 ${inviterName} invited you to "${cashbookName}"`,
    html,
  });
};

/**
 * Send split reminder / notification email
 */
const sendSplitReminderEmail = async ({
  recipientEmail,
  recipientName,
  cashbookName,
  splitTitle,
  amountOwed,
  paidByName,
  status,
  currency = 'USD',
}) => {
  const transporter = createTransporter();
  const appUrl = `${process.env.FRONTEND_URL}/dashboard`;

  const statusBadge =
    status === 'paid'
      ? '<span style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">✅ Paid</span>'
      : '<span style="background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">⏳ Pending</span>';

  const html = buildEmail(
    'Split Payment Reminder',
    `<h2 style="color:#1e293b;margin:0 0 12px">Hi ${recipientName}, payment reminder! 💸</h2>
     <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:16px 0">
       <table style="width:100%;border-collapse:collapse">
         <tr><td style="color:#64748b;padding:6px 0;font-size:14px">Cashbook</td>
             <td style="color:#1e293b;font-weight:600;font-size:14px;text-align:right">${cashbookName}</td></tr>
         <tr><td style="color:#64748b;padding:6px 0;font-size:14px">Split</td>
             <td style="color:#1e293b;font-weight:600;font-size:14px;text-align:right">${splitTitle}</td></tr>
         <tr><td style="color:#64748b;padding:6px 0;font-size:14px">Paid by</td>
             <td style="color:#1e293b;font-weight:600;font-size:14px;text-align:right">${paidByName}</td></tr>
         <tr><td style="color:#64748b;padding:6px 0;font-size:14px">Your share</td>
             <td style="color:#6366f1;font-weight:700;font-size:18px;text-align:right">${currency} ${amountOwed}</td></tr>
         <tr><td style="color:#64748b;padding:6px 0;font-size:14px">Status</td>
             <td style="text-align:right;padding:6px 0">${statusBadge}</td></tr>
       </table>
     </div>
     <div style="text-align:center">
       <a href="${appUrl}" style="${BTN_STYLES}">View in Smart Cashbook</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"Smart Cashbook" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `💰 Payment reminder: ${currency} ${amountOwed} for "${splitTitle}"`,
    html,
  });
};

module.exports = {
  sendVerificationEmail,
  sendEmailVerificationOtp,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendCashbookInviteEmail,
  sendSplitReminderEmail,
};
