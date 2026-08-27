// routes/helpline.js — resolves an area to its zone officials' contact numbers

const express = require('express');
const { resolveZoneName } = require('../utils/zoneUtils');
const { zoneOfficials, cityWideHelpline } = require('../zoneOfficials');

const router = express.Router();

// GET /api/helpline?area=...  (public — no login required to see who to call)
router.get('/', (req, res) => {
  const area = req.query.area || '';
  const zone = resolveZoneName(area);
  const contacts = zoneOfficials[zone] || [];

  res.json({
    zone,
    contacts,
    cityWide: cityWideHelpline,
  });
});

module.exports = router;
