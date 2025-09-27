#!/usr/bin/env node
const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, join, resolve } = require('node:path');

const PORT = Number(process.env.PORT || 5173);
const ROOT = resolve('clients/web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.m3u8': 'application/vnd.apple.mpegurl'
};

function send(res, status, headers, stream) {
  res.writeHead(status, headers);
  if (stream) {
    stream.pipe(res);
  } else {
    res.end();
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let filePath = join(ROOT, decodeURIComponent(url.pathname));

  if (!existsSync(filePath)) {
    return send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, null);
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    filePath = join(filePath, 'index.html');
    if (!existsSync(filePath)) {
      return send(res, 403, { 'content-type': 'text/plain; charset=utf-8' }, null);
    }
  }

  const mime = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const stream = createReadStream(filePath);
  send(res, 200, { 'content-type': mime, 'cache-control': 'no-store' }, stream);
});

server.listen(PORT, () => {
  console.log(`Servidor estático listo en http://localhost:${PORT}`);
});
