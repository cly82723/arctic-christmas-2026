// Calendar export (.ics): one day or the whole trip. Times are written in UTC from Oslo (UTC+1) or Doha (UTC+3) local time.
import { content, planOf, state } from './store.js';
import { computeDay, fmt } from './engine.js';
import { spotName, spotNote, getLang } from './i18n.js';

const pad = (n) => String(n).padStart(2, '0');
function utc(iso, min, offsetH) {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + (min - offsetH * 60) * 60000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function dayEvents(day) {
  const calc = computeDay(day, planOf(day.id), content);
  return calc.rows.map((r) => {
    const s = content.spots[r.id]; const off = s.area === 'doha' ? 3 : 1;
    const end = Math.max(r.depart, r.arrive + 15);
    const map = s.c ? ` https://www.google.com/maps/search/?api=1&query=${s.c[0]},${s.c[1]}` : '';
    return ['BEGIN:VEVENT', `UID:${day.id}-${r.id}@arctic-christmas-2026`, `DTSTAMP:${utc(day.date, 0, 0)}`, `DTSTART:${utc(day.date, r.arrive, off)}`, `DTEND:${utc(day.date, end, off)}`,
      `SUMMARY:${esc(spotName(s))}`, `DESCRIPTION:${esc(spotNote(s) + map)}`, s.c ? `LOCATION:${esc(spotName(s))}` : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(spotName(s))}`, 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n');
  });
}
function save(name, body) {
  const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Arctic Christmas 2026//EN\r\nCALSCALE:GREGORIAN\r\n${body}\r\nEND:VCALENDAR`], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const downloadDay = (dayId) => { const d = content.days.days.find((x) => x.id === dayId); save(`arctic-${d.date}.ics`, dayEvents(d).join('\r\n')); };
export const downloadTrip = () => save('arctic-christmas-2026.ics', content.days.days.flatMap(dayEvents).join('\r\n'));
void getLang; void state; void fmt;
