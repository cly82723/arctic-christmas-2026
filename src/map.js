// Interactive day map. Shows the road route between planned stops, every planned stop as a numbered pin,
// every option as a faded pin, and aurora spots in green. Options light up on hover, tap or press-and-hold.
import L from 'leaflet';
import { icon, TYPES, primaryType } from './icons.js';
import { decodePoly } from './engine.js';

const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export class DayMap {
  constructor(el, hooks) {
    this.hooks = hooks; this.pins = new Map(); this.hl = null;
    // Starts locked so a thumb swipe scrolls the page; the Tap-to-move button unlocks panning and pinch zoom.
    this.map = L.map(el, { zoomControl: false, attributionControl: true, tap: true, scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer(TILE, { maxZoom: 17, attribution: '© OpenStreetMap', crossOrigin: true }).addTo(this.map);
    this.lines = L.layerGroup().addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.map.on('popupopen', (e) => {
      e.popup.getElement()?.querySelectorAll('[data-map-act]').forEach((b) => b.addEventListener('click', () => { this.map.closePopup(); hooks.act(b.dataset.mapAct, b.dataset.id); }));
    });
    this.timer = setTimeout(() => { if (!this.dead) this.map.invalidateSize(); }, 50);
  }

  pinIcon(kind, spot, n) {
    const t = primaryType(spot.t); const c = (TYPES[t] || TYPES.photo).c;
    if (kind === 'plan') return L.divIcon({ className: 'mkwrap', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="mk plan" style="--c:${c}"><b>${n}</b></div>` });
    if (kind === 'stay') return L.divIcon({ className: 'mkwrap', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="mk stay">${icon('stay', 18)}</div>` });
    if (kind === 'aurora') return L.divIcon({ className: 'mkwrap', iconSize: [30, 30], iconAnchor: [15, 15], html: `<div class="mk au">${icon('aurora', 17)}</div>` });
    return L.divIcon({ className: 'mkwrap', iconSize: [28, 28], iconAnchor: [14, 14], html: `<div class="mk alt" style="--c:${c}">${icon(t, 15)}</div>` });
  }

  // data: { startId, endId, plan:[ids], tray:[ids], aurora:[ids], showOptions, spots, routes, name(id), popup(id, kind) }
  render(data) {
    if (this.dead) return;
    this.data = data; this.lines.clearLayers(); this.layer.clearLayers(); this.pins.clear();
    const { spots, routes } = data; const pts = [];
    const put = (id, kind, n) => {
      const s = spots[id]; if (!s?.c) return;
      const m = L.marker(s.c, { icon: this.pinIcon(kind, s, n), keyboard: false, zIndexOffset: kind === 'plan' ? 500 : kind === 'stay' ? 400 : kind === 'aurora' ? 300 : 0 });
      m.bindTooltip(data.name(id), { direction: 'top', offset: [0, -14], className: 'mktip' });
      m.bindPopup(() => data.popup(id, kind), { closeButton: true, maxWidth: 240 });
      m.on('mouseover', () => this.hooks.hover?.(id, true)); m.on('mouseout', () => this.hooks.hover?.(id, false));
      m.addTo(this.layer); this.pins.set(id + ':' + kind, m); if (!this.pins.has(id)) this.pins.set(id, m);
      return s.c;
    };
    const seq = [data.startId, ...data.plan, data.endId].filter(Boolean);
    for (let i = 0; i < seq.length - 1; i++) this.line(seq[i], seq[i + 1], spots, routes, '#3b72c4', false);
    if (data.showOptions) {
      for (const id of data.aurora || []) { if (!data.plan.includes(id) && id !== data.startId) { const c = put(id, 'aurora'); c && pts.push(c); } }
      for (const id of data.tray || []) { const c = put(id, 'alt'); c && pts.push(c); }
    } else {
      for (const id of data.aurora?.slice(0, 2) || []) { const c = put(id, 'aurora'); c && pts.push(c); }
    }
    if (data.endId && data.aurora?.length) for (const id of data.aurora.slice(0, 2)) this.line(data.endId, id, spots, routes, '#1b8f6a', true);
    const stays = new Set([data.startId, data.endId].filter(Boolean));
    stays.forEach((id) => { const c = put(id, 'stay'); c && pts.push(c); });
    data.plan.forEach((id, i) => { const c = put(id, 'plan', i + 1); c && pts.push(c); });
    if (pts.length && !this.fitted) { this.map.fitBounds(L.latLngBounds(pts).pad(0.18), { maxZoom: 11 }); this.fitted = true; }
    this.map.invalidateSize();
  }

  line(a, b, spots, routes, color, dashed) {
    const leg = routes.legs[`${a}|${b}`]; const A = spots[a]?.c, B = spots[b]?.c; if (!A || !B) return;
    if (leg) L.polyline(decodePoly(leg.poly), { color, weight: 4, opacity: 0.85, dashArray: dashed ? '2 8' : null, lineCap: 'round' }).addTo(this.lines);
    else L.polyline([A, B], { color, weight: 3, opacity: 0.7, dashArray: '4 8' }).addTo(this.lines);
  }

  setInteractive(on) { for (const h of ['dragging', 'touchZoom', 'doubleClickZoom']) this.map[h][on ? 'enable' : 'disable'](); }
  fit() { const pts = []; this.pins.forEach((m, k) => { if (k.includes(':')) pts.push(m.getLatLng()); }); if (pts.length) this.map.fitBounds(L.latLngBounds(pts).pad(0.18), { maxZoom: 11 }); }

  // Light up a pin (hover, tap or press-and-hold on a list item) and show its name.
  highlight(id, on, pan = false) {
    const m = this.pins.get(id); if (this.hl && this.hl !== m) { this.hl.getElement()?.classList.remove('hl'); this.hl.closeTooltip(); }
    if (!m) return; const el = m.getElement();
    if (on) { el?.classList.add('hl'); m.openTooltip(); m.setZIndexOffset(1000); this.hl = m; if (pan) this.map.panTo(m.getLatLng(), { animate: true }); }
    else { el?.classList.remove('hl'); m.closeTooltip(); m.setZIndexOffset(0); if (this.hl === m) this.hl = null; }
  }
  focus(id) { const m = this.pins.get(id); if (!m) return; this.map.flyTo(m.getLatLng(), Math.max(this.map.getZoom(), 10), { duration: 0.6 }); this.highlight(id, true); }
  destroy() { this.dead = true; clearTimeout(this.timer); this.map.remove(); }
}
