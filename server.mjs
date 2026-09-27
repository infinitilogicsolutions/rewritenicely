import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm', '.gguf': 'application/octet-stream', '.json': 'application/json; charset=utf-8',
};
const CSP = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://*.hf.co https://*.huggingface.co https://*.xethub.hf.co; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function headers(type) {
  return {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Content-Security-Policy': CSP,
  };
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const baseHeaders = { ...headers(MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'), 'Accept-Ranges': 'bytes' };
    const range = req.headers.range ? parseRange(req.headers.range, stats.size) : undefined;
    if (req.headers.range && !range) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stats.size}` });
      res.end();
      return;
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? stats.size - 1;
    res.writeHead(range ? 206 : 200, {
      ...baseHeaders,
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${stats.size}` } : {}),
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return void res.end();
    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(ROOT, pathname.replace(/^[/\\]+/, ''));
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }
  serveFile(req, res, filePath);
});

server.listen(PORT, HOST, () => console.log(`RewriteNicely: http://${HOST}:${PORT}`));
server.on('error', (error) => { console.error(error); process.exitCode = 1; });
