// One page per day: map first, a short read-first list, the daylight bar, then ONE schedule (a timeline you can drag),
// options, aurora and history. On wide screens the map stays beside the schedule.
import Sortable from 'sortablejs';
import { content, state, planOf, dayOf, setPlan, undo, resetDay, lockDay, me } from './store.js';
import { computeDay, fmt, dur, toMin, leg } from './engine.js';
import { icon } from './icons.js';
import { tr, L, spotName, spotNote, spotPark, dayTitle, dayNum, wkShort, monShort } from './i18n.js';
import { esc, typeChips, gmaps, amaps, tip, bindTips, lsGet, lsSet, toast, photoLink } from './ui.js';
import { DayMap } from './map.js';
import { downloadDay } from './ics.js';

const SKIP = new Set(['stay', 'transit']);
const OPT_LIMIT = 4;
const allAssigned = () => new Set(content.days.days.flatMap((d) => planOf(d.id)));
const isAdmin = () => me.id === 'cal';
const personName = (id) => { const t = content.days.travellers.find((x) => x.id === id); return t ? L(t.name) : tr('Someone', '有人'); };
const stayName = (id) => spotName(content.spots[id]).replace(/^Stay: /, '').replace(/^住宿：/, '');

// One live sentence about the day's driving, always from the current order of stops (including the last leg to the stay).
export function driveLine(day, calc) {
  if (day.info) return L(day.sum[0]);
  const c = calc || computeDay(day, planOf(day.id), content);
  return tr(`${dur(c.driveTotal)} of driving, home at about ${c.home ? fmt(c.home.arrive) : '--:--'}.`, `車程共 ${dur(c.driveTotal)}，約 ${c.home ? fmt(c.home.arrive) : '--:--'} 回到住處。`);
}

function trayIds(day, plan) {
  const assigned = allAssigned();
  return [...new Set([...day.alts, ...day.plan])].filter((id) => !plan.includes(id) && !assigned.has(id) && content.spots[id]);
}
function lockedRow(day, id) {
  const s = content.spots[id];
  return !!state.locks[day.id] || (s.fixed && !(s.lockedBy && !state.todos[s.lockedBy]?.done));
}
function addedDrive(day, plan, id) {
  const last = plan.length ? plan[plan.length - 1] : day.start;
  return Math.max(0, leg(last, id, content.spots, content.routes).m + leg(id, day.end, content.spots, content.routes).m - leg(last, day.end, content.spots, content.routes).m);
}

const legRow = (g) => `<li class="leg" aria-hidden="true">${icon(g.walk ? 'walk' : 'car', 15)} <span>${g.walk ? tr('Walk, about 15 min', '步行約 15 分鐘') : `${dur(g.m)}${g.km ? ` · ${g.km} km` : ''}${g.exact ? '' : ' *'}`}</span></li>`;
const stayRow = (time, text) => `<li class="stayrow"><b class="stt">${time}</b>${icon('stay', 18)}<span>${esc(text)}</span></li>`;

function planRow(r, locked) {
  const s = content.spots[r.id];
  const warn = r.dark ? `<span class="warn">${icon('warn', 15)} ${tr('Starts after last light', '天光過後才開始')}</span>` : r.late ? `<span class="warn">${icon('warn', 15)} ${tr('Later than the booked time', '遲過預訂時間')}</span>` : '';
  return `<li class="row ${locked ? 'locked' : ''}" data-id="${r.id}" data-locked="${locked ? 1 : 0}">
    <span class="grip" title="${tr('Press and hold to drag', '按住拖動')}">${locked ? icon('fixed', 18) : icon('grip', 18)}</span>
    <div class="rtime"><b>${fmt(r.arrive)}</b>${s.d ? `<small>${dur(s.d)}</small>` : ''}</div>
    <div class="rbody"><p class="rt">${esc(spotName(s))}</p>
      <div class="rmeta">${typeChips(s.t)}${warn}</div>
      <div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p>
        <div class="acts">${s.c ? `${photoLink(s)}<a class="btn sm" href="${gmaps(s)}" target="_blank" rel="noopener">${icon('map', 15)} Google</a><a class="btn sm" href="${amaps(s, spotName(s))}" target="_blank" rel="noopener">${icon('map', 15)} Apple</a>` : ''}
        ${locked ? '' : `<button class="btn sm" data-up="${r.id}" aria-label="${tr('Move earlier', '提前')}">${icon('up', 15)}</button><button class="btn sm" data-dn="${r.id}" aria-label="${tr('Move later', '延後')}">${icon('down', 15)}</button><button class="btn sm danger" data-rm="${r.id}">${icon('x', 15)} ${tr('Remove', '移除')}</button>`}</div></div>
    </div></li>`;
}
function optRow(id, drive) {
  const s = content.spots[id];
  const light = s.l === 'day' ? tr('needs daylight', '需要日光') : s.l === 'night' ? tr('best after dark', '天黑後最佳') : tr('any time', '任何時間');
  return `<li class="row opt" data-id="${id}" data-locked="0">
    <span class="grip">${icon('grip', 18)}</span>
    <div class="rbody"><p class="rt">${esc(spotName(s))}</p>
      <div class="rmeta">${typeChips(s.t)}<span class="pill">${icon(s.l === 'night' ? 'moon' : 'clock', 14)} ${dur(s.d || 15)} · ${light}</span>${drive ? `<span class="pill">${icon('car', 14)} ${tr('+', '多 ')}${dur(drive)} ${tr('driving', '車程')}</span>` : ''}</div>
      <div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p><div class="acts">${photoLink(s)}</div></div></div>
    <button class="btn sm add" data-add="${id}" aria-label="${tr('Add', '加入')} ${esc(spotName(s))}">${icon('plus', 16)} ${tr('Add', '加入')}</button></li>`;
}

export function dayPage(dayId) {
  const day = dayOf(dayId);
  const idx = content.days.days.findIndex((d) => d.id === dayId);
  const prev = content.days.days[idx - 1], next = content.days.days[idx + 1];
  const chips = content.days.days.map((d) => `<a class="dchip ${d.id === dayId ? 'on' : ''}" href="#/day/${d.id}" aria-label="${dayNum(d.date)} ${monShort(d.date)}"><b>${dayNum(d.date)}</b><small>${monShort(d.date)}</small></a>`).join('');
  const html = `<section class="day-page">
    <nav class="daystrip" aria-label="${tr('Days', '日子')}">${chips}</nav>
    <header class="dayhead"><div class="date"><b>${dayNum(day.date)}</b><span>${monShort(day.date)} · ${wkShort(day.date)}</span></div><h1>${esc(dayTitle(day))}</h1></header>
    <div class="daygrid">
    ${day.nomap ? '' : `<div class="mapcol"><div class="mapcard"><div class="mapbox"><div id="map" role="application" aria-label="${tr('Map of the day', '當天地圖')}"></div>
      <button class="maplock btn sm" id="maplock">${icon('map', 15)} ${tr('Tap to move and zoom the map', '點一下移動及縮放地圖')}</button></div>
      <div class="maptools"><label class="sw"><input type="checkbox" id="showopt" ${lsGet('showopts', true) ? 'checked' : ''}><span></span>${tr('Show options', '顯示備選')}</label><button class="btn sm" id="fit">${icon('map', 15)} ${tr('Fit all', '顯示全部')}</button><button class="btn sm" id="maplockbtn" hidden>${tr('Lock map', '鎖定地圖')}</button></div>
      <div class="mapkey"><span><i class="k plan"></i>${tr('Your day', '你的一天')}</span><span><i class="k alt"></i>${tr('Options', '備選')}</span><span><i class="k au"></i>${tr('Aurora', '極光')}</span><span><i class="k line"></i>${tr('Road', '道路')}</span></div></div></div>`}
    <div class="daycol">
      <div class="card readfirst"><h2>${tr('Read this first', '先讀這個')}</h2><ul id="rf"></ul></div>
      <div id="daybar"></div>
      ${day.info ? '' : tip('swap', tr('Reorder by dragging', '拖動調整次序'), tr('Press and hold the dots on a stop, then drag it. Drag between <b>Your day</b> and <b>Options</b> to swap. Press and hold an option to see it on the map, or tap <b>Add</b>.', '按住停靠點旁的圓點，然後拖動。在<b>你的一天</b>與<b>備選</b>之間拖動即可更換。按住備選可在地圖上查看，或直接點<b>加入</b>。'))}
      <h2 class="sec">${tr('Your day', '你的一天')} ${day.info ? '' : `<small>${tr('tap a stop for details', '點選停靠點查看詳情')}</small>`}</h2>
      <div id="planwrap"></div>
      ${day.alts.length || !day.info ? `<h2 class="sec">${tr('Options', '備選')} <small>${tr('swap in for a stop above', '可換入上面的停靠點')}</small></h2><ul id="tray" class="list tray"></ul><div id="moreopts"></div><div id="more"></div>` : ''}
      <div id="aurora"></div>
      <details class="daymore"><summary>${tr('More for this day', '這天的更多選項')}</summary><div class="actions"><button class="btn" id="cal">${icon('cal', 17)} ${tr('Add to calendar', '加入日曆')}</button>
        ${day.info ? '' : `<button class="btn" id="reset">${icon('undo', 17)} ${tr('Reset day', '重設這天')}</button>`}
        ${isAdmin() && !day.info ? `<button class="btn" id="lock">${icon('fixed', 17)} <span id="locklabel"></span></button>` : ''}</div></details>
      <div id="history"></div>
      <nav class="pager">${prev ? `<a href="#/day/${prev.id}">${icon('left', 18)} ${esc(dayTitle(prev))}</a>` : '<span></span>'}${next ? `<a href="#/day/${next.id}">${esc(dayTitle(next))} ${icon('right', 18)}</a>` : '<span></span>'}</nav>
    </div></div>
  </section>`;

  function mount(root) {
    let map = null; let sortables = []; let dragging = false; let showAll = false;
    const q = (s) => root.querySelector(s);
    const name = (id) => spotName(content.spots[id]);
    const spots = content.spots;

    if (!day.nomap) {
      map = new DayMap(q('#map'), {
        hover: (id, on) => root.querySelectorAll(`.row[data-id="${id}"]`).forEach((r) => r.classList.toggle('hl', on)),
        act: (a, id) => { if (a === 'add') addSpot(id); else if (a === 'rm') removeSpot(id); else if (a === 'zoom') map.focus(id); }
      });
    }
    const setMapLive = (on) => { map?.setInteractive(on); q('#maplock').hidden = on; q('#maplockbtn').hidden = !on; };

    function addSpot(id) {
      const cur = planOf(dayId);
      if (cur.includes(id)) return;
      content.days.days.forEach((d) => { if (d.id !== dayId && planOf(d.id).includes(id)) setPlan(d.id, planOf(d.id).filter((x) => x !== id), 'move'); });
      const before = [...cur];
      setPlan(dayId, [...cur, id]);
      toast(tr('Added to your day', '已加入你的一天'), { label: tr('Undo', '還原'), fn: () => setPlan(dayId, before, 'undo') });
    }
    function removeSpot(id) {
      const before = [...planOf(dayId)];
      setPlan(dayId, before.filter((x) => x !== id));
      toast(tr('Moved to Options', '已移到備選'), { label: tr('Undo', '還原'), fn: () => setPlan(dayId, before, 'undo') });
    }
    function move(id, dir) { const a = [...planOf(dayId)]; const i = a.indexOf(id); const j = i + dir; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setPlan(dayId, a); }

    function refresh() {
      if (dragging) return;
      const plan = planOf(dayId); const locked = !!state.locks[dayId];
      const calc = computeDay(day, plan, content);
      // read-first: the schedule already shows driving and where you sleep, so those lines are not repeated here
      const lines = day.info ? day.sum.map(L) : day.sum.slice(1).map(L).filter((l) => !/^(Sleep:|住宿：)/.test(l));
      q('#rf').innerHTML = lines.map((l) => `<li>${esc(l)}</li>`).join('');
      // daylight bar with the stops marked, and the one driving summary
      const lt = calc.light; const lo = 480, hi = 1020, span = hi - lo;
      const seg = (a, b, c) => `<i class="${c}" style="width:${Math.max(0, Math.min(hi, b) - Math.max(lo, a)) / span * 100}%"></i>`;
      const bar = lt ? seg(lo, toMin(lt.first), 'n') + seg(toMin(lt.first), toMin(lt.gs), 'b') + seg(toMin(lt.gs), toMin(lt.ge), 'g') + seg(toMin(lt.ge), toMin(lt.last), 'b') + seg(toMin(lt.last), hi, 'n') : '';
      const ticks = calc.rows.filter((r) => r.arrive >= lo && r.arrive <= hi).map((r) => `<em style="left:${(r.arrive - lo) / span * 100}%"></em>`).join('');
      const w = [];
      if (calc.warnings.includes('cap')) w.push(`<li class="bad">${icon('warn', 16)} ${tr('Driving is', '車程為')} ${dur(calc.driveTotal)}, ${tr('over your 5 h limit', '超過你的 5 小時上限')}.</li>`);
      if (calc.warnings.includes('dark')) w.push(`<li class="amber">${icon('warn', 16)} ${tr('A daylight spot starts after last light. Move it earlier or swap it.', '有日光景點在天光過後才開始。請提前或更換。')}</li>`);
      if (calc.warnings.includes('late')) w.push(`<li class="amber">${icon('warn', 16)} ${tr('You would miss a booked time. Remove something before it.', '你會遲過預訂時間。請先移除前面的行程。')}</li>`);
      if (calc.warnings.includes('late-night')) w.push(`<li class="amber">${icon('warn', 16)} ${tr('You would get home after midnight.', '你會在午夜後才回到住處。')}</li>`);
      q('#daybar').innerHTML = day.info ? '' : `<div class="card daybar"><div class="bar" role="img" aria-label="${tr('Daylight and stops', '日光與行程')}">${bar}${ticks}</div>
        <div class="scale"><span>08:00</span><span>11:00</span><span>14:00</span><span>17:00</span></div>
        <p class="lt">${lt ? `<span><i class="dot b"></i>${tr('First light', '第一道天光')} ${lt.first}</span><span><i class="dot g"></i>${tr('Glow', '餘暉')} ${lt.gs}–${lt.ge}</span><span><i class="dot b"></i>${tr('Last light', '最後天光')} ${lt.last}</span>` : ''}</p>
        <div class="meter ${calc.warnings.includes('cap') ? 'over' : ''}"><i style="width:${Math.min(100, calc.driveTotal / calc.cap * 100)}%"></i></div>
        <p class="mtxt">${icon('car', 15)} ${tr('Driving', '車程')} <b>${dur(calc.driveTotal)}</b> ${tr('of 5 h', '，上限 5 小時')}${calc.home ? ` · <span class="nw">${tr('home about', '約')} <b>${fmt(calc.home.arrive)}</b>${tr('', ' 回到住處')}</span>` : ''}</p>
        ${w.length ? `<ul class="warns">${w.join('')}</ul>` : ''}</div>`;
      // the schedule: stay tile, drive connectors, stops, stay tile
      const items = [];
      if (!day.info && day.start) items.push(stayRow(day.depart || '', `${tr('Leave ', '出發：')}${stayName(day.start)}`));
      calc.rows.forEach((r) => { if (!day.info && r.drive.m) items.push(legRow(r.drive)); items.push(planRow(r, day.info || lockedRow(day, r.id))); });
      if (calc.home) { items.push(legRow(calc.home.drive)); items.push(stayRow(fmt(calc.home.arrive), `${tr('Sleep: ', '住宿：')}${stayName(day.end)}`)); }
      q('#planwrap').innerHTML = `<ol id="plan" class="tl">${items.join('')}</ol>${day.night ? `<p class="night">${icon('moon', 16)} ${esc(L(day.night))}</p>` : ''}`;
      // options (first few, then "show all")
      const tray = trayIds(day, plan);
      if (q('#tray')) {
        const shown = showAll ? tray : tray.slice(0, OPT_LIMIT);
        q('#tray').innerHTML = locked ? `<li class="note">${tr('This day is locked by CaL.', '這天已被 CaL 鎖定。')}</li>` : shown.map((id) => optRow(id, day.info ? 0 : addedDrive(day, plan, id))).join('') || `<li class="note">${tr('No options left. Drag a stop here to free a slot.', '沒有備選。把停靠點拖到此處可釋出位置。')}</li>`;
        q('#moreopts').innerHTML = !locked && tray.length > OPT_LIMIT ? `<button class="btn" id="allopts">${showAll ? tr('Show fewer options', '顯示較少備選') : `${tr('Show all', '顯示全部')} ${tray.length} ${tr('options', '個備選')}`}</button>` : '';
      }
      // more spots nearby
      const assigned = allAssigned();
      const here = spots[day.end]?.c || spots[day.start]?.c;
      const others = Object.values(spots).filter((s) => !SKIP.has(s.t[0]) && !s.fixed && s.c && !assigned.has(s.id) && !tray.includes(s.id) && !plan.includes(s.id) && !s.id.endsWith('_alt') && !/\d$/.test(s.id) && s.l !== 'night')
        .map((s) => ({ s, d: here ? Math.hypot(s.c[0] - here[0], (s.c[1] - here[1]) * 0.4) : 0 })).sort((a, b) => a.d - b.d).slice(0, 14).map((x) => x.s);
      if (q('#more')) q('#more').innerHTML = day.info || locked ? '' : `<details class="more"><summary>${tr('More spots nearby', '附近更多景點')}</summary><ul class="list">${others.map((s) => `<li class="row opt" data-id="${s.id}" data-locked="0"><div class="rbody"><p class="rt">${esc(spotName(s))}</p><div class="rmeta">${typeChips(s.t)}<span class="pill">${icon('clock', 14)} ${dur(s.d || 15)}</span></div></div><button class="btn sm add" data-add="${s.id}">${icon('plus', 16)} ${tr('Add', '加入')}</button></li>`).join('')}</ul></details>`;
      // aurora
      if (day.aurora) {
        const row = (id, label) => { const s = spots[id]; const m = leg(day.end, id, spots, content.routes).m; return `<li class="row au" data-id="${id}" data-locked="1"><div class="rbody"><p class="rt">${esc(name(id))} <span class="pill g">${label}</span></p><div class="rmeta">${typeChips(s.t)}<span class="dr">${icon('car', 14)} ${dur(m)} ${tr('each way', '單程')}</span></div><div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p><div class="acts"><a class="btn sm" href="${gmaps(s)}" target="_blank" rel="noopener">${icon('map', 15)} Google</a><a class="btn sm" href="${amaps(s, name(id))}" target="_blank" rel="noopener">${icon('map', 15)} Apple</a></div></div></div></li>`; };
        const pool = day.aurora.pool.filter((id) => id !== day.aurora.main && id !== day.aurora.backup).slice(0, 4);
        q('#aurora').innerHTML = `<div class="card aur"><h2>${icon('aurora', 22)} ${tr('Aurora tonight', '今晚極光')}</h2>
          <p>${tr('At 17:00 look at the cloud forecast. Go only if a gap is coming.', '17:00 查看雲量預報。預計有空隙才出發。')}</p><a class="btn sm" href="https://www.yr.no/en" target="_blank" rel="noopener">${icon('ext', 15)} ${tr('Cloud forecast on Yr', '在 Yr 查看雲量')}</a>
          <ul class="list flat">${row(day.aurora.main, tr('Main', '主要'))}${row(day.aurora.backup, tr('Backup', '後備'))}</ul>
          <p class="mtxt">${tr('Other aurora spots:', '其他極光點：')}</p><div class="acts">${pool.map((id) => `<button class="chipbtn" data-focus="${id}">${esc(name(id))}</button>`).join('')}</div></div>`;
      } else q('#aurora').innerHTML = day.id === 'd8' || day.id === 'd0' ? `<div class="card aur"><p>${icon('aurora', 18)} ${day.id === 'd8' ? tr('No aurora tonight: it is your last night in Norway and tomorrow is a flight.', '今晚不安排極光：這是在挪威的最後一晚，明天要搭飛機。') : tr('No aurora tonight: you arrive near midnight.', '今晚不安排極光：你們接近午夜才抵達。')}</p></div>` : '';
      // history
      const mine = state.log.filter((e) => e.day === dayId).slice(0, 6);
      q('#history').innerHTML = mine.length ? `<div class="card hist"><h2>${tr('Changes', '修改紀錄')}</h2><ul>${mine.map((e) => { const add = e.after.filter((x) => !e.before.includes(x)).map(name); const rm = e.before.filter((x) => !e.after.includes(x)).map(name); const reorder = !add.length && !rm.length;
        return `<li class="${e.undone ? 'undone' : ''}"><span><b>${esc(personName(e.who))}</b> ${e.kind === 'reset' ? tr('reset the day', '重設了這天') : e.kind === 'undo' ? tr('undid a change', '還原了一項修改') : reorder ? tr('reordered stops', '調整了次序') : `${add.length ? tr('added ', '加入 ') + esc(add.join(', ')) : ''}${add.length && rm.length ? '; ' : ''}${rm.length ? tr('removed ', '移除 ') + esc(rm.join(', ')) : ''}`}<small>${new Date(e.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span>${!e.undone && e.kind !== 'undo' ? `<button class="btn sm" data-undo="${e.id}">${icon('undo', 14)} ${tr('Undo', '還原')}</button>` : ''}</li>`; }).join('')}</ul></div>` : '';
      const lk = q('#locklabel'); if (lk) lk.textContent = state.locks[dayId] ? tr('Unlock day', '解鎖這天') : tr('Lock day', '鎖定這天');
      // map
      if (map) map.render({ startId: day.start, endId: day.end, plan, tray, aurora: day.aurora?.pool || [], showOptions: lsGet('showopts', true), spots, routes: content.routes, name,
        popup: (id, kind) => { const s = spots[id]; const btn = kind === 'alt' ? `<button class="btn sm" data-map-act="add" data-id="${id}">${tr('Add to day', '加入當天')}</button>` : kind === 'plan' && !lockedRow(day, id) ? `<button class="btn sm" data-map-act="rm" data-id="${id}">${tr('Remove', '移除')}</button>` : '';
          return `<div class="pop"><b>${esc(name(id))}</b><div>${typeChips(s.t)}</div><p>${esc(spotNote(s)).slice(0, 110)}</p>${btn}</div>`; } });
      bindSort(locked);
    }

    function bindSort(locked) {
      sortables.forEach((s) => s.destroy()); sortables = [];
      if (day.info || locked) return;
      const cfg = { group: 'spots', draggable: '.row', animation: 160, delay: 220, delayOnTouchOnly: true, touchStartThreshold: 6, forceFallback: true, fallbackTolerance: 4, filter: '[data-locked="1"], .note, .leg, .stayrow, button, a', preventOnFilter: false, ghostClass: 'ghost', chosenClass: 'chosen', fallbackClass: 'dragclone', scroll: true, bubbleScroll: true,
        onChoose: (e) => { dragging = true; map?.highlight(e.item.dataset.id, true, true); },
        onUnchoose: (e) => { map?.highlight(e.item.dataset.id, false); },
        onEnd: () => { dragging = false; const ids = [...root.querySelectorAll('#plan .row')].map((r) => r.dataset.id); const cur = planOf(dayId); if (ids.join() !== cur.join()) setPlan(dayId, ids); else refresh(); } };
      sortables.push(Sortable.create(q('#plan'), cfg));
      if (q('#tray')) sortables.push(Sortable.create(q('#tray'), cfg));
    }

    root.addEventListener('click', (e) => {
      const t = e.target.closest('button, a, .row'); if (!t) return;
      if (t.matches('[data-add]')) return addSpot(t.dataset.add);
      if (t.matches('[data-rm]')) return removeSpot(t.dataset.rm);
      if (t.matches('[data-up]')) return move(t.dataset.up, -1);
      if (t.matches('[data-dn]')) return move(t.dataset.dn, 1);
      if (t.matches('[data-undo]')) { const en = state.log.find((x) => x.id === t.dataset.undo); if (en) undo(en); return; }
      if (t.matches('[data-focus]')) return map?.focus(t.dataset.focus);
      if (t.id === 'cal') return downloadDay(dayId);
      if (t.id === 'allopts') { showAll = !showAll; return refresh(); }
      if (t.id === 'maplock') return setMapLive(true);
      if (t.id === 'maplockbtn') return setMapLive(false);
      if (t.id === 'reset') {
        if (!t.dataset.armed) { t.dataset.armed = '1'; const keep = t.innerHTML; t.innerHTML = `${icon('warn', 17)} ${tr('Tap again to reset', '再點一次確認重設')}`; setTimeout(() => { t.innerHTML = keep; delete t.dataset.armed; }, 3000); return; }
        resetDay(dayId); toast(tr('Day reset to the original plan', '已還原為原本計劃')); return;
      }
      if (t.id === 'lock') return lockDay(dayId, !state.locks[dayId]);
      if (t.id === 'fit') return map?.fit();
      if (t.matches('.row') && !e.target.closest('a')) { const d = t.querySelector('.rdetail'); if (d) d.hidden = !d.hidden; map?.focus(t.dataset.id); }
    });
    root.addEventListener('mouseover', (e) => { const r = e.target.closest('.row'); if (r && r.dataset.id) map?.highlight(r.dataset.id, true); });
    root.addEventListener('mouseout', (e) => { const r = e.target.closest('.row'); if (r && r.dataset.id) map?.highlight(r.dataset.id, false); });
    const sw = q('#showopt'); if (sw) sw.addEventListener('change', () => { lsSet('showopts', sw.checked); map.fitted = false; refresh(); });
    bindTips(root);
    refresh();
    root.querySelector('.dchip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    return { refresh, destroy: () => { sortables.forEach((s) => s.destroy()); map?.destroy(); } };
  }
  return { html, mount };
}
