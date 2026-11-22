// One page per day: map first, then a read-first summary, the timed day, drag-and-drop options, aurora and history.
import Sortable from 'sortablejs';
import { content, state, planOf, dayOf, setPlan, undo, resetDay, lockDay, me } from './store.js';
import { computeDay, fmt, dur, toMin, leg } from './engine.js';
import { icon, TYPES } from './icons.js';
import { tr, L, spotName, spotNote, spotPark, dayTitle, dateLong, dayNum, wkShort, monShort } from './i18n.js';
import { esc, typeChips, gmaps, amaps, tip, bindTips, lsGet, lsSet } from './ui.js';
import { DayMap } from './map.js';
import { downloadDay } from './ics.js';

const SKIP = new Set(['stay', 'transit']);
const allAssigned = () => new Set(content.days.days.flatMap((d) => planOf(d.id)));
const isAdmin = () => me.id === 'cal';
const personName = (id) => { const t = content.days.travellers.find((x) => x.id === id); return t ? L(t.name) : tr('Someone', '有人'); };
const lightText = (day) => { const l = content.days.light[day.light]; return l ? (l.label ? L(l.label) : `${l.first}–${l.last}`) : ''; };

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

function planRow(day, r, locked) {
  const s = content.spots[r.id];
  const warn = r.dark ? `<span class="warn">${icon('warn', 14)} ${tr('Starts after last light', '天光過後才開始')}</span>` : r.late ? `<span class="warn">${icon('warn', 14)} ${tr('Later than the booked time', '遲過預訂時間')}</span>` : '';
  const drive = r.drive.walk ? tr('Walk, about 15 min', '步行約 15 分鐘') : r.drive.m ? `${icon('car', 14)} ${dur(r.drive.m)}${r.drive.exact ? '' : '*'}` : '';
  return `<li class="row ${locked ? 'locked' : ''}" data-id="${r.id}" data-locked="${locked ? 1 : 0}">
    <span class="grip">${locked ? icon('fixed', 18) : icon('grip', 18)}</span>
    <div class="rtime"><b>${fmt(r.arrive)}</b>${s.d ? `<small>${dur(s.d)}</small>` : ''}</div>
    <div class="rbody"><h4>${esc(spotName(s))}</h4>
      <div class="rmeta">${typeChips(s.t)}<span class="dr">${drive}</span>${warn}</div>
      <div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p>
        <div class="acts">${s.c ? `<a class="btn sm" href="${gmaps(s)}" target="_blank" rel="noopener">${icon('map', 15)} Google</a><a class="btn sm" href="${amaps(s, spotName(s))}" target="_blank" rel="noopener">${icon('map', 15)} Apple</a>` : ''}
        ${locked ? '' : `<button class="btn sm" data-up="${r.id}">${icon('up', 15)}</button><button class="btn sm" data-dn="${r.id}">${icon('down', 15)}</button><button class="btn sm danger" data-rm="${r.id}">${icon('x', 15)} ${tr('Remove', '移除')}</button>`}</div></div>
    </div></li>`;
}
function optRow(day, plan, id, drive) {
  const s = content.spots[id];
  const light = s.l === 'day' ? tr('Needs daylight', '需要日光') : s.l === 'night' ? tr('Best after dark', '天黑後最佳') : tr('Any time', '任何時間');
  return `<li class="row opt" data-id="${id}" data-locked="0">
    <span class="grip">${icon('grip', 18)}</span>
    <div class="rbody"><h4>${esc(spotName(s))}</h4>
      <div class="rmeta">${typeChips(s.t)}<span class="pill">${icon('clock', 13)} ${tr('Suggested', '建議')} ${dur(s.d || 15)}</span><span class="pill">${s.l === 'day' ? icon('sun', 13) : icon('moon', 13)} ${light}</span>${drive ? `<span class="dr">${icon('car', 13)} +${dur(drive)}</span>` : ''}</div>
      <div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p></div></div>
    <button class="btn sm add" data-add="${id}">${icon('plus', 15)} ${tr('Add', '加入')}</button></li>`;
}

export function dayPage(dayId) {
  const day = dayOf(dayId);
  const idx = content.days.days.findIndex((d) => d.id === dayId);
  const prev = content.days.days[idx - 1], next = content.days.days[idx + 1];
  const chips = content.days.days.map((d, i) => `<a class="dchip ${d.id === dayId ? 'on' : ''}" href="#/day/${d.id}"><b>${dayNum(d.date)}</b><small>${monShort(d.date)}</small></a>`).join('');
  const html = `<section class="day-page">
    <nav class="daystrip" aria-label="${tr('Days', '日子')}">${chips}</nav>
    <header class="dayhead"><div class="date"><b>${dayNum(day.date)}</b><span>${monShort(day.date)} · ${wkShort(day.date)}</span></div>
      <div><div class="eyebrow">${tr('Day', '第')} ${idx} ${tr('', '天')}</div><h1>${esc(dayTitle(day))}</h1></div></header>
    ${day.nomap ? '' : `<div class="mapcard"><div id="map" role="application" aria-label="${tr('Map of the day', '當天地圖')}"></div>
      <div class="maptools"><label class="sw"><input type="checkbox" id="showopt" ${lsGet('showopts', true) ? 'checked' : ''}><span></span>${tr('Show options on map', '地圖顯示備選')}</label><button class="btn sm" id="fit">${icon('map', 15)} ${tr('Fit all', '顯示全部')}</button></div>
      <div class="mapkey"><span><i class="k plan"></i>${tr('Your day', '你的一天')}</span><span><i class="k alt"></i>${tr('Options', '備選')}</span><span><i class="k au"></i>${tr('Aurora', '極光')}</span><span><i class="k line"></i>${tr('Road route', '行車路線')}</span></div></div>`}
    <div class="card readfirst"><h2>${tr('Read this first', '先讀這個')}</h2><ul>${day.sum.map((l) => `<li>${esc(L(l))}</li>`).join('')}</ul></div>
    <div id="daybar"></div>
    ${day.info ? '' : tip('swap', tr('Swap spots by dragging', '拖放更換景點'), tr('Press and hold a spot, then drag it between <b>Your day</b> and <b>Options</b>. Press and hold an option to see it on the map. Or just tap <b>Add</b>.', '按住景點片刻，然後在<b>你的一天</b>與<b>備選</b>之間拖動。按住備選可在地圖上查看。也可以直接點<b>加入</b>。'))}
    <h2 class="sec">${tr('Your day', '你的一天')}</h2>
    <div id="planwrap"></div>
    ${day.alts.length || !day.info ? `<h2 class="sec">${tr('Options', '備選')} <small>${tr('suggested time · extra driving', '建議時間 · 額外車程')}</small></h2><ul id="tray" class="list tray"></ul><div id="more"></div>` : ''}
    <div id="aurora"></div>
    <div class="actions"><button class="btn" id="cal">${icon('cal', 17)} ${tr('Add to calendar', '加入日曆')}</button>
      ${day.info ? '' : `<button class="btn" id="reset">${icon('undo', 17)} ${tr('Reset day', '重設這天')}</button>`}
      ${isAdmin() && !day.info ? `<button class="btn" id="lock">${icon('fixed', 17)} <span id="locklabel"></span></button>` : ''}</div>
    <div id="history"></div>
    <nav class="pager">${prev ? `<a href="#/day/${prev.id}">${icon('left', 18)} ${esc(dayTitle(prev))}</a>` : '<span></span>'}${next ? `<a href="#/day/${next.id}">${esc(dayTitle(next))} ${icon('right', 18)}</a>` : '<span></span>'}</nav>
  </section>`;

  function mount(root) {
    let map = null; let sortables = []; let dragging = false;
    const q = (s) => root.querySelector(s);
    const name = (id) => spotName(content.spots[id]);
    const spots = content.spots;

    if (!day.nomap) {
      map = new DayMap(q('#map'), {
        hover: (id, on) => root.querySelectorAll(`.row[data-id="${id}"]`).forEach((r) => r.classList.toggle('hl', on)),
        act: (a, id) => { if (a === 'add') addSpot(id); else if (a === 'rm') removeSpot(id); else if (a === 'zoom') map.focus(id); }
      });
    }

    function addSpot(id) {
      const cur = planOf(dayId);
      if (cur.includes(id)) return;
      content.days.days.forEach((d) => { if (d.id !== dayId && planOf(d.id).includes(id)) setPlan(d.id, planOf(d.id).filter((x) => x !== id), 'move'); });
      setPlan(dayId, [...cur, id]);
    }
    function removeSpot(id) { setPlan(dayId, planOf(dayId).filter((x) => x !== id)); }
    function move(id, dir) { const a = [...planOf(dayId)]; const i = a.indexOf(id); const j = i + dir; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setPlan(dayId, a); }

    function refresh() {
      if (dragging) return;
      const plan = planOf(dayId); const locked = !!state.locks[dayId];
      const calc = computeDay(day, plan, content);
      // day bar
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
        <p class="mtxt">${icon('car', 15)} ${tr('Driving', '車程')} <b>${dur(calc.driveTotal)}</b> ${tr('of 5 h', '，上限 5 小時')}${calc.home ? ` · ${tr('home about', '約')} <b>${fmt(calc.home.arrive)}</b>${tr('', ' 回到住處')}` : ''}</p>
        ${w.length ? `<ul class="warns">${w.join('')}</ul>` : ''}</div>`;
      // plan list
      const start = day.info ? '' : `<div class="endrow">${icon('stay', 17)} <span>${tr('Leave', '出發：')} ${esc(name(day.start))}${day.depart ? ` ${tr('at', '於')} <b>${day.depart}</b>` : ''}</span></div>`;
      const end = day.info || !calc.home ? '' : `<div class="endrow">${icon('stay', 17)} <span>${tr('Sleep:', '住宿：')} ${esc(name(day.end))}</span></div>`;
      q('#planwrap').innerHTML = `${start}<ul id="plan" class="list">${calc.rows.map((r) => planRow(day, r, day.info || lockedRow(day, r.id))).join('')}</ul>${end}${day.night ? `<p class="night">${icon('moon', 15)} ${esc(L(day.night))}</p>` : ''}`;
      // options
      const tray = trayIds(day, plan);
      if (q('#tray')) q('#tray').innerHTML = locked ? `<li class="note">${tr('This day is locked by CaL.', '這天已被 CaL 鎖定。')}</li>` : tray.map((id) => optRow(day, plan, id, day.info ? 0 : addedDrive(day, plan, id))).join('') || `<li class="note">${tr('No options left. Drag something here to free a slot.', '沒有備選。把行程拖到此處可釋出位置。')}</li>`;
      // more spots
      const assigned = allAssigned();
      const here = spots[day.end]?.c || spots[day.start]?.c;
      const others = Object.values(spots).filter((s) => !SKIP.has(s.t[0]) && !s.fixed && s.c && !assigned.has(s.id) && !tray.includes(s.id) && !plan.includes(s.id) && !s.id.endsWith('_alt') && !/\d$/.test(s.id) && s.l !== 'night')
        .map((s) => ({ s, d: here ? Math.hypot(s.c[0] - here[0], (s.c[1] - here[1]) * 0.4) : 0 })).sort((a, b) => a.d - b.d).slice(0, 14).map((x) => x.s);
      if (q('#more')) q('#more').innerHTML = day.info || locked ? '' : `<details class="more"><summary>${tr('More spots nearby', '附近更多景點')}</summary><ul class="list tray2">${others.map((s) => `<li class="row opt" data-id="${s.id}" data-locked="0"><div class="rbody"><h4>${esc(spotName(s))}</h4><div class="rmeta">${typeChips(s.t)}<span class="pill">${icon('clock', 13)} ${dur(s.d || 15)}</span></div></div><button class="btn sm add" data-add="${s.id}">${icon('plus', 15)} ${tr('Add', '加入')}</button></li>`).join('')}</ul></details>`;
      // aurora
      if (day.aurora) {
        const row = (id, label) => { const s = spots[id]; const m = leg(day.end, id, spots, content.routes).m; return `<li class="row au" data-id="${id}" data-locked="1"><div class="rbody"><h4>${esc(name(id))} <span class="pill g">${label}</span></h4><div class="rmeta">${typeChips(s.t)}<span class="dr">${icon('car', 13)} ${dur(m)} ${tr('each way', '單程')}</span></div><div class="rdetail" hidden><p>${esc(spotNote(s))}</p><p class="park">${icon('park', 15)} ${esc(spotPark(s))}</p><div class="acts"><a class="btn sm" href="${gmaps(s)}" target="_blank" rel="noopener">${icon('map', 15)} Google</a><a class="btn sm" href="${amaps(s, name(id))}" target="_blank" rel="noopener">${icon('map', 15)} Apple</a></div></div></div></li>`; };
        q('#aurora').innerHTML = `<div class="card aur"><h2>${icon('aurora', 22)} ${tr('Aurora tonight', '今晚極光')}</h2>
          <p>${tr('At 17:00 look at the cloud forecast. Go only if a gap is coming.', '17:00 查看雲量預報。預計有空隙才出發。')} <a href="https://www.yr.no/en" target="_blank" rel="noopener">Yr ${icon('ext', 13)}</a></p>
          <ul class="list">${row(day.aurora.main, tr('Main', '主要'))}${row(day.aurora.backup, tr('Backup', '後備'))}</ul>
          <p class="mtxt">${tr('Other aurora spots on the map:', '地圖上其他極光點：')} ${day.aurora.pool.filter((id) => id !== day.aurora.main && id !== day.aurora.backup).map((id) => `<button class="chipbtn" data-focus="${id}">${esc(name(id))}</button>`).join(' ')}</p></div>`;
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
      const cfg = { group: 'spots', animation: 160, delay: 220, delayOnTouchOnly: true, touchStartThreshold: 6, forceFallback: true, fallbackTolerance: 4, filter: '[data-locked="1"], .note, button, a', preventOnFilter: false, ghostClass: 'ghost', chosenClass: 'chosen', fallbackClass: 'dragclone', scroll: true, bubbleScroll: true,
        onChoose: (e) => { dragging = true; map?.highlight(e.item.dataset.id, true, true); },
        onUnchoose: (e) => { map?.highlight(e.item.dataset.id, false); },
        onEnd: () => { dragging = false; const ids = [...root.querySelectorAll('#plan .row')].map((r) => r.dataset.id); const cur = planOf(dayId); if (ids.join() !== cur.join()) setPlan(dayId, ids); else refresh(); } };
      sortables.push(Sortable.create(q('#plan'), { ...cfg, onAdd: () => {} }));
      if (q('#tray')) sortables.push(Sortable.create(q('#tray'), cfg));
    }

    root.addEventListener('click', (e) => {
      const t = e.target.closest('button, a, .row'); if (!t) return;
      const g = (a) => t.closest(`[${a}]`)?.getAttribute(a);
      if (t.matches('[data-add]')) return addSpot(t.dataset.add);
      if (t.matches('[data-rm]')) return removeSpot(t.dataset.rm);
      if (t.matches('[data-up]')) return move(t.dataset.up, -1);
      if (t.matches('[data-dn]')) return move(t.dataset.dn, 1);
      if (t.matches('[data-undo]')) { const en = state.log.find((x) => x.id === t.dataset.undo); if (en) undo(en); return; }
      if (t.matches('[data-focus]')) return map?.focus(t.dataset.focus);
      if (t.id === 'cal') return downloadDay(dayId);
      if (t.id === 'reset') return resetDay(dayId);
      if (t.id === 'lock') return lockDay(dayId, !state.locks[dayId]);
      if (t.id === 'fit') return map?.fit();
      if (t.matches('.row') && !e.target.closest('a')) { const d = t.querySelector('.rdetail'); if (d) d.hidden = !d.hidden; map?.focus(t.dataset.id); void g; }
    });
    root.addEventListener('mouseover', (e) => { const r = e.target.closest('.row'); if (r && r.dataset.id) map?.highlight(r.dataset.id, true); });
    root.addEventListener('mouseout', (e) => { const r = e.target.closest('.row'); if (r && r.dataset.id) map?.highlight(r.dataset.id, false); });
    const sw = q('#showopt'); if (sw) sw.addEventListener('change', () => { lsSet('showopts', sw.checked); map.fitted = false; refresh(); });
    bindTips(root);
    refresh();
    return { refresh, destroy: () => { sortables.forEach((s) => s.destroy()); map?.destroy(); } };
  }
  return { html, mount };
}
