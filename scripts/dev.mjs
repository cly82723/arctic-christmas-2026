// Local preview server. Serves public/ and, for demo mode only, the private content at /__content.json.
// Nothing here is deployed. Run: npm run build && npm run dev   then open http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { buildContent } from './seed.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.map': 'application/json', '.svg': 'image/svg+xml' };
const root = join(process.cwd(), 'public');
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__photos') {
    try { const html = await readFile(join(process.cwd(), '.dev', 'photos-review.html')); res.writeHead(200, { 'content-type': TYPES['.html'] }); return res.end(html); } catch { res.writeHead(404); return res.end('Run node scripts/photos.mjs first'); }
  }
  if (url.pathname === '/__content.json') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(buildContent()));
  }
  let p = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' || p === '\\') p = '/index.html';
  try {
    const data = await readFile(join(root, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    const data = await readFile(join(root, 'index.html'));
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    res.end(data);
  }
}).listen(5173, () => console.log('http://localhost:5173'));
