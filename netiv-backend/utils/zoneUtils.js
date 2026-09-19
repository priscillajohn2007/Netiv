// utils/zoneUtils.js — resolves a free-text area name to a zone.
// Single source of truth so mailer.js and the helpline route stay in sync.
//
// Uses loose substring matching on a normalized form of both the typed text
// and every known locality name: lowercased, with spaces/punctuation
// stripped out entirely. This means "Shivaji Palem", "ShivajiPalem", and
// "shivaji  palem" (double space) all match the same locality — spacing and
// case differences never cause a miss.

const areaToZone = require('../areaToZone');

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // strip spaces, punctuation, everything but letters/digits
}

// Pre-normalize every known locality name once at startup, instead of
// re-normalizing all ~500 keys on every single request.
const normalizedEntries = Object.keys(areaToZone).map((key) => ({
  normalizedKey: normalize(key),
  zone: areaToZone[key],
}));

/**
 * Resolves a free-text area name to a zone.
 * @param {string} area
 * @returns {string} zone name, or 'Unknown' if truly nothing matches
 */
function resolveZoneName(area) {
  const clean = normalize(area);
  if (!clean) return 'Unknown';

  for (const { normalizedKey, zone } of normalizedEntries) {
    if (normalizedKey && clean.includes(normalizedKey)) {
      return zone;
    }
  }
  return 'Unknown';
}

/**
 * Resolves a zone from an area name, falling back to a broader city/town
 * name if the specific area doesn't match anything on its own. This covers
 * cases like a sub-locality ("Anjaneyulu Nagar") that isn't individually
 * listed, but whose containing area ("Vepagunta") is.
 * @param {string} area
 * @param {string} [city]
 * @returns {{ zone: string, matchedOn: 'area'|'city'|'none' }}
 */
function resolveZoneWithFallback(area, city) {
  const areaZone = resolveZoneName(area);
  if (areaZone !== 'Unknown') {
    return { zone: areaZone, matchedOn: 'area' };
  }

  const cityZone = resolveZoneName(city);
  if (cityZone !== 'Unknown') {
    return { zone: cityZone, matchedOn: 'city' };
  }

  return { zone: 'Unknown', matchedOn: 'none' };
}

module.exports = { resolveZoneName, resolveZoneWithFallback };
