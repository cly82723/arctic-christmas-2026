// Data layer. Two backends with the same API:
//  - Firestore (when src/firebase-config.js has a config and the device has the invite code): live sync, offline cache.
//  - Local demo (otherwise): content from the dev server, state saved in localStorage on this device only.
import { FIREBASE } from './firebase-config.js';

const listeners = new Set();
export const content = { ready: false };
export const state = { plan: {}, locks: {}, todos: {}, custom: [], claims: {}, people: {}, log: [], rev: 0 };
export const net = { mode: 'demo', online: navigator.onLine, synced: true, error: '' };
let backend = null;
const emit = () => listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
export const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f); };
addEventListener('online', () => { net.online = true; emit(); });
addEventListener('offline', () => { net.online = false; emit(); });

const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };
export const me = { get id() { return ls.get('who', null); }, set(id) { ls.set('who', id); emit(); } };

export function getCode() {
  const m = /[#&]k=([A-Za-z0-9_-]{24,})/.exec(location.hash);
  if (m) { ls.set('code', m[1]); history.replaceState(null, '', location.pathname + location.search + '#/'); }
  return ls.get('code', null);
}
export const needsInvite = () => !!FIREBASE && !getCode();

const defaultPlan = () => Object.fromEntries(content.days.days.map((d) => [d.id, [...d.plan]]));
export const planOf = (dayId) => state.plan[dayId] || content.days.days.find((d) => d.id === dayId)?.plan || [];
export const dayOf = (id) => content.days.days.find((d) => d.id === id);
export const isFoxBooked = () => !!state.todos.fox?.done;
export const isLocked = (dayId, spotId) => !!state.locks[dayId] || !!content.spots[spotId]?.fixed && !(content.spots[spotId]?.lockedBy && !state.todos[content.spots[spotId].lockedBy]?.done);

// ---------- demo backend ----------
async function startDemo() {
  const c = await (await fetch('/__content.json')).json();
  Object.assign(content, { spots: c.spots, days: c.days, routes: c.routes, guides: c.guides, ready: true });
  const saved = ls.get('demo-state', null);
  if (saved) Object.assign(state, saved);
  net.mode = 'demo';
  backend = {
    save: () => ls.set('demo-state', { plan: state.plan, locks: state.locks, todos: state.todos, custom: state.custom, claims: state.claims, people: state.people, log: state.log, rev: state.rev }),
    patch: (kind) => { backend.save(); emit(); return kind; }
  };
  emit();
}

// ---------- Firestore backend ----------
async function startFirestore(code) {
  const [{ initializeApp }, fs] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, onSnapshot, setDoc, collection, addDoc, query, orderBy, limit, updateDoc } = fs;
  const db = initializeFirestore(initializeApp(FIREBASE), { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  const base = (...p) => doc(db, 'trips', code, ...p);
  net.mode = 'live';
  const out = {};
  for (const name of ['spots', 'days', 'routes', 'guides']) {
    const snap = await getDoc(base('content', name));
    if (!snap.exists()) throw new Error('Trip content not found. Check the invite link.');
    out[name] = JSON.parse(snap.data().json);
  }
  Object.assign(content, { spots: out.spots, days: out.days, routes: out.routes, guides: out.guides, ready: true });
  const track = (snap) => { net.synced = !snap.metadata.hasPendingWrites; };
  onSnapshot(base('state', 'plan'), (s) => { track(s); const d = s.data() || {}; state.plan = d.days || {}; state.locks = d.locks || {}; emit(); });
  onSnapshot(base('state', 'todos'), (s) => { track(s); const d = s.data() || {}; state.todos = d.items || {}; state.custom = d.custom || []; emit(); });
  onSnapshot(base('state', 'claims'), (s) => { track(s); state.claims = (s.data() || {}).items || {}; emit(); });
  for (const t of content.days.travellers) onSnapshot(base('state', 'p_' + t.id), (s) => { track(s); state.people[t.id] = s.data() || {}; emit(); });
  onSnapshot(query(collection(db, 'trips', code, 'log'), orderBy('at', 'desc'), limit(60)), (s) => { state.log = s.docs.map((d) => ({ id: d.id, ...d.data() })); emit(); });
  backend = {
    plan: (dayId, ids) => setDoc(base('state', 'plan'), { days: { [dayId]: ids } }, { merge: true }),
    lock: (dayId, v) => setDoc(base('state', 'plan'), { locks: { [dayId]: v } }, { merge: true }),
    todo: (id, v) => setDoc(base('state', 'todos'), { items: { [id]: v } }, { merge: true }),
    custom: (list) => setDoc(base('state', 'todos'), { custom: list }, { merge: true }),
    claim: (id, v) => setDoc(base('state', 'claims'), { items: { [id]: v } }, { merge: true }),
    person: (pid, patch) => setDoc(base('state', 'p_' + pid), patch, { merge: true }),
    log: (e) => addDoc(collection(db, 'trips', code, 'log'), e),
    markUndone: (id) => updateDoc(doc(db, 'trips', code, 'log', id), { undone: true })
  };
  emit();
}

export async function init() {
  try {
    if (FIREBASE && getCode()) await startFirestore(getCode());
    else if (!FIREBASE) await startDemo();
  } catch (e) { net.error = String(e.message || e); console.error(e); }
  emit();
}

// ---------- actions (same for both backends) ----------
const who = () => me.id || 'guest';
const logEntry = (dayId, before, after, kind) => ({ at: Date.now(), who: who(), day: dayId, before, after, kind: kind || 'swap' });
async function persist(fn, localFn) { if (net.mode === 'live') { try { await fn(); } catch (e) { net.error = String(e.message || e); } } else { localFn(); backend.save(); } emit(); }

export const setPlan = (dayId, ids, kind) => {
  const before = [...planOf(dayId)];
  state.plan[dayId] = ids; state.rev++; emit();
  const e = logEntry(dayId, before, ids, kind);
  return persist(async () => { await backend.plan(dayId, ids); await backend.log(e); }, () => { state.log.unshift({ id: 'l' + e.at, ...e }); });
};
export const undo = (entry) => {
  state.plan[entry.day] = entry.before; entry.undone = true; emit();
  return persist(async () => { await backend.plan(entry.day, entry.before); await backend.log(logEntry(entry.day, entry.after, entry.before, 'undo')); await backend.markUndone(entry.id); }, () => { state.log.unshift({ id: 'l' + Date.now(), ...logEntry(entry.day, entry.after, entry.before, 'undo') }); });
};
export const resetDay = (dayId) => setPlan(dayId, [...dayOf(dayId).plan], 'reset');
export const lockDay = (dayId, v) => { state.locks[dayId] = v; return persist(() => backend.lock(dayId, v), () => {}); };
export const toggleTodo = (id) => { const cur = state.todos[id] || {}; const v = { ...cur, done: !cur.done, by: who() }; state.todos[id] = v; return persist(() => backend.todo(id, v), () => {}); };
export const setTodoOwner = (id, owner) => { const v = { ...(state.todos[id] || {}), owner }; state.todos[id] = v; return persist(() => backend.todo(id, v), () => {}); };
export const addCustomTodo = (text) => { state.custom = [...state.custom, { id: 'c' + Date.now(), t: text, by: who() }]; return persist(() => backend.custom(state.custom), () => {}); };
export const claimItem = (id, pid) => { state.claims[id] = pid; return persist(() => backend.claim(id, pid), () => {}); };
export const person = (pid) => state.people[pid] || (state.people[pid] = {});
export const toggleTick = (pid, kind, id, val) => {
  const p = person(pid); const bucket = { ...(p[kind] || {}) };
  if (bucket[id] === val || (val === true && bucket[id])) delete bucket[id]; else bucket[id] = val;
  p[kind] = bucket;
  return persist(() => backend.person(pid, { [kind]: bucket }), () => {});
};
