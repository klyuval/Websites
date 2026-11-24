// Local preview server for the mirrored sites: each site gets its own port, so absolute paths and client routers work
// exactly as they do on <site>.ydesign.workers.dev.
//   node tools/serve.mjs            -> prints the port of every site (4101, 4102, ... in alphabetical order)
//   node tools/serve.mjs negia      -> only that site
// Requests resolve to the file, then <path>/index.html, then <path>.html; page navigations fall back to the site's
// index.html (the Cloudflare single-page-app fallback). With FILL=1, a missing asset is fetched from the live site once
// and saved into the mirror.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../sites');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif', '.gif':'image/gif',
  '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf', '.mp4':'video/mp4', '.webm':'video/webm', '.glb':'model/gltf-binary',
  '.txt':'text/plain', '.xml':'application/xml', '.webmanifest':'application/manifest+json', '.ico':'image/x-icon', '.wasm':'application/wasm', '.mp3':'audio/mpeg' };
const all = fs.readdirSync(root).filter(s => fs.existsSync(path.join(root, s, 'index.html'))).sort();
const only = process.argv.slice(2);
all.forEach((site, i) => {
  if (only.length && !only.includes(site)) return;
  const dir = path.join(root, site), port = 4101 + i;
  http.createServer(async (req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    const cands = [path.join(dir, rel), path.join(dir, rel, 'index.html'), path.join(dir, rel.replace(/\/$/, '') + '.html')];
    let file = cands.find(f => f.startsWith(dir) && fs.existsSync(f) && fs.statSync(f).isFile());
    const ext = path.extname(rel);
    if (!file && process.env.FILL && ext && ext !== '.html') {
      try {
        const r = await fetch(`https://${site}.ydesign.workers.dev/${rel}`);
        if (r.ok && !(r.headers.get('content-type') || '').includes('text/html')) {
          const out = path.join(dir, rel); fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); file = out; console.log('FILLED', site, rel);
        }
      } catch (e) { console.log('FILL ERR', site, rel, e.message); }
    }
    if (!file && !ext) file = path.join(dir, 'index.html');
    if (!file) { console.log('404', site, rel); res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`${site.padEnd(22)} http://localhost:${port}/`));
});
