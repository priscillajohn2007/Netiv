// utils/mailer.js — sends the generated letter by email, with the photo attached,
// routed to the correct zone office based on the citizen's area.

const nodemailer = require('nodemailer');
const zoneEmails = require('../zoneEmails');
const { resolveZoneWithFallback } = require('./zoneUtils');
const fs = require('fs');
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

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
  const payload = {
    sender: { name: 'Netiv Civic Reporter', email: process.env.EMAIL_USER },
    to: [{ email: receiverEmail }],
    subject: zone !== 'Unknown' ? `${subject} | ${zone} Zone` : subject,
    textContent: zone !== 'Unknown' ? `Area: ${area}\nZone: ${zone}\n\n${letterText}` : letterText,
  };

  if (citizenEmail) {
    payload.cc = [{ email: citizenEmail }];
  }

  if (photoPath) {
    const base64Content = fs.readFileSync(photoPath, { encoding: 'base64' });
    payload.attachment = [{ content: base64Content, name: 'evidence.jpg' }];
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${errBody}`);
  }

  return { zone, receiverEmail };
  
}

module.exports = { sendReportEmail, resolveZone };
