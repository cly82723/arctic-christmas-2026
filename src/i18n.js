// Language helpers. Interface text is written inline as tr('English', '中文'); content strings are [English, Chinese] pairs.
let lang = 'en';
try { lang = localStorage.getItem('lang') || (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'; } catch { /* private mode */ }
try { const saved = localStorage.getItem('lang'); if (saved) lang = saved; } catch { /* ignore */ }

export const getLang = () => lang;
export const setLang = (l) => { lang = l; try { localStorage.setItem('lang', l); } catch { /* ignore */ } document.documentElement.lang = l === 'zh' ? 'zh-HK' : 'en'; };
export const tr = (en, zh) => (lang === 'zh' && zh ? zh : en);
export const L = (pair) => (!pair ? '' : lang === 'zh' && pair[1] ? pair[1] : pair[0]);

// English never shows Chinese in brackets; Chinese shows "English (中文)" when a common translation exists.
const CJK_BRACKET = /\s*[（(][^）)]*[一-鿿][^）)]*[）)]/g;
export const stripCjk = (s) => (s || '').replace(CJK_BRACKET, '');
export const spotName = (s) => {
  const [en, zh] = s.n;
  if (s.stay && lang === 'zh') return '住宿：' + en.replace(/^Stay: /, '').replace(/ area/, ' 一帶');
  if (lang !== 'zh') return stripCjk(en);
  if (CJK_BRACKET.test(en)) { CJK_BRACKET.lastIndex = 0; return en; }
  CJK_BRACKET.lastIndex = 0;
  return zh ? `${en} (${zh})` : en;
};
export const spotNote = (s) => (lang === 'zh' ? s.i[1] || stripCjk(s.i[0]) : stripCjk(s.i[0]));
export const spotPark = (s) => (lang === 'zh' ? s.p[1] || s.p[0] : s.p[0]);
export const dayTitle = (d) => (lang === 'zh' ? d.title[1] : stripCjk(d.title[0]));

const fmtDate = (iso, opts) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-HK' : 'en-GB', { timeZone: 'UTC', ...opts }).format(new Date(iso + 'T00:00:00Z'));
export const dateLong = (iso) => fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
export const dateShort = (iso) => fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const dayNum = (iso) => fmtDate(iso, { day: 'numeric' });
export const monShort = (iso) => fmtDate(iso, { month: 'short' });
export const wkShort = (iso) => fmtDate(iso, { weekday: 'short' });
document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
