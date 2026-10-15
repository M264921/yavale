const http = require('node:http');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const defaultCatalog = require('./catalog.json');

function createAddon(options = {}) {
  const catalog = options.catalog || defaultCatalog;
  const base = options.engineUrl || process.env.ACESTREAM_BASE_URL || 'http://toninomontana.ddns.net:6878';
  const engine = new URL(base);
  if (!['http:', 'https:'].includes(engine.protocol)) throw new Error('ACESTREAM_BASE_URL debe usar HTTP o HTTPS.');
  const streamPath = options.streamPath || process.env.ACESTREAM_STREAM_PATH || '/ace/getstream?id=';
  const manifest = {
    id: 'org.montanatv.addon', version: '1.2.0', name: 'MontanaTV',
    description: 'Catalogo AceStream de YaVale', resources: ['catalog', 'stream', 'meta'],
    types: ['movie'], catalogs: [{ type: 'movie', id: 'montanatv.catalog', name: 'MontanaTV IPTV' }],
    idPrefixes: ['acestream:']
  };
  const metas = Array.isArray(catalog.metas) ? catalog.metas : [];
  const builder = new addonBuilder(manifest);
  builder.defineCatalogHandler(({ type, id }) => Promise.resolve({
    metas: type === 'movie' && id === 'montanatv.catalog' ? metas : []
  }));
  builder.defineMetaHandler(({ type, id }) => Promise.resolve({
    meta: type === 'movie' ? metas.find(item => item.id === id) || null : null
  }));
  builder.defineStreamHandler(({ type, id }) => {
    const match = typeof id === 'string' && /^acestream:([a-f0-9]{40})$/i.exec(id);
    if (type !== 'movie' || !match) return Promise.resolve({ streams: [] });
    const url = new URL(streamPath + match[1].toLowerCase(), engine.href.endsWith('/') ? engine : engine.href + '/');
    if (url.origin !== engine.origin) throw new Error('El endpoint debe pertenecer al motor configurado.');
    return Promise.resolve({ streams: [{ title: 'Ver en MontanaTV', url: url.href }] });
  });
  return builder.getInterface();
}

function createServer(options = {}) {
  const router = getRouter(createAddon(options));
  return http.createServer((request, response) => router(request, response, () => {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }));
}

function startServer(options = {}) {
  const port = options.port ?? Number(process.env.PORT || 7000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Puerto no valido.');
  const host = options.host || process.env.HOST || '0.0.0.0';
  const server = createServer(options);
  server.listen(port, host);
  return server;
}

if (require.main === module) {
  const server = startServer();
  server.on('listening', () => console.log(`MontanaTV: puerto ${server.address().port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createAddon, createServer, startServer };
