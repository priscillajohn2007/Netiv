// zoneOfficials.js — GVMC zone-level officials, per app zone.
// Sourced from GVMC's official contact directory (Aug 2026).
// "official" = Assistant Commissioner for that GVMC zone.
// "assistant" = Assistant City Planner covering the same wards (backup contact).

const zoneOfficials = {
  Madhurawada: [
    { role: 'Zone Officer (Assistant Commissioner)', name: 'Sri N. Sivaji', phone: '9848366878' },
    { role: 'Assistant City Planner', name: 'Sri Madhusudhan', phone: '9912349433' },
  ],
  North: [
    { role: 'Zone Officer (Assistant Commissioner)', name: 'Sri M. Viswanath', phone: '9951957599' },
    { role: 'Assistant City Planner', name: 'Sri A. Venkata Rathnam', phone: '9912349436' },
  ],
  East: [
    { role: 'Zone Officer, Zone-2 (Assistant Commissioner)', name: 'Sri Durga Prasad', phone: '9848308824' },
    { role: 'Assistant City Planner, Zone-2', name: 'Sri A. Venkata Subbaya', phone: '9912349443' },
    { role: 'Zone Officer, Zone-4 (Assistant Commissioner)', name: 'Smt J. Vijaya Laxmi', phone: '9705086888' },
    { role: 'Assistant City Planner, Zone-4', name: 'Sri Shanmukha Reddy', phone: '9848882596' },
  ],
  South: [
    { role: 'Zone Officer (Assistant Commissioner)', name: 'Sri A. Srinivas', phone: '9666673949' },
    { role: 'Assistant City Planner', name: 'Sri Vijay Bhaskar', phone: '9912349437' },
  ],
  Gajuwaka: [
    { role: 'Zone Officer (Assistant Commissioner)', name: 'Sri A. Srinivas', phone: '9666673949' },
    { role: 'Assistant City Planner', name: 'Sri Vijay Bhaskar', phone: '9912349437' },
  ],
  Pendurthi: [
    { role: 'Zone Officer (Assistant Commissioner)', name: 'Sri Sai Srikanth', phone: '9849908358' },
    { role: 'Assistant City Planner', name: 'Sri Srinivas', phone: '9848889707' },
  ],
  Bheemunipatnam: [
    // Not covered by GVMC's ward-based zone system (wards 1-72).
    // Falls through to the citywide control room below.
  ],
};

// Always-available citywide fallback, shown in addition to (or instead of) zone contacts.
const cityWideHelpline = [
  { role: 'GVMC Control Room', name: '', phone: '08912569335' },
  { role: 'GVMC Control Room', name: '', phone: '08912569336' },
  { role: 'GVMC Toll-Free Helpline', name: '', phone: '18004250009' },
];

module.exports = { zoneOfficials, cityWideHelpline };
