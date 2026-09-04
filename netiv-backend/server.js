// server.js — entry point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Fail fast with a clear message if required secrets aren't set up,
// instead of crashing later (with a cryptic stack trace) the first
// time someone tries to register or log in.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace-with-a-long-random-string') {
  console.error('\n✗ Missing or placeholder JWT_SECRET in .env');
  console.error('  1. Make sure a .env file exists in this folder (copy .env.example to .env if not).');
  console.error('  2. Set JWT_SECRET to a real random value, e.g. run:');
  console.error('       node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('     and paste the output in as JWT_SECRET in .env');
  console.error('  3. Restart the server.\n');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const helplineRoutes = require('./routes/helpline');
const forgotPasswordRoutes = require('./routes/forgotPassword');
const { router: reminderRoutes, startReminderScheduler } = require('./routes/reminders');
const { ready: dbReady } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'netiv-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', forgotPasswordRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/helpline', helplineRoutes);
app.use('/api/reminders', reminderRoutes);

// Fallback error handler (e.g. multer file-type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;

dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Netiv backend running at http://localhost:${PORT}`);
      startReminderScheduler();
    });
  })
  .catch((err) => {
    console.error('\n✗ Could not connect to the database.');
    console.error('  If using Turso: check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your .env file.');
    console.error('  If testing locally without Turso: leave those blank to use a local file automatically.');
    console.error(`  Underlying error: ${err.message}\n`);
    process.exit(1);
  });
