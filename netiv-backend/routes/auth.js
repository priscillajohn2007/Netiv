// routes/auth.js — register, login, "who am I", profile update, and logout-all endpoints

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/register  { name, email, phone, password }
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      args: [name, email, phone || null, password_hash],
    });

    const user = { id: Number(result.lastInsertRowid), name, email, tokenVersion: 0 };
    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = { id: row.id, name: row.name, email: row.email, tokenVersion: row.token_version };
    res.json({ token: makeToken(user), user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Could not log in. Please try again.' });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
      args: [req.user.id],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// PUT /api/auth/me  (protected) — update name/phone. Email intentionally not changeable here.
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    await db.execute({
      sql: 'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      args: [name, phone || null, req.user.id],
    });

    const result = await db.execute({
      sql: 'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
      args: [req.user.id],
    });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Could not update profile. Please try again.' });
  }
});

// POST /api/auth/logout-all  (protected) — invalidates every session for this
// user, including the one making this request, by bumping token_version.
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await db.execute({
      sql: 'UPDATE users SET token_version = token_version + 1 WHERE id = ?',
      args: [req.user.id],
    });
    res.json({ loggedOutEverywhere: true });
  } catch (err) {
    console.error('Logout-all error:', err);
    res.status(500).json({ error: 'Could not log out everywhere. Please try again.' });
  }
});

module.exports = router;
