import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = process.cwd() + '/dist';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };
http.createServer(async (req,res) => {
  try {
    const requestPath = (req.url || '/').split('?')[0];
    const raw = requestPath.startsWith('/FF14Reward/') ? requestPath.slice('/FF14Reward'.length) : requestPath;
    const rel = raw === '/' ? '/index.html' : raw;
    const file = normalize(join(root, rel));
    if (!file.startsWith(normalize(root))) throw new Error('bad path');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    const data = await readFile(join(root, 'index.html'));
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });
    res.end(data);
  }
}).listen(5173, '127.0.0.1', () => console.log('preview ready http://127.0.0.1:5173'));
