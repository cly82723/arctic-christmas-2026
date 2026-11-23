// Finds freely licensed photos on Wikimedia Commons for each scenic spot and writes .dev/photos.json plus a review page.
// Only CC BY, CC BY-SA, CC0 and public-domain images are kept, each with its author and licence so the app can credit it.
// Run: node scripts/photos.mjs   then open http://localhost:5173/__photos while the dev server runs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { SPOTS } from '../content/spots.mjs';

const Q = {
  ekeberg: 'Ekebergparken Oslo', spikersuppa: 'Karl Johans gate Christmas Oslo', lapphaugen: 'Gratangen fjord', nordkjosbotn: 'Nordkjosbotn Balsfjorden',
  cathedral: 'Arctic Cathedral Tromsø', storgata: 'Storgata Tromsø', fjellheisen: 'Fjellheisen Tromsø', polarmuseet: 'Polar Museum Tromsø', polaria: 'Polaria Tromsø',
  domkirke: 'Tromsø Cathedral', botanic: 'Arctic-alpine botanical garden Tromsø', brim: 'whale watching Tromsø', telegraf: 'Telegrafbukta Tromsø', prestvannet: 'Prestvannet Tromsø',
  ersfjord_vp: 'Ersfjord Kvaløya', ersfjordbotn: 'Ersfjordbotn', kattfjordeidet: 'Kattfjordeidet', sommaroy: 'Sommarøy Tromsø', kaldfjord: 'Kaldfjord Tromsø', rekvik: 'Rekvik Kvaløya', grotfjord: 'Grøtfjord Tromsø',
  malselvfossen: 'Målselvfossen', pp_walk: 'Polar Park Bardu', pp_alt: 'Polar Park Bardu', fox: 'Arctic fox', gratangen: 'Gratangen', narvik: 'Narvik', skjomen: 'Skjomen',
  tjeldsund: 'Tjeldsund Bridge', e10_vp: 'Austnesfjorden', sildpollnes: 'Sildpollnes chapel', svolvaer: 'Svolvær harbour', raftsund: 'Raftsund Bridge', kabelvag: 'Kabelvåg', svolvaergeita: 'Svolværgeita',
  gimsoy: 'Gimsøya Lofoten', stamsund: 'Stamsund', lofotr: 'Lofotr Viking Museum', lofotr_alt: 'Lofotr Viking Museum', hamnoy: 'Hamnøy Lofoten', reine_vp: 'Reine Lofoten', reine: 'Reine Lofoten', a_lofoten: 'Å Moskenes Lofoten',
  skagsanden: 'Skagsanden Flakstad', sakrisoy: 'Sakrisøy Lofoten', fredvang: 'Fredvang Lofoten', ramberg: 'Ramberg Lofoten', flakstad: 'Flakstad church', ballstad: 'Ballstad Lofoten',
  henningsvaer: 'Henningsvær football', henn_alt: 'Henningsvær football', uttakleiv: 'Uttakleiv beach', haukland: 'Haukland beach', eggum: 'Eggum Lofoten', unstad: 'Unstad Lofoten', storvatnet: 'Flakstad Lofoten lake', nusfjord: 'Nusfjord', nus_alt: 'Nusfjord'
};
const OK = /^(CC BY|CC BY-SA|CC0|Public domain|PD)/i;
const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {}; const review = [];

for (const [id, q] of Object.entries(Q)) {
  if (!SPOTS[id]) continue;
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=800&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap');
  let pages = {};
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'arctic-christmas-planner/1.0 (private trip planner)' } });
      pages = JSON.parse(await r.text()).query?.pages || {}; break;
    } catch (e) { console.warn(id, 'rate limited or failed, waiting', attempt + 1); await wait(9000 * (attempt + 1)); }
  }
  const picks = Object.values(pages).map((p) => ({ p, i: p.imageinfo?.[0] })).filter(({ i }) => i && /image\/(jpeg|png|webp)/.test(i.mime) && i.width >= 1000 && i.height >= 600 && OK.test(strip(i.extmetadata?.LicenseShortName?.value)))
    .filter(({ p }) => !/map|logo|flag|coat of arms|plan|diagram|poster|stamp/i.test(p.title))
    .sort((a, b) => (a.p.index || 0) - (b.p.index || 0)).slice(0, 3)
    .map(({ p, i }) => ({ src: i.thumburl, w: i.thumbwidth, h: i.thumbheight, title: p.title.replace(/^File:/, ''), author: strip(i.extmetadata?.Artist?.value).slice(0, 80) || 'Unknown', license: strip(i.extmetadata.LicenseShortName.value), licUrl: i.extmetadata?.LicenseUrl?.value || i.descriptionurl, page: i.descriptionurl }));
  if (picks.length) out[id] = picks;
  review.push({ id, q, name: SPOTS[id].n[0], picks });
  console.log(id.padEnd(16), picks.length, 'photos');
  await wait(1500);
}
mkdirSync(new URL('../.dev/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.dev/photos.json', import.meta.url), JSON.stringify(out));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
writeFileSync(new URL('../.dev/photos-review.html', import.meta.url), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo review</title>
<style>body{font:15px/1.5 system-ui;margin:0;padding:16px;background:#eef3f6;color:#13222e}h1{margin:0 0 4px}.s{background:#fff;border:1px solid #d7e0e6;border-radius:14px;padding:12px;margin:12px 0}.s h2{font-size:1.05rem;margin:0}.s small{color:#4a5a67}.g{display:flex;gap:10px;overflow-x:auto;margin-top:8px}.g figure{margin:0;flex:0 0 260px}.g img{width:260px;height:180px;object-fit:cover;border-radius:10px}.g figcaption{font-size:.8rem;color:#4a5a67}.none{color:#b33a3a}</style>
<h1>Photo review</h1><p>${review.filter((r) => r.picks.length).length} of ${review.length} spots have photos. Tell me which ones to drop or search differently (give the spot name).</p>
${review.map((r) => `<div class="s"><h2>${esc(r.name)} <small>(${esc(r.id)}, searched "${esc(r.q)}")</small></h2>${r.picks.length ? `<div class="g">${r.picks.map((p) => `<figure><img loading="lazy" src="${esc(p.src)}" alt=""><figcaption>${esc(p.title)}<br>${esc(p.author)} · ${esc(p.license)}</figcaption></figure>`).join('')}</div>` : '<p class="none">No suitable free photo found. The button will open an image search instead.</p>'}</div>`).join('')}`);
console.log('spots with photos:', Object.keys(out).length, 'of', review.length);
