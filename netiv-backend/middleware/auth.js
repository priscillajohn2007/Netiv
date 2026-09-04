// middleware/auth.js — protects routes, attaches req.user from JWT

const jwt = require('jsonwebtoken');
const { db } = require('../db');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not logged in. Send Authorization: Bearer <token>.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // A valid signature isn't enough on its own — check the token wasn't
    // invalidated by a "log out everywhere" action after it was issued.
    const result = await db.execute({
      sql: 'SELECT token_version FROM users WHERE id = ?',
      args: [payload.id],
    });
    const row = result.rows[0];
    if (!row || row.token_version !== payload.tokenVersion) {
      return res.status(401).json({ error: 'This session has been logged out. Please log in again.' });
    }

    req.user = payload; // { id, name, email, tokenVersion }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireAuth };
