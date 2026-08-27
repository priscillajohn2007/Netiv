// routes/reports.js — create, list, and fetch civic reports

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendReportEmail } = require('../utils/mailer');

const router = express.Router();

// --- photo upload config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

function generateReferenceNo() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `Netiv-${stamp}-${rand}`;
}

function buildLetterText({ referenceNo, categoryName, deptName, description, lat, lng, house, area, landmark, city, pincode, name, phone }) {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const gpsLine = (lat && lng)
    ? `${lat}, ${lng}  (https://maps.google.com/?q=${lat},${lng})`
    : 'Not detected';

  const hasManualAddress = house || area || landmark || city || pincode;
  const manualAddressBlock = hasManualAddress
    ? `
Manual address:
House/Flat No: ${house || '-'}
Area/Street: ${area || '-'}
Landmark: ${landmark || '-'}
City: ${city || '-'}
Pincode: ${pincode || '-'}`
    : '';

  return `Reference No: ${referenceNo}
Date: ${dateStr}

To,
The Commissioner,
Greater Visakhapatnam Municipal Corporation
Tenneti Bhavan, Ramnagar, Visakhapatnam - 530002

Through: ${deptName}

Subject: Complaint regarding ${categoryName.toLowerCase()} at the location below

Respected Sir/Madam,

I am writing to bring to your notice a civic issue in my locality under the category "${categoryName}".

Details of the issue:
${description || '(no additional description provided)'}

GPS location: ${gpsLine}${manualAddressBlock}

I request the concerned department to take necessary action at the earliest.

Regards,
${name}
${phone}

— Filed via Netiv, a citizen civic-reporting tool`;
}

// POST /api/reports  (protected, multipart/form-data)
// fields: categoryId, categoryName, deptName, description, lat, lng, house, area, landmark, city, pincode, name, phone
// file:   photo
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { categoryId, categoryName, deptName, description, lat, lng, house, area, landmark, city, pincode, name, phone } = req.body;
    if (!categoryId || !categoryName || !deptName) {
      return res.status(400).json({ error: 'categoryId, categoryName, and deptName are required.' });
    }

    const referenceNo = generateReferenceNo();
    const photoPath = req.file ? req.file.path : null;
    const citizenName = name || req.user.name;
    const citizenPhone = phone || '';

    const letterText = buildLetterText({
      referenceNo, categoryName, deptName, description, lat, lng,
      house, area, landmark, city, pincode,
      name: citizenName, phone: citizenPhone,
    });

    db.prepare(`
      INSERT INTO reports
        (reference_no, user_id, category_id, category_name, dept_name, description, lat, lng, house, area, landmark, city, pincode, photo_path, citizen_name, citizen_phone, letter_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      referenceNo, req.user.id, categoryId, categoryName, deptName, description || '',
      lat ? Number(lat) : null, lng ? Number(lng) : null,
      house || '', area || '', landmark || '', city || '', pincode || '',
      photoPath, citizenName, citizenPhone, letterText
    );

    const { zone, receiverEmail } = await sendReportEmail({
      subject: `Civic complaint [${referenceNo}]: ${categoryName} — ${citizenName}`,
      letterText,
      citizenEmail: req.user.email,
      area,
      photoPath,
    });

    res.status(201).json({ referenceNo, letterText, status: 'submitted', zone, receiverEmail });
  } catch (err) {
    console.error('Failed to create report:', err);
    res.status(500).json({ error: 'Could not submit report. Please try again.' });
  }
});

// GET /api/reports  (protected) — current user's reports, most recent first
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ reports: rows });
});

// GET /api/reports/:id  (protected)
router.get('/:id', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Report not found.' });
  res.json({ report: row });
});

// DELETE /api/reports/:id  (protected) — delete one letter from history
router.delete('/:id', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!row) return res.status(404).json({ error: 'Report not found.' });

  db.prepare('DELETE FROM reports WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

  if (row.photo_path) {
    fs.unlink(row.photo_path, (err) => {
      if (err) console.warn('Could not delete photo file:', row.photo_path, err.message);
    });
  }

  res.json({ deleted: true, id: Number(req.params.id) });
});

// DELETE /api/reports  (protected) — clear a user's entire history
router.delete('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT photo_path FROM reports WHERE user_id = ?').all(req.user.id);

  db.prepare('DELETE FROM reports WHERE user_id = ?').run(req.user.id);

  rows.forEach((row) => {
    if (row.photo_path) {
      fs.unlink(row.photo_path, (err) => {
        if (err) console.warn('Could not delete photo file:', row.photo_path, err.message);
      });
    }
  });

  res.json({ deleted: true, count: rows.length });
});

module.exports = router;
