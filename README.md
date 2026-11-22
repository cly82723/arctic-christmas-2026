# Arctic Christmas 2026

A private group trip planner: one page per day with an interactive map, drag-and-drop swapping of spots, to-do, packing list, apps and guides, in English and Traditional Chinese. It is an offline-capable web app for iPhone (Safari, Add to Home Screen).

This repository holds **app code only**. All trip content (addresses, bookings, flights, text) lives in a Firestore database under a secret trip code and is never committed here.

## Run locally (demo mode)

```powershell
npm install
npm run build
npm run dev      # http://localhost:5173
```

Demo mode needs the private `content/` folder (not in this repo) and saves changes only on that device.

## Go live with Firebase

1. Create a free Firebase project and a Firestore database, then paste the web app config into `src/firebase-config.js`.
2. Publish the security rules and the site: `firebase deploy --only firestore:rules,hosting` (after `npm run build`).
3. Make a trip code with `node scripts/seed.mjs --newcode`, seed content with `node scripts/seed.mjs <CODE>`, and share `https://<project>.web.app/#k=<CODE>` with the group.

The code in the invite link is the only key, so share it only with the group.
