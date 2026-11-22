// App shell: header, bottom tabs, hash router, name picker and sync status.
import { init, subscribe, content, net, me, needsInvite } from './store.js';
import { tr, getLang, setLang } from './i18n.js';
import { icon } from './icons.js';
import { esc } from './ui.js';
import { dayPage } from './pages-day.js';
import * as M from './pages-misc.js';

const app = document.getElementById('app');
let current = null; let view = null;

const routes = {
  '': () => M.startPage(), today: () => M.todayPage(), days: () => M.daysPage(), todo: () => M.todoPage(), more: () => M.morePage(),
  spots: () => M.spotsPage(), pack: () => M.packPage(), aurora: () => M.auroraPage(), know: () => M.knowPage(), apps: () => M.appsPage(),
  bookings: () => M.bookingsPage(), names: () => M.namesPage(), how: () => M.howPage()
};
const tabs = [['', 'home', 'Start', '開始'], ['today', 'clock', 'Today', '今天'], ['days', 'map', 'Days', '日子'], ['todo', 'check', 'To-do', '待辦'], ['more', 'more', 'More', '更多']];

function shell() {
  app.innerHTML = `<header class="top"><a class="brand" href="#/">${icon('aurora', 22)}<span>${tr('Arctic Christmas', '北極聖誕')}</span></a><div class="topr"><span id="sync" class="sync"></span><button id="who" class="chip"></button><button id="lang" class="chip" aria-label="Language">${icon('globe', 15)} ${getLang() === 'zh' ? 'EN' : '中文'}</button></div></header>
    <main id="view" tabindex="-1"></main><nav class="tabbar" aria-label="Main">${tabs.map(([h, ic, en, zh]) => `<a href="#/${h}" data-tab="${h}">${icon(ic, 22)}<span>${tr(en, zh)}</span></a>`).join('')}</nav><div id="modal"></div><div id="toast" aria-live="polite"></div>`;
  view = document.getElementById('view');
  document.getElementById('lang').addEventListener('click', () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); rerender(); });
  document.getElementById('who').addEventListener('click', pickName);
}

function status() {
  const s = document.getElementById('sync'); const w = document.getElementById('who'); if (!s) return;
  const t = content.ready ? content.days.travellers.find((x) => x.id === me.id) : null;
  w.textContent = t ? t.name[getLang() === 'zh' ? 1 : 0] : tr('Who are you?', '你是誰？');
  const live = net.mode === 'live';
  s.className = 'sync ' + (!live ? 'demo' : !net.online ? 'off' : net.synced ? 'ok' : 'wait');
  s.textContent = !live ? tr('Demo', '示範') : !net.online ? tr('Offline', '離線') : net.synced ? tr('Synced', '已同步') : tr('Syncing', '同步中');
  s.title = !live ? tr('Demo mode: changes stay on this device', '示範模式：修改只留在此裝置') : '';
}

function pickName() {
  if (!content.ready) return;
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><h2>${tr('Who are you?', '你是誰？')}</h2><p>${tr('Your edits and ticks are saved under your name.', '你的修改和打勾會記在你的名下。')}</p>
    <div class="who">${content.days.travellers.map((t) => `<button class="btn big" data-id="${t.id}">${esc(t.name[getLang() === 'zh' ? 1 : 0])}</button>`).join('')}</div><button class="btn sm" data-id="">${tr('Just looking', '只是看看')}</button></div></div>`;
  m.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.id) me.set(b.dataset.id); m.innerHTML = ''; status(); rerender(); }));
}

export function rerender(animate = false) {
  if (!view) return;
  current?.destroy?.(); current = null;
  // A fresh container each time drops every listener the previous page attached, so taps never fire twice.
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  view.classList.toggle('enter', animate === true);
  const seg = location.hash.replace(/^#\/?/, '').split('/');
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === (['today', 'days', 'todo', 'more'].includes(seg[0]) ? seg[0] : ['spots', 'pack', 'aurora', 'know', 'apps', 'bookings', 'names', 'how'].includes(seg[0]) ? 'more' : seg[0] === 'day' ? 'days' : '')));
  if (needsInvite()) { view.innerHTML = `<section class="card"><h2>${tr('Open your invite link', '請開啟你的邀請連結')}</h2><p>${tr('This app opens only with the private link CaL sent to the group. Open that link once on this phone.', '這個應用程式只能用 CaL 發給大家的私人連結開啟。請在這部手機上開啟該連結一次。')}</p></section>`; return; }
  if (net.error) { view.innerHTML = `<section class="card"><h2>${tr('Something went wrong', '出現問題')}</h2><p>${esc(net.error)}</p></section>`; return; }
  if (!content.ready) { view.innerHTML = `<section class="card"><p>${tr('Loading the plan…', '載入行程中…')}</p></section>`; return; }
  const p = seg[0] === 'day' ? dayPage(seg[1] || 'd0') : (routes[seg[0] || ''] || routes[''])();
  view.innerHTML = p.html; current = p.mount(view) || {};
  window.scrollTo(0, 0);
}

function onChange() {
  status();
  if (!content.ready) return rerender();
  const a = document.activeElement;
  if (a && a.tagName === 'INPUT' && a.value) return;
  if (current?.refresh) current.refresh(); else if (view && !(a && a.tagName === 'SELECT')) rerender();
}

shell();
addEventListener('hashchange', () => rerender(true));
subscribe(onChange);
init().then(() => { status(); rerender(true); if (content.ready && !me.id) pickName(); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
