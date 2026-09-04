// routes/forgotPassword.js — OTP-based password reset

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { db } = require('../db');

const router = express.Router();
const OTP_EXPIRY_MINUTES = 10;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// STEP 1: request a reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const result = await db.execute({ sql: 'SELECT id, name FROM users WHERE email = ?', args: [email] });
    const user = result.rows[0];

    const genericResponse = { message: 'If that email is registered, a reset code has been sent.' };
    if (!user) return res.json(genericResponse);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await db.execute({
      sql: 'INSERT INTO password_resets (user_id, otp_hash, expires_at) VALUES (?, ?, ?)',
      args: [user.id, otpHash, expiresAt],
    });

    await transporter.sendMail({
      from: `"Netiv" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Netiv password reset code',
      text: `Hi ${user.name},\n\nYour password reset code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    });

    res.json(genericResponse);
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// STEP 2: submit the OTP + new password
router.post('/reset-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are all required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    const user = userResult.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid email or OTP.' });

    const otpHash = hashOtp(otp);
    const resetResult = await db.execute({
      sql: `
        SELECT id FROM password_resets
        WHERE user_id = ? AND otp_hash = ? AND used = 0 AND expires_at > ?
        ORDER BY id DESC LIMIT 1
      `,
      args: [user.id, otpHash, new Date().toISOString()],
    });
    const reset = resetResult.rows[0];

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [newHash, user.id] });
    await db.execute({ sql: 'UPDATE password_resets SET used = 1 WHERE id = ?', args: [reset.id] });

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
