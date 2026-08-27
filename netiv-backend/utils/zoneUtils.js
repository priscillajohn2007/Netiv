// utils/zoneUtils.js — resolves a free-text area name to a zone.
// Single source of truth so mailer.js and the helpline route stay in sync.

const areaToZone = require('../areaToZone');

/**
 * Resolves a free-text area name to a zone. Handles compound strings from
 * reverse-geocoding (e.g. "Sai Madhava Nagar, Naiduthota") by trying the
 * whole string first, then each comma-separated part on its own — so a
 * match on any recognized locality within the string still succeeds.
 * @param {string} area
 * @returns {string} zone name, or 'Unknown' if unrecognized
 */
function resolveZoneName(area) {
  const raw = (area || '').trim().toLowerCase();
  if (!raw) return 'Unknown';

  if (areaToZone[raw]) return areaToZone[raw];

  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (areaToZone[part]) return areaToZone[part];
  }

  return 'Unknown';
}

module.exports = { resolveZoneName };
