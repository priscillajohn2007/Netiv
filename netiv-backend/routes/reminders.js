// routes/reminders.js — periodic follow-up emails on day 2, 4, 6, 8, 10
// Decoupled from routes/reports.js — the frontend calls POST
// /api/reminders/register right after a complaint email is sent.

const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { db } = require('../db');

const router = express.Router();

const REMINDER_SCHEDULE_DAYS = [2, 4, 6, 8, 10];
const MAX_REMINDERS = REMINDER_SCHEDULE_DAYS.length;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Called by the frontend right after a complaint is successfully emailed.
router.post('/register', async (req, res) => {
  try {
    const { email, zone, referenceNo, address } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    await db.execute({
      sql: `
        INSERT INTO report_reminders (reference_no, email, zone, address, filed_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [referenceNo || null, email, zone || null, address || null, new Date().toISOString()],
    });

    res.json({ message: 'Reminder tracking started.' });
  } catch (err) {
    console.error('reminders/register error:', err);
    res.status(500).json({ error: 'Could not register for reminders.' });
  }
});

// Optional: mark a complaint resolved to stop further reminders.
router.post('/resolve/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE report_reminders SET resolved = 1 WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Marked resolved.' });
  } catch (err) {
    console.error('reminders/resolve error:', err);
    res.status(500).json({ error: 'Could not update.' });
  }
});

async function runReminderCheck() {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM report_reminders WHERE resolved = 0 AND reminder_count < ?',
      args: [MAX_REMINDERS],
    });

    for (const row of result.rows) {
      const daysSinceFiled = Math.floor((Date.now() - new Date(row.filed_at).getTime()) / 86400000);
      const nextDueDay = REMINDER_SCHEDULE_DAYS[row.reminder_count];

      if (daysSinceFiled >= nextDueDay) {
        await transporter.sendMail({
          from: `"Netiv" <${process.env.EMAIL_USER}>`,
          to: row.email,
          subject: `Reminder: your complaint${row.reference_no ? ' #' + row.reference_no : ''} is still open`,
          text: `Hi,\n\nThis is a follow-up on your civic complaint filed on ${new Date(row.filed_at).toDateString()}${row.zone ? ' with the ' + row.zone + ' zone' : ''}.\n\nIf this has already been resolved, you can ignore this message. Otherwise, we'll keep following up every 2 days for up to 10 days.\n\n— Netiv`,
        });

        await db.execute({
          sql: 'UPDATE report_reminders SET reminder_count = reminder_count + 1, last_reminder_sent = ? WHERE id = ?',
          args: [new Date().toISOString(), row.id],
        });

        console.log(`Reminder ${row.reminder_count + 1}/${MAX_REMINDERS} sent to ${row.email}`);
      }
    }
  } catch (err) {
    console.error('runReminderCheck error:', err);
  }
}

// Runs once a day at 9 AM server time.
function startReminderScheduler() {
  cron.schedule('0 9 * * *', runReminderCheck);
  console.log('Reminder scheduler started (daily at 9 AM).');
}

module.exports = { router, startReminderScheduler, runReminderCheck };
