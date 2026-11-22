// Line icons (24x24) for every kind of spot, plus UI icons. All inline SVG so they work offline and look the same on every phone.
const P = {
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M6.5 7h5v3h-5z"/>',
  charge: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
  food: '<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v5M17 21V3c-2 1-3.5 4-3.5 8H17"/>',
  shop: '<path d="M5 8h14l-1.2 12H6.2zM9 8V7a3 3 0 0 1 6 0v1"/>',
  view: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  photo: '<path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  park: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M10 17V8h3.2a2.5 2.5 0 0 1 0 5H10"/>',
  drone: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/><circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><circle cx="12" cy="12" r="1.4"/>',
  nodrone: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/><circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M3 3l18 18"/>',
  wc: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><text x="12" y="15.4" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">WC</text>',
  aurora: '<path d="M3 14c3-7 6-7 9 0s6 7 9 0M3 19.5c3-5 6-5 9 0s6 5 9 0"/><path d="M12 3v3M6 5l1.5 2.3M18 5l-1.5 2.3"/>',
  walk: '<circle cx="13.5" cy="4.5" r="1.8"/><path d="M9.5 21l1.8-6.5 3.2 2.5V21M11.3 14.5 10.5 9l3.5-1 2 3.5 3 1M8 12l2.5-3.5"/>',
  culture: '<path d="M3 10 12 4l9 6M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 20h18"/>',
  wild: '<circle cx="6.8" cy="10" r="1.8"/><circle cx="10.8" cy="6.2" r="1.8"/><circle cx="16.2" cy="6.8" r="1.8"/><circle cx="19.2" cy="11.5" r="1.8"/><path d="M8 17.5c0-3 2.2-5 4.2-5s4.8 2 4.8 5c0 2-2 3-4 2.5-1-.3-2-.3-3 0-1.7.6-2-.5-2-2.5z"/>',
  stay: '<path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  transit: '<path d="M2.5 14.5 11 11.5V5.5a1.5 1.5 0 0 1 3 0v6l7.5 3v2L14 14v4.5l2 1.5v1.5l-3.5-1L9 21.5V20l2-1.5V14L2.5 16.5z"/>',
  fixed: '<rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  warn: '<path d="M12 3.5 2.5 20h19zM12 10v4.5M12 17v.6"/>',
  car: '<path d="M3.5 16.5v-4l2-5h13l2 5v4M3.5 16.5h17M6.5 19.5v-3M17.5 19.5v-3"/><circle cx="8" cy="13.2" r="1"/><circle cx="16" cy="13.2" r="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  undo: '<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
  bag: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  nav: '<path d="M12 3 5 20l7-4 7 4z"/>',
  up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>', left: '<path d="M14 6l-6 6 6 6"/>', right: '<path d="M10 6l6 6-6 6"/>',
  eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1 1-1.1 1.8M12 17v.5"/>'
};
export const icon = (name, size = 20, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;

// Spot type meta: label [en, zh], colour token used for map markers and chips.
export const TYPES = {
  fuel: { l: ['Fuel', '加油'], c: '#c26a1b' }, charge: { l: ['EV charger', '電動車充電'], c: '#1b8f6a' },
  food: { l: ['Food', '餐飲'], c: '#c2493a' }, shop: { l: ['Groceries', '買日用品'], c: '#8a6bb8' },
  view: { l: ['Viewpoint', '觀景點'], c: '#3b72c4' }, photo: { l: ['Photo spot', '攝影點'], c: '#2f86a6' },
  park: { l: ['Parking', '停車'], c: '#5b6b78' }, drone: { l: ['Drone OK', '可飛無人機'], c: '#6a5acd' },
  nodrone: { l: ['No drones', '禁飛無人機'], c: '#b33a3a' }, wc: { l: ['Toilets', '洗手間'], c: '#5b6b78' },
  aurora: { l: ['Aurora spot', '極光點'], c: '#1b8f6a' }, walk: { l: ['Walk', '步行'], c: '#6b8e4e' },
  culture: { l: ['Museum or church', '博物館或教堂'], c: '#9a6b3f' }, wild: { l: ['Animals', '動物'], c: '#a0622d' },
  stay: { l: ['Where you sleep', '住宿'], c: '#33475b' }, transit: { l: ['Airport or train', '機場或火車'], c: '#33475b' },
  fixed: { l: ['Booked, locked', '已預訂（鎖定）'], c: '#33475b' }
};
// Which icon leads a spot on the map: the most informative one.
const PRIMARY = ['stay', 'transit', 'fixed', 'aurora', 'view', 'photo', 'wild', 'culture', 'food', 'charge', 'fuel', 'shop', 'walk', 'park', 'wc'];
export const primaryType = (types = []) => PRIMARY.find((p) => types.includes(p)) || types[0] || 'photo';
export const typeIcons = (types = [], max = 4) => types.filter((t) => t !== 'fixed').slice(0, max);
