// Builds the private content bundle. Used by the local dev server (demo mode) and to seed Firestore:
//   node scripts/seed.mjs <TRIP_CODE>        writes content to trips/<TRIP_CODE>/content/*
// The trip code is the secret in the invite link. Generate one with: node scripts/seed.mjs --newcode
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { SPOTS } from '../content/spots.mjs';
import { DAYS, LIGHT, TRIP, TRAVELLERS } from '../content/days.mjs';
import * as G from '../content/guides.mjs';

export function buildContent() {
  let routes = { matrix: {}, legs: {} };
  try { routes = JSON.parse(readFileSync(new URL('../.dev/routes.json', import.meta.url), 'utf8')); } catch { /* run npm run routes */ }
  let photos = {};
  try { photos = JSON.parse(readFileSync(new URL('../.dev/photos.json', import.meta.url), 'utf8')); } catch { /* run node scripts/photos.mjs */ }
  // Photos you supplied (credited, private to the trip) are stored one document per spot and shown first.
  let own = {};
  try { own = JSON.parse(readFileSync(new URL('../.dev/photos-ig.json', import.meta.url), 'utf8')); } catch { /* none supplied */ }
  const ownRef = Object.fromEntries(Object.keys(own).map((id) => [id, id]));
  // Copies of a spot used on another day (for example Nordkjosbotn on 26 Dec) share the original's photos.
  for (const s of Object.values(SPOTS)) if (s.of) {
    if (!photos[s.id] && photos[s.of]) photos[s.id] = photos[s.of];
    if (!ownRef[s.id] && own[s.of]) ownRef[s.id] = s.of;
  }
  photos.__own = ownRef;
  return {
    ownPhotos: own,
    photos,
    spots: SPOTS,
    days: { days: DAYS, light: LIGHT, trip: TRIP, travellers: TRAVELLERS },
    routes,
    guides: { todo: G.TODO, packGroups: G.PACK_GROUPS, packing: G.PACKING, packSources: G.PACK_SOURCES, apps: G.APPS, appKinds: G.APP_KINDS, appSources: G.APP_SOURCES, know: G.KNOW, knowSources: G.KNOW_SOURCES, aurora: G.AURORA, bookings: G.BOOKINGS, contacts: G.CONTACTS, names: G.NAMES, howto: G.HOWTO }
  };
}

if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) {
  const arg = process.argv[2];
  if (arg === '--newcode') {
    console.log(randomBytes(18).toString('base64url')); // 24 characters
  } else if (!arg || arg.length < 24) {
    console.error('Usage: node scripts/seed.mjs <TRIP_CODE of at least 24 characters>   (make one with --newcode)');
    process.exit(1);
  } else {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const { FIREBASE } = await import('../src/firebase-config.js');
    if (!FIREBASE) { console.error('Paste your Firebase web config into src/firebase-config.js first.'); process.exit(1); }
    const db = getFirestore(initializeApp(FIREBASE));
    const c = buildContent();
    for (const [name, data] of Object.entries(c)) {
      if (name === 'ownPhotos') {
        for (const [id, list] of Object.entries(data)) { await setDoc(doc(db, 'trips', arg, 'content', 'ph_' + id), { json: JSON.stringify(list), at: Date.now() }); console.log('seeded own photos', id, JSON.stringify(list).length, 'bytes'); }
        continue;
      }
      await setDoc(doc(db, 'trips', arg, 'content', name), { json: JSON.stringify(data), at: Date.now() });
      console.log('seeded', name, JSON.stringify(data).length, 'bytes');
    }
    process.exit(0);
  }
}
