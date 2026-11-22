// Day timing engine: works out arrival and departure times, drive totals and warnings for any order of stops.
export const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const fmt = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
export const dur = (m) => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

const rad = (d) => (d * Math.PI) / 180;
const hav = (a, b) => { const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(x)); };

// Drive minutes and km between two spots: precomputed road time if we have it, otherwise a rough estimate.
export function leg(a, b, spots, routes) {
  const m = routes.matrix[`${a}|${b}`];
  if (m) return { m: m[0], km: m[1], exact: true };
  const A = spots[a]?.c, B = spots[b]?.c;
  if (!A || !B) return { m: 0, km: 0, exact: true };
  const km = hav(A, B) * 1.4;
  return { m: Math.round((km / 55) * 60 + 3), km: Math.round(km), exact: false };
}

export function computeDay(day, planIds, content) {
  const { spots, routes, days } = content;
  const light = days.light[day.light] || null;
  const cap = days.trip.drivingCapMin;
  const walk = new Set(day.walk || []);
  const rows = [];
  let driveTotal = 0, cursor = day.depart ? toMin(day.depart) : 0, prev = day.start;
  const warnings = new Set();
  for (const id of planIds) {
    const s = spots[id]; if (!s) continue;
    let g = { m: 0, km: 0, exact: true };
    if (day.info) g = { m: 0, km: 0, exact: true };
    else if (walk.has(prev) || walk.has(id)) g = { m: 15, km: 0, exact: true, walk: true };
    else g = leg(prev, id, spots, routes);
    let arrive = day.info ? toMin(day.times[id] || '00:00') : cursor + g.m;
    let late = false;
    if (!day.info && s.at) { const at = toMin(s.at); if (arrive > at) late = true; arrive = Math.max(arrive, at); }
    const depart = arrive + (s.d || 0);
    if (!g.walk) driveTotal += g.m;
    const dark = !!(light && s.l === 'day' && arrive < 1200 && depart > toMin(light.last) + 20 && !day.info);
    if (late) warnings.add('late');
    if (dark) warnings.add('dark');
    rows.push({ id, arrive, depart, drive: g, late, dark });
    cursor = depart; prev = id;
  }
  let home = null;
  if (!day.info && day.end) {
    const g = walk.has(prev) ? { m: 15, km: 0, exact: true, walk: true } : leg(prev, day.end, spots, routes);
    if (!g.walk) driveTotal += g.m;
    home = { arrive: cursor + g.m, drive: g };
    if (home.arrive > 24 * 60 - 1) warnings.add('late-night');
  }
  if (driveTotal > cap) warnings.add('cap');
  return { rows, home, driveTotal, cap, light, warnings: [...warnings] };
}

// Aurora drive time from the stay to a spot (minutes).
export const auroraDrive = (day, id, content) => (day.end && id ? leg(day.end, id, content.spots, content.routes).m : 0);

// Decode Google-encoded polyline (precision 5) from OSRM into [[lat,lon],...]
export function decodePoly(str) {
  let i = 0, lat = 0, lon = 0; const out = [];
  while (i < str.length) {
    for (const k of [0, 1]) {
      let shift = 0, result = 0, b;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d; else lon += d;
    }
    out.push([lat / 1e5, lon / 1e5]);
  }
  return out;
}

// Oslo wall-clock now as {iso, min} using Intl, so Today works wherever the phone is.
export function osloNow(tz = 'Europe/Oslo', date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
