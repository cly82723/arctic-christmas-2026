// Computes road routes and drive-time matrices once, with the public OSRM demo server, and saves them to .dev/routes.json.
// Only trip-stop coordinates are sent. Run: node scripts/routes.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { SPOTS } from '../content/spots.mjs';
import { DAYS } from '../content/days.mjs';

const BASE = 'https://router.project-osrm.org';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { matrix: {}, legs: {} };

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'trip-planner-build/1.0' } });
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await wait(1500 * (i + 1));
  }
  return null;
}
const pt = (id) => SPOTS[id]?.c ? `${SPOTS[id].c[1]},${SPOTS[id].c[0]}` : null;

for (const day of DAYS) {
  if (day.nomap) continue;
  const ids = [...new Set([day.start, day.end, ...day.plan, ...day.alts, ...(day.aurora?.pool || [])])].filter((id) => SPOTS[id]?.c);
  if (ids.length < 2) continue;
  // 1. full drive-time matrix for the day (minutes, rounded)
  const coords = ids.map(pt).join(';');
  const t = await getJson(`${BASE}/table/v1/driving/${coords}?annotations=duration,distance`);
  if (t?.durations) {
    ids.forEach((a, i) => ids.forEach((b, j) => {
      if (i !== j && t.durations[i][j] != null) out.matrix[`${a}|${b}`] = [Math.round(t.durations[i][j] / 60), Math.round(t.distances[i][j] / 1000)];
    }));
  } else console.warn('no matrix for', day.id);
  await wait(900);
  // 2. geometry for default legs and aurora legs
  const pairs = [];
  const seq = [day.start, ...day.plan, day.end];
  for (let k = 0; k < seq.length - 1; k++) pairs.push([seq[k], seq[k + 1]]);
  if (day.aurora) for (const id of [day.aurora.main, day.aurora.backup]) pairs.push([day.end, id]);
  for (const [a, b] of pairs) {
    const key = `${a}|${b}`;
    if (out.legs[key] || !SPOTS[a]?.c || !SPOTS[b]?.c) continue;
    const r = await getJson(`${BASE}/route/v1/driving/${pt(a)};${pt(b)}?overview=full&geometries=polyline`);
    const rt = r?.routes?.[0];
    if (rt) out.legs[key] = { m: Math.round(rt.duration / 60), km: Math.round(rt.distance / 1000), poly: rt.geometry };
    else console.warn('no route', key);
    await wait(700);
  }
  console.log(day.id, 'done', ids.length, 'points');
}
mkdirSync(new URL('../.dev/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.dev/routes.json', import.meta.url), JSON.stringify(out));
console.log('legs', Object.keys(out.legs).length, 'matrix', Object.keys(out.matrix).length);
