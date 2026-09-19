// utils/mailer.js — sends the generated letter by email, with the photo attached,
// routed to the correct zone office based on the citizen's area.

const nodemailer = require('nodemailer');
const zoneEmails = require('../zoneEmails');
const { resolveZoneWithFallback } = require('./zoneUtils');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hardcoded last-resort recipient — used only if the zone lookup fails AND
// both DEFAULT_COMPLAINT_EMAIL and GVMC_EMAIL are missing from the environment.
// This exists so a report can never silently be sent with no "to" address at all
// (which previously happened: nodemailer doesn't error if only "cc" is set,
// so the email would "succeed" while nobody at GVMC ever actually received it).
const HARDCODED_FALLBACK_EMAIL = 'ourgvmc@yahoo.co.in';

/**
 * Resolves a free-text area name to a zone (falling back to city if the
 * area alone doesn't match anything), then a zone to a recipient email.
 * Falls back to GVMC_EMAIL / DEFAULT_COMPLAINT_EMAIL when the area/zone is unrecognized,
 * and to a hardcoded address if even those aren't configured.
 * @param {string} area
 * @param {string} [city]
 * @returns {{ zone: string, receiverEmail: string }}
 */
function resolveZone(area, city) {
  const { zone } = resolveZoneWithFallback(area, city);
  const receiverEmail =
    zoneEmails[zone] || process.env.DEFAULT_COMPLAINT_EMAIL || process.env.GVMC_EMAIL || HARDCODED_FALLBACK_EMAIL;

  if (!zoneEmails[zone] && !process.env.DEFAULT_COMPLAINT_EMAIL && !process.env.GVMC_EMAIL) {
    console.warn(`⚠ No zone/env recipient found for area "${area}" / city "${city}" (zone: ${zone}) — using hardcoded fallback ${HARDCODED_FALLBACK_EMAIL}. Check DEFAULT_COMPLAINT_EMAIL/GVMC_EMAIL are set.`);
  }

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
 * @param {string} [opts.city] - broader city/town name, used as a fallback if area alone doesn't match
 * @param {string} [opts.photoPath] - absolute path to uploaded photo, if any
 * @returns {Promise<{ zone: string, receiverEmail: string }>}
 */
async function sendReportEmail({ subject, letterText, citizenEmail, area, city, photoPath }) {
  const { zone, receiverEmail } = resolveZone(area, city);

  if (!receiverEmail) {
    // Should be unreachable now (HARDCODED_FALLBACK_EMAIL guarantees a value),
    // but fail loudly rather than silently send with no "to" address if it ever happens.
    throw new Error('No recipient email could be determined for this report.');
  }

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
