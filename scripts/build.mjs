// Bundles the app into public/ (what Firebase Hosting serves) and draws the home-screen icons.
import { build } from 'esbuild';
import { copyFileSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

mkdirSync('public', { recursive: true });
await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, sourcemap: true, outfile: 'public/app.js',
  format: 'esm', target: ['safari15'], loader: { '.png': 'dataurl', '.svg': 'dataurl' }, logLevel: 'info'
});
await build({ entryPoints: ['src/styles.css'], bundle: true, minify: true, outfile: 'public/app.css', logLevel: 'info' });
copyFileSync('index.html', 'public/index.html');

// ---- icons: dark night sky with an aurora ribbon, drawn pixel by pixel and written as PNG ----
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let r = 12 + 14 * v, g = 24 + 22 * v, b = 40 + 36 * v; // night sky
      const band = Math.sin(u * 6.2 + 0.6) * 0.07 + 0.52 - u * 0.12; // aurora ribbon centre
      const d = Math.abs(v - band);
      const glow = Math.max(0, 1 - d / 0.17) ** 2;
      r += 40 * glow; g += 190 * glow; b += 120 * glow;
      if ((x * 7919 + y * 104729) % 997 < 2 && v < 0.4) { r += 120; g += 120; b += 120; } // a few stars
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = Math.min(255, r); raw[i + 1] = Math.min(255, g); raw[i + 2] = Math.min(255, b); raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) writeFileSync(`public/${name}`, png(size));
const leaflet = readFileSync('node_modules/leaflet/dist/leaflet.css');
writeFileSync('public/leaflet.css', leaflet);
console.log('built public/');
