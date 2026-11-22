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
  return {
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
      await setDoc(doc(db, 'trips', arg, 'content', name), { json: JSON.stringify(data), at: Date.now() });
      console.log('seeded', name, JSON.stringify(data).length, 'bytes');
    }
    process.exit(0);
  }
}
