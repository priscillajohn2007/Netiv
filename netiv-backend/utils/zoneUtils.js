// utils/zoneUtils.js — resolves a free-text area name to a zone.
// Single source of truth so mailer.js and the helpline route stay in sync.
//
// Uses loose substring matching: if any known locality name appears
// anywhere in the typed/geocoded text, that locality's zone is returned.

const areaToZone = require('../areaToZone');

/**
 * Resolves a free-text area name to a zone.
 * @param {string} area
 * @returns {string} zone name, or 'Unknown' if truly nothing matches
 */
function resolveZoneName(area) {
  const clean = (area || '').trim().toLowerCase();
  if (!clean) return 'Unknown';

  for (const key of Object.keys(areaToZone)) {
    if (clean.includes(key)) {
      return areaToZone[key];
    }
  }
  return 'Unknown';
}

module.exports = { resolveZoneName };
