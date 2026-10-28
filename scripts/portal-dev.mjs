// Local server for the collection portal: serves public/ and runs the api/ handlers like Vercel does.
// Usage: MONGODB_URI=... JWT_SECRET=... node scripts/portal-dev.mjs   → http://localhost:3000/login.html
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import dns from 'node:dns';

// Some home routers can't answer the SRV lookup that mongodb+srv:// needs; use public DNS locally.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PUBLIC = join(import.meta.dirname, '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    const route = url.pathname.slice(5).replace(/[^a-z]/g, '');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.body = raw ? JSON.parse(raw) : {};
    req.query = Object.fromEntries(url.searchParams);
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    try {
      const { default: handler } = await import(`../api/${route}.js`);
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(err.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500).json({ error: 'Server error.' });
    }
    return;
  }

  const file = normalize(join(PUBLIC, url.pathname === '/' ? 'pickup.html' : url.pathname));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(3000, () => console.log('Portal on http://localhost:3000/login.html'));
