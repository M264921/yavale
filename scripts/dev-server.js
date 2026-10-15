#!/usr/bin/env node
const { createReadStream } = require('node:fs');
const { stat, realpath } = require('node:fs/promises');
const { createServer } = require('node:http');
const { extname, resolve, relative, isAbsolute } = require('node:path');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.m3u8': 'application/vnd.apple.mpegurl' };

function inside(root, file) {
  const rel = relative(root, file);
  return rel !== '..' && !rel.startsWith('..\\') && !rel.startsWith('../') && !isAbsolute(rel);
}
function createStaticServer(root = resolve(__dirname, '../packages/web-client/public')) {
  root = resolve(root);
  return createServer(async (request, response) => {
    function error(status) {
      response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(status === 404 ? 'No encontrado' : 'Solicitud no valida');
    }
    if (!['GET', 'HEAD'].includes(request.method)) return error(405);
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { return error(400); }
    if (pathname.includes('\0')) return error(400);
    let file = resolve(root, '.' + pathname);
    if (!inside(root, file)) return error(403);
    try {
      let info = await stat(file);
      if (info.isDirectory()) { file = resolve(file, 'index.html'); info = await stat(file); }
      const actualRoot = await realpath(root);
      const actualFile = await realpath(file);
      if (!inside(actualRoot, actualFile) || !info.isFile()) return error(403);
      response.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': info.size, 'cache-control': 'no-store' });
      if (request.method === 'HEAD') return response.end();
      const stream = createReadStream(actualFile);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (err) { error(['ENOENT', 'ENOTDIR'].includes(err.code) ? 404 : 500); }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 5173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Puerto no valido.');
  const server = createStaticServer();
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Servidor web: puerto ${server.address().port}`));
  server.on('error', err => { console.error(err.message); process.exitCode = 1; });
}
module.exports = { createStaticServer };
