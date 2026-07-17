// utils/mailer.js — sends the generated letter by email, with the photo attached

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends the citizen's letter to GVMC, with the photo attached, and CCs the citizen.
 * @param {Object} opts
 * @param {string} opts.subject
 * @param {string} opts.letterText
 * @param {string} opts.citizenEmail
 * @param {string} [opts.photoPath] - absolute path to uploaded photo, if any
 */
async function sendReportEmail({ subject, letterText, citizenEmail, photoPath }) {
  const attachments = [];
  if (photoPath) {
    attachments.push({ filename: 'evidence.jpg', path: photoPath });
  }

  await transporter.sendMail({
    from: `"Netiv Civic Reporter" <${process.env.EMAIL_USER}>`,
    to: process.env.GVMC_EMAIL,
    cc: citizenEmail || undefined,
    subject,
    text: letterText,
    attachments,
  });
}

module.exports = { sendReportEmail };
