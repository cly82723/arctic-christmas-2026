// "See photos": a bottom sheet with the photos for a spot, each credited. Photos you supplied come first and load
// only when the sheet opens. With no photos for a spot, the link falls back to an image search.
import { content, ownPhotos } from './store.js';
import { tr, spotName } from './i18n.js';
import { esc } from './ui.js';
import { icon } from './icons.js';

function close() {
  const m = document.getElementById('modal'); if (m) m.innerHTML = '';
  document.removeEventListener('keydown', onKey);
}
function onKey(e) { if (e.key === 'Escape') close(); }

export const hasPhotos = (id) => !!(content.photos?.[id]?.length || content.photos?.__own?.[id]);

export async function openPhotos(id) {
  const s = content.spots?.[id];
  if (!s || !hasPhotos(id)) return false;
  const name = spotName(s);
  const m = document.getElementById('modal');
  const shell = (inner) => `<div class="sheet-bg" data-close><div class="sheet photos" role="dialog" aria-modal="true" aria-label="${esc(tr('Photos of', '相片：'))} ${esc(name)}">
    <div class="ph-head"><h2>${esc(name)}</h2><button class="btn sm" data-close>${icon('x', 16)} ${tr('Close', '關閉')}</button></div>${inner}</div></div>`;
  const bind = () => { m.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', (e) => { if (e.target === el || el.tagName === 'BUTTON') close(); })); };
  m.innerHTML = shell(`<p class="ph-note">${tr('Loading photos…', '載入相片中…')}</p>`); bind();
  document.addEventListener('keydown', onKey);
  let own = [];
  try { own = await ownPhotos(id); } catch { /* offline and never opened: show the rest */ }
  const list = [...own, ...(content.photos[id] || [])];
  if (!m.querySelector('.sheet.photos')) return true; // closed while loading
  m.innerHTML = shell(`<div class="ph-strip">${list.map((p, i) => `<figure><img src="${esc(p.src)}" alt="${esc(name)} ${i + 1}" loading="lazy" decoding="async"><figcaption>${esc(p.author)} · <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.license)}</a></figcaption></figure>`).join('')}</div>
    <p class="ph-note">${tr('Swipe for more. Each photo credits its photographer. December is darker than most of these, with a low pink glow around midday.', '左右掃看更多。每張相片都註明攝影師。十二月會比大部分相片更暗，中午前後只有低低的粉紅餘暉。')}</p>`);
  bind(); m.querySelector('[data-close].btn')?.focus();
  return true;
}
