// "See photos": a bottom sheet with up to three freely licensed photos of a spot, each credited.
// Photos load only when the sheet opens. With no photos for a spot, the link falls back to an image search.
import { content } from './store.js';
import { tr, spotName } from './i18n.js';
import { esc } from './ui.js';
import { icon } from './icons.js';

function close() {
  const m = document.getElementById('modal'); if (m) m.innerHTML = '';
  document.removeEventListener('keydown', onKey);
}
function onKey(e) { if (e.key === 'Escape') close(); }

export function openPhotos(id) {
  const list = content.photos?.[id]; const s = content.spots?.[id];
  if (!list?.length || !s) return false;
  const name = spotName(s);
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="sheet-bg" data-close><div class="sheet photos" role="dialog" aria-modal="true" aria-label="${esc(tr('Photos of', '相片：'))} ${esc(name)}">
    <div class="ph-head"><h2>${esc(name)}</h2><button class="btn sm" data-close>${icon('x', 16)} ${tr('Close', '關閉')}</button></div>
    <div class="ph-strip">${list.map((p, i) => `<figure><img src="${esc(p.src)}" alt="${esc(name)} ${i + 1}" loading="lazy" decoding="async" width="${p.w || 800}" height="${p.h || 600}"><figcaption>${esc(p.author)} · <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.license)}</a></figcaption></figure>`).join('')}</div>
    <p class="ph-note">${tr('Swipe for more. Each photo credits its photographer. December is darker than most of these, with a low pink glow around midday.', '左右掃看更多。每張相片都註明攝影師。十二月會比大部分相片更暗，中午前後只有低低的粉紅餘暉。')}</p>
  </div></div>`;
  m.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', (e) => { if (e.target === el || el.tagName === 'BUTTON') close(); }));
  document.addEventListener('keydown', onKey);
  m.querySelector('[data-close].btn')?.focus();
  return true;
}
