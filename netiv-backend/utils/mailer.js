// utils/mailer.js — sends the generated letter by email, with the photo attached,
// routed to the correct zone office based on the citizen's area.

const nodemailer = require('nodemailer');
const zoneEmails = require('../zoneEmails');
const { resolveZoneName } = require('./zoneUtils');

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
 * Resolves a free-text area name to a zone, then a zone to a recipient email.
 * Falls back to GVMC_EMAIL / DEFAULT_COMPLAINT_EMAIL when the area/zone is unrecognized.
 * @param {string} area
 * @returns {{ zone: string, receiverEmail: string }}
 */
function resolveZone(area) {
  const zone = resolveZoneName(area);
  const receiverEmail =
    zoneEmails[zone] || process.env.DEFAULT_COMPLAINT_EMAIL || process.env.GVMC_EMAIL;
  return { zone, receiverEmail };
}

/**
 * Sends the citizen's letter to the correct zone office, with the photo attached,
 * and CCs the citizen.
 * @param {Object} opts
 * @param {string} opts.subject
 * @param {string} opts.letterText
 * @param {string} opts.citizenEmail
 * @param {string} [opts.area] - free-text area/locality name used to resolve the zone
 * @param {string} [opts.photoPath] - absolute path to uploaded photo, if any
 * @returns {Promise<{ zone: string, receiverEmail: string }>}
 */
async function sendReportEmail({ subject, letterText, citizenEmail, area, photoPath }) {
  const { zone, receiverEmail } = resolveZone(area);

  const attachments = [];
  if (photoPath) {
    attachments.push({ filename: 'evidence.jpg', path: photoPath });
  }

  await transporter.sendMail({
    from: `"Netiv Civic Reporter" <${process.env.EMAIL_USER}>`,
    to: receiverEmail,
    cc: citizenEmail || undefined,
    subject: zone !== 'Unknown' ? `${subject} | ${zone} Zone` : subject,
    text: zone !== 'Unknown' ? `Area: ${area}\nZone: ${zone}\n\n${letterText}` : letterText,
    attachments,
  });

  return { zone, receiverEmail };
}

module.exports = { sendReportEmail, resolveZone };
