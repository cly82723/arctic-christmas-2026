// All the pages except the day pages: Start, Today, Days, Spots, To-do, Packing, More and the guides.
import { content, state, planOf, me, setPlan, toggleTodo, setTodoOwner, addCustomTodo, claimItem, toggleTick, person } from './store.js';
import { computeDay, dur, fmt, osloNow, daysBetween } from './engine.js';
import { icon, TYPES } from './icons.js';
import { tr, L, spotName, spotNote, dayTitle, dateLong, dateShort, dayNum, monShort, wkShort, getLang } from './i18n.js';
import { esc, typeChips, legend, tip, bindTips, linkList, gmaps, amaps } from './ui.js';
import { downloadTrip } from './ics.js';
import { driveLine } from './pages-day.js';

const days = () => content.days.days;
const people = () => content.days.travellers;
const pname = (id) => { const t = people().find((x) => x.id === id); return t ? L(t.name) : ''; };
const sleepOf = (d) => spotName(content.spots[d.end] || content.spots[d.start]).replace(/^Stay: /, '').replace(/^住宿：/, '');
const driveOf = (d) => (d.info ? 0 : computeDay(d, planOf(d.id), content).driveTotal);
const page = (html, mount) => ({ html, mount: mount || ((root) => { bindTips(root); return {}; }) });

function dayCard(d, i) {
  const dr = driveOf(d);
  return `<a class="daycard" href="#/day/${d.id}"><div class="date"><b>${dayNum(d.date)}</b><span>${monShort(d.date)}</span></div>
    <div class="dc-body"><h3>${esc(dayTitle(d))}</h3><p>${esc(driveLine(d))}</p><div class="rmeta">${dr ? `<span class="pill">${icon('car', 13)} ${dur(dr)}</span>` : ''}<span class="pill">${icon('stay', 13)} ${esc(sleepOf(d))}</span></div></div>${icon('right', 18)}</a>`;
}

export function startPage() {
  const today = osloNow(content.days.trip.tz).iso; const T = content.days.trip;
  const until = daysBetween(today, T.start); const inTrip = today >= T.start && today <= T.end;
  const week = today >= T.weekBefore && today <= T.end;
  const open = [...content.guides.todo, ...state.custom.map((c) => ({ id: c.id, t: [c.t, c.t] }))].filter((t) => !state.todos[t.id]?.done);
  const hero = inTrip ? `<a class="hero-btn" href="#/today">${icon('clock', 20)} ${tr('Open today', '開啟今天')}</a>` : until > 0 ? `<div class="count"><b>${until}</b><span>${tr('days to go', '日後出發')}</span></div>` : '';
  const html = `<section class="start"><header class="hero"><div class="eyebrow">${dateShort(T.start)} – ${dateShort(T.end)} · Oslo · Tromsø · Lofoten</div><h1>${esc(L(T.title))}</h1>${hero}</header>
    ${tip('welcome', tr('Welcome', '歡迎'), tr('This is your shared plan. Tap a day to see its map. Tap <b>Today</b> during the trip. Everything works offline once opened.', '這是你們的共用行程。點選一天可看地圖。旅程中點<b>今天</b>。開啟過一次後可離線使用。'))}
    <div class="card"><h2>${week ? tr('Week-before checklist', '出發前一週清單') : tr('The trip in 60 seconds', '60 秒看完行程')}</h2>
      ${week ? `<ul class="check">${[['Confirm bookings and the fox visit', '確認預訂及北極狐體驗'], ['Download offline maps', '下載離線地圖'], ['Install the apps and add a payment card', '安裝應用程式並登記付款卡'], ['Pack: open the Packing list', '收拾行李：打開行李清單'], ['Check the forecast on Yr', '在 Yr 查看天氣預報'], ['Charge power banks and phones', '為行動電源與手機充電']].map(([a, b]) => `<li>${icon('check', 16)} ${tr(a, b)}</li>`).join('')}</ul>`
      : `<ul class="check">${[['Oslo layover, then fly north on 22 Dec.', '12 月 22 日奧斯陸中轉，然後飛往北部。'], ['Tromsø 23–25 Dec: whales, fjords and white beaches.', '12 月 23–25 日 Tromsø：賞鯨、峽灣與白沙灘。'], ['26 Dec Polar Park, then 27–29 Dec Lofoten.', '12 月 26 日 Polar Park，然後 12 月 27–29 日 Lofoten。'], ['30 Dec drive to Evenes, 31 Dec fly out.', '12 月 30 日駕車往 Evenes，31 日飛離。'], ['Polar night: no sunrise, a glow window of about 11:00–13:00.', '極夜：沒有日出，約 11:00–13:00 有一段餘暉。']].map(([a, b]) => `<li>${icon('check', 16)} ${tr(a, b)}</li>`).join('')}</ul>`}
      <div class="actions"><button class="btn" id="tripcal">${icon('cal', 17)} ${tr('Add whole trip to calendar', '把整個行程加入日曆')}</button><a class="btn" href="#/how">${icon('help', 17)} ${tr('How this works', '使用說明')}</a></div></div>
    ${open.length ? `<div class="card"><h2>${tr('Still to do', '仍待完成')}</h2><ul class="check">${open.slice(0, 5).map((t) => `<li>${icon('list', 16)} ${esc(L(t.t))}</li>`).join('')}</ul><a class="more-link" href="#/todo">${tr('See the full list', '查看完整清單')} ${icon('right', 15)}</a></div>` : ''}
    <h2 class="sec">${tr('All days', '所有日子')}</h2><div class="daycards">${days().map(dayCard).join('')}</div></section>`;
  return page(html, (root) => { bindTips(root); root.querySelector('#tripcal')?.addEventListener('click', downloadTrip); return {}; });
}

export function daysPage() { return page(`<section><h1 class="pt">${tr('Days', '日子')}</h1><div class="daycards">${days().map(dayCard).join('')}</div></section>`); }

export function todayPage() {
  const T = content.days.trip; const now = osloNow(T.tz);
  const day = days().find((d) => d.date === now.iso);
  if (!day) {
    const before = now.iso < T.start;
    return page(`<section><h1 class="pt">${tr('Today', '今天')}</h1><div class="card"><p>${before ? tr('The trip has not started. Here is Day 0.', '旅程尚未開始。以下是第 0 天。') : tr('The trip is over. Welcome home.', '旅程已結束，歡迎回家。')}</p>${before ? `<a class="btn" href="#/day/d0">${tr('Open Day 0', '開啟第 0 天')}</a>` : ''}</div></section>`);
  }
  const calc = computeDay(day, planOf(day.id), content);
  const nowMin = now.min; const rows = calc.rows;
  const nextI = rows.findIndex((r) => r.arrive > nowMin); const cur = rows.filter((r) => r.arrive <= nowMin && r.depart >= nowMin)[0];
  const card = (r, label) => { const s = content.spots[r.id]; return `<div class="card nn"><div class="eyebrow">${label}</div><h2>${fmt(r.arrive)} · ${esc(spotName(s))}</h2><div class="rmeta">${typeChips(s.t)}</div><p>${esc(spotNote(s))}</p>
    <div class="acts">${s.c ? `<a class="btn" href="${gmaps(s)}" target="_blank" rel="noopener">${icon('map', 16)} Google</a><a class="btn" href="${amaps(s, spotName(s))}" target="_blank" rel="noopener">${icon('map', 16)} Apple</a>` : ''}<button class="btn" data-done="${r.id}">${icon('check', 16)} ${person(me.id || 'guest').stops?.[r.id] ? tr('Done', '已完成') : tr('Mark done', '標記完成')}</button></div></div>`; };
  const html = `<section><div class="eyebrow">${dateLong(day.date)}</div><h1 class="pt">${esc(dayTitle(day))}</h1>
    ${cur ? card(cur, tr('Now', '現在')) : ''}${nextI >= 0 ? card(rows[nextI], tr('Next', '下一站')) : `<div class="card"><p>${tr('Nothing more is planned today.', '今天沒有更多行程。')}</p></div>`}
    ${day.aurora ? `<div class="card aur"><h2>${icon('aurora', 20)} ${tr('Aurora check at 17:00', '17:00 極光檢查')}</h2><p>${tr('Look at cloud cover. Go only if a gap is coming.', '查看雲量，預計有空隙才出發。')} <a href="https://www.yr.no/en" target="_blank" rel="noopener">Yr ${icon('ext', 13)}</a></p></div>` : ''}
    <div class="card readfirst"><h2>${tr('Read this first', '先讀這個')}</h2><ul>${[driveLine(day, calc), ...day.sum.slice(1).map(L)].map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
    <a class="btn" href="#/day/${day.id}">${icon('map', 17)} ${tr('Open the day map', '開啟當天地圖')}</a></section>`;
  return page(html, (root) => { root.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => toggleTick(me.id || 'guest', 'stops', b.dataset.done, true))); return {}; });
}

export function spotsPage() {
  const list = Object.values(content.spots).filter((s) => !['stay', 'transit'].includes(s.t[0]) && !s.fixed && !s.id.endsWith('_alt') && !/\d$/.test(s.id));
  const areas = [...new Set(list.map((s) => s.area))];
  const html = `<section><h1 class="pt">${tr('Spots and swaps', '景點與更換')}</h1>
    ${tip('spots', tr('Add a spot to any day', '把景點加入任何一天'), tr('Pick a day under a spot and tap <b>Add</b>. It moves out of the day it was in. You can also drag on each day page.', '在景點下方選一天，點<b>加入</b>。它會由原本的那天移走。也可以在每日頁面拖放。'))}
    <div class="card"><h2>${tr('What the icons mean', '圖示說明')}</h2>${legend()}</div>
    ${areas.map((a) => `<h2 class="sec cap">${esc(a)}</h2><ul class="list">${list.filter((s) => s.area === a).map((s) => `<li class="row opt" data-id="${s.id}"><div class="rbody"><h4>${esc(spotName(s))}</h4><div class="rmeta">${typeChips(s.t, 6)}<span class="pill">${icon('clock', 13)} ${tr('Suggested', '建議')} ${dur(s.d || 15)}</span><span class="pill">${s.l === 'day' ? icon('sun', 13) : icon('moon', 13)} ${s.l === 'day' ? tr('Daylight', '日光') : s.l === 'night' ? tr('After dark', '天黑後') : tr('Any time', '任何時間')}</span></div><p>${esc(spotNote(s))}</p>
      <div class="acts"><select data-day="${s.id}" aria-label="${tr('Day', '日子')}">${days().filter((d) => !d.info).map((d) => `<option value="${d.id}">${dayNum(d.date)} ${monShort(d.date)}</option>`).join('')}</select><button class="btn sm" data-addto="${s.id}">${icon('plus', 15)} ${tr('Add', '加入')}</button></div></div></li>`).join('')}</ul>`).join('')}</section>`;
  return page(html, (root) => { bindTips(root); root.addEventListener('click', (e) => { const b = e.target.closest('[data-addto]'); if (!b) return; const id = b.dataset.addto; const dayId = root.querySelector(`[data-day="${id}"]`).value;
    days().forEach((d) => { if (d.id !== dayId && planOf(d.id).includes(id)) setPlan(d.id, planOf(d.id).filter((x) => x !== id), 'move'); }); if (!planOf(dayId).includes(id)) setPlan(dayId, [...planOf(dayId), id]); b.textContent = '✓'; }); return {}; });
}

export function todoPage() {
  const items = [...content.guides.todo, ...state.custom.map((c) => ({ id: c.id, t: [c.t, c.t], d: ['', ''] }))];
  const html = `<section><h1 class="pt">${tr('To-do', '待辦事項')}</h1>
    ${tip('todo', tr('Tick things off together', '一起打勾'), tr('Ticks are shared with everyone. Assign an item to a person with the menu.', '打勾會與所有人同步。可用選單指派給某人。'))}
    <ul class="list todo">${items.map((t) => { const st = state.todos[t.id] || {}; return `<li class="row ${st.done ? 'done' : ''}"><button class="tick ${st.done ? 'on' : ''}" data-todo="${t.id}" aria-label="${tr('Toggle', '切換')}">${st.done ? icon('check', 18) : ''}</button><div class="rbody"><h4>${esc(L(t.t))} ${t.must ? `<span class="pill r">${tr('Must book', '必須預約')}</span>` : ''}</h4>${t.d?.[0] ? `<p>${esc(L(t.d))}</p>` : ''}
      <div class="acts">${t.due ? `<span class="pill">${icon('clock', 13)} ${tr('Due', '到期')} ${dateShort(t.due)}</span>` : ''}${t.link ? `<a class="btn sm" href="${esc(t.link)}" target="_blank" rel="noopener">${icon('ext', 14)} ${tr('Open', '開啟')}</a>` : ''}
      <select data-owner="${t.id}" aria-label="${tr('Owner', '負責人')}"><option value="">${tr('Anyone', '任何人')}</option>${people().map((p) => `<option value="${p.id}" ${(st.owner ?? t.owner) === p.id ? 'selected' : ''}>${esc(L(p.name))}</option>`).join('')}</select></div></div></li>`; }).join('')}</ul>
    <form id="addtodo" class="addrow"><input id="todotext" placeholder="${tr('Add something to do', '新增待辦事項')}" aria-label="${tr('New to-do', '新待辦')}"><button class="btn">${icon('plus', 16)} ${tr('Add', '新增')}</button></form></section>`;
  return page(html, (root) => { bindTips(root);
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-todo]'); if (b) toggleTodo(b.dataset.todo); });
    root.addEventListener('change', (e) => { if (e.target.dataset.owner) setTodoOwner(e.target.dataset.owner, e.target.value); });
    root.querySelector('#addtodo').addEventListener('submit', (e) => { e.preventDefault(); const v = root.querySelector('#todotext').value.trim(); if (v) addCustomTodo(v); });
    return {}; });
}

export function packPage() {
  const G = content.guides; const pid = (window.__packWho) || me.id || 'cal';
  const mine = G.packing.filter((i) => i.who === 'all' || (i.who === 'cal' && pid === 'cal'));
  const ticks = person(pid).pack || {};
  const done = mine.filter((i) => ticks[i.id]).length;
  const html = `<section><h1 class="pt">${tr('Packing list', '行李清單')}</h1>
    ${tip('pack', tr('Your own list', '你自己的清單'), tr('Ticks are saved under the name you pick. Group items show who has claimed them.', '打勾會記在你選擇的名下。共用物品會顯示誰已認領。'))}
    <div class="acts"><select id="who" aria-label="${tr('Whose list', '誰的清單')}">${people().map((p) => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(L(p.name))}</option>`).join('')}</select><span class="pill">${done}/${mine.length}</span></div>
    ${G.packGroups.map(([g, en, zh]) => { const its = G.packing.filter((i) => i.g === g && (i.who !== 'cal' || pid === 'cal')); if (!its.length) return ''; return `<h2 class="sec">${tr(en, zh)}</h2><ul class="list">${its.map((i) => {
      const claimed = state.claims[i.id]; return i.who === 'group' ? `<li class="row"><div class="rbody"><h4>${esc(L(i.t))}</h4>${i.n[0] ? `<p>${esc(L(i.n))}</p>` : ''}</div><button class="btn sm ${claimed ? 'on' : ''}" data-claim="${i.id}">${claimed ? esc(pname(claimed)) : tr("I'll bring it", '我來帶')}</button></li>`
      : `<li class="row ${ticks[i.id] ? 'done' : ''}"><button class="tick ${ticks[i.id] ? 'on' : ''}" data-pack="${i.id}" aria-label="${tr('Toggle', '切換')}">${ticks[i.id] ? icon('check', 18) : ''}</button><div class="rbody"><h4>${esc(L(i.t))}</h4>${i.n[0] ? `<p>${esc(L(i.n))}</p>` : ''}</div></li>`; }).join('')}</ul>`; }).join('')}
    <h2 class="sec">${tr('Where this advice comes from', '建議來源')}</h2>${linkList(G.packSources)}</section>`;
  return page(html, (root) => { bindTips(root);
    root.querySelector('#who').addEventListener('change', (e) => { window.__packWho = e.target.value; import('./main.js').then((m) => m.rerender()); });
    root.addEventListener('click', (e) => { const p = e.target.closest('[data-pack]'); if (p) toggleTick(pid, 'pack', p.dataset.pack, true); const c = e.target.closest('[data-claim]'); if (c) claimItem(c.dataset.claim, state.claims[c.dataset.claim] === (me.id || pid) ? '' : (me.id || pid)); });
    return {}; });
}

export function morePage() {
  const L2 = [['#/spots', 'list', 'Spots and swaps', '景點與更換'], ['#/pack', 'bag', 'Packing list', '行李清單'], ['#/aurora', 'aurora', 'Aurora and light guide', '極光與光線指南'], ['#/know', 'info', 'Know before you go', '出發前須知'], ['#/apps', 'nav', 'Apps and what they are for', '應用程式及用途'], ['#/bookings', 'cal', 'Bookings and contacts', '預訂及聯絡'], ['#/names', 'globe', 'Place names in Chinese', '地名中文對照'], ['#/how', 'help', 'How this works', '使用說明']];
  return page(`<section><h1 class="pt">${tr('More', '更多')}</h1><div class="daycards">${L2.map(([h, ic, en, zh]) => `<a class="daycard slim" href="${h}">${icon(ic, 22)}<div class="dc-body"><h3>${tr(en, zh)}</h3></div>${icon('right', 18)}</a>`).join('')}</div></section>`);
}

export function auroraPage() {
  const A = content.guides.aurora;
  return page(`<section><h1 class="pt">${tr('Aurora and light guide', '極光與光線指南')}</h1>
    <div class="card"><h2>${icon('sun', 20)} ${tr('Polar night', '極夜')}</h2><p>${tr('The sun does not rise. About 09:30 to 14:30 is usable light, with a pink-orange glow around 11:00 to 13:30 and blue light on either side. Plan your big photos inside that window.', '太陽不會升起。約 09:30 至 14:30 有可用光線，約 11:00 至 13:30 有粉橙色餘暉，兩邊是藍光。請把重要的拍攝安排在這段時間內。')}</p></div>
    <div class="card"><h2>${icon('aurora', 20)} ${tr('How to chase the aurora', '如何追極光')}</h2><ol class="steps">${A.steps.map((s) => `<li>${esc(L(s))}</li>`).join('')}</ol></div>
    <div class="card"><h2>${icon('moon', 20)} ${tr('The moon', '月亮')}</h2><p>${esc(L(A.moon))}</p></div>
    <h2 class="sec">${tr('Sources', '來源')}</h2>${linkList(A.sources)}</section>`);
}

export function knowPage() {
  const K = content.guides.know;
  return page(`<section><h1 class="pt">${tr('Know before you go', '出發前須知')}</h1>${K.map((k) => `<div class="card"><h2>${esc(L(k.t))}</h2><ul class="plain">${k.b.map((l) => `<li>${esc(L(l))}</li>`).join('')}</ul>${k.sources ? linkList(k.sources) : ''}</div>`).join('')}<h2 class="sec">${tr('Sources', '來源')}</h2>${linkList(content.guides.knowSources)}</section>`);
}

export function appsPage() {
  const G = content.guides; const kinds = Object.keys(G.appKinds);
  return page(`<section><h1 class="pt">${tr('Apps', '應用程式')}</h1><p class="lead">${tr('Install these before you fly and register a payment card where needed.', '起飛前安裝，並在需要時登記付款卡。')}</p>
    ${kinds.map((k) => `<h2 class="sec">${esc(L(G.appKinds[k]))}</h2><ul class="list">${G.apps.filter((a) => a.k === k).map((a) => `<li class="row"><div class="rbody"><h4>${esc(a.n)}</h4><p>${esc(L(a.t))}</p></div></li>`).join('')}</ul>`).join('')}
    <h2 class="sec">${tr('Sources', '來源')}</h2>${linkList(G.appSources)}</section>`);
}

export function bookingsPage() {
  const G = content.guides; const T = content.days.trip;
  return page(`<section><h1 class="pt">${tr('Bookings and contacts', '預訂及聯絡')}</h1>
    ${G.bookings.map((g) => `<div class="card"><h2>${esc(L(g.g))}</h2><ul class="plain">${g.rows.map((r) => `<li><b>${esc(r[0])}</b> ${esc(getLang() === 'zh' ? r[2] : r[1])}</li>`).join('')}</ul></div>`).join('')}
    <div class="card"><h2>${tr('Contacts', '聯絡方式')}</h2><ul class="plain">${G.contacts.map(([a, b]) => `<li><b>${esc(a)}</b> ${b.startsWith('http') ? `<a href="${esc(b)}" target="_blank" rel="noopener">${esc(b)}</a>` : esc(b)}</li>`).join('')}</ul></div>
    <a class="btn" href="${esc(T.sheetUrl)}" target="_blank" rel="noopener">${icon('ext', 16)} ${tr('Your sheet', '你的試算表')}</a></section>`);
}

export function namesPage() {
  const N = content.guides.names;
  return page(`<section><h1 class="pt">${tr('Place names in Chinese', '地名中文對照')}</h1><p class="lead">${esc(L(N.note))}</p>
    <div class="card"><ul class="plain">${N.rows.map(([e, z]) => `<li><b>${esc(e)}</b> ${esc(z)}</li>`).join('')}</ul></div><h2 class="sec">${tr('Sources', '來源')}</h2>${linkList(N.sources)}</section>`);
}

export function howPage() {
  return page(`<section><h1 class="pt">${tr('How this works', '使用說明')}</h1>${content.guides.howto.map((h) => `<div class="card"><h2>${esc(L(h.t))}</h2><ol class="steps">${h.s.map((s) => `<li>${esc(L(s))}</li>`).join('')}</ol></div>`).join('')}</section>`);
}
void TYPES;
