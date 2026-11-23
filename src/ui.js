// Small shared UI helpers.
import { icon, TYPES, typeIcons } from './icons.js';
import { L, tr, stripCjk } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const typeChips = (types, max = 4) => typeIcons(types, max).map((t) => `<span class="tchip" title="${esc(L(TYPES[t].l))}" style="--c:${TYPES[t].c}">${icon(t, 15)}</span>`).join('');
export const gmaps = (s) => `https://www.google.com/maps/search/?api=1&query=${s.c[0]},${s.c[1]}`;
export const amaps = (s, name) => `https://maps.apple.com/?ll=${s.c[0]},${s.c[1]}&q=${encodeURIComponent(name)}`;
export const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

// A tip that explains a feature once, then stays out of the way. Dismissed state is saved per device.
export const tip = (id, title, body) => (lsGet('tip-' + id, false) ? '' :
  `<aside class="tip" data-tip="${id}"><div class="tip-ic">${icon('info', 20)}</div><div><b>${esc(title)}</b><p>${body}</p></div><button class="tip-x" data-tip-x="${id}" aria-label="${tr('Got it', '明白了')}">${tr('Got it', '明白')}</button></aside>`);
export const bindTips = (root) => root.querySelectorAll('[data-tip-x]').forEach((b) => b.addEventListener('click', () => { lsSet('tip-' + b.dataset.tipX, true); b.closest('.tip').remove(); }));

// Short confirmation after an action, with an optional Undo. Sits above the tab bar and clears itself.
let toastTimer;
export function toast(msg, action) {
  const el = document.getElementById('toast'); if (!el) return;
  clearTimeout(toastTimer);
  el.innerHTML = `<div class="toast-in" role="status"><span>${esc(msg)}</span>${action ? `<button class="toast-act">${esc(action.label)}</button>` : ''}</div>`;
  el.querySelector('.toast-act')?.addEventListener('click', () => { clearTimeout(toastTimer); el.innerHTML = ''; action.fn(); });
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, action ? 5000 : 2200);
}

export const photoLink = (s) => `<a class="btn sm" data-photos="${s.id}" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(stripCjk(s.n[0]) + ' Norway winter')}" target="_blank" rel="noopener">${icon('eye', 15)} ${tr('See photos', '看相片')}</a>`;

export const parkLink = (s) => (s.pk ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${s.pk[0]},${s.pk[1]}" target="_blank" rel="noopener">${icon('park', 15)} ${tr('Parking pin', '停車位置')}</a>` : '');

export const legend = () => `<div class="legend">${Object.entries(TYPES).map(([k, v]) => `<span class="lg"><span class="tchip" style="--c:${v.c}">${icon(k, 15)}</span>${esc(L(v.l))}</span>`).join('')}</div>`;
export const linkList = (arr) => `<ul class="srcs">${arr.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ${icon('ext', 13)}</a></li>`).join('')}</ul>`;
