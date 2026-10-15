const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../packages/stremio-addon');
const { createStaticServer } = require('../scripts/dev-server');

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
test('addon serves manifest, catalog, metadata and configured streams', async () => {
  const hash = 'a'.repeat(40), id = 'acestream:' + hash;
  const server = createServer({ engineUrl: 'http://127.0.0.1:6878', catalog: { metas: [{ id, name: 'Test', type: 'movie' }] } });
  const base = await listen(server);
  try {
    assert.equal((await (await fetch(base + '/manifest.json')).json()).id, 'org.montanatv.addon');
    assert.equal((await (await fetch(base + '/catalog/movie/montanatv.catalog.json')).json()).metas.length, 1);
    assert.equal((await (await fetch(base + `/meta/movie/${id}.json`)).json()).meta.name, 'Test');
    assert.equal((await (await fetch(base + `/stream/movie/${id}.json`)).json()).streams[0].url, `http://127.0.0.1:6878/ace/getstream?id=${hash}`);
    assert.deepEqual((await (await fetch(base + '/stream/movie/acestream:bad.json')).json()).streams, []);
    assert.equal((await fetch(base + '/unknown')).status, 404);
  } finally { await close(server); }
});
test('static server survives malformed paths and rejects escaping its root', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yavale-server-'));
  const root = path.join(temp, 'public'); await fs.mkdir(root);
  await fs.writeFile(path.join(root, 'index.html'), 'fixture');
  await fs.writeFile(path.join(temp, 'private.txt'), 'private');
  const server = createStaticServer(root), base = await listen(server);
  try {
    assert.equal(await (await fetch(base + '/')).text(), 'fixture');
    assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
    assert.equal((await fetch(base + '/..%2fprivate.txt')).status, 403);
    assert.equal((await fetch(base + '/%00')).status, 400);
    assert.equal((await fetch(base + '/missing')).status, 404);
    assert.equal((await fetch(base + '/', { method: 'HEAD' })).headers.get('content-length'), '7');
    assert.equal(await (await fetch(base + '/')).text(), 'fixture');
  } finally {
    await close(server);
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('yavale-server-'));
    await fs.rm(temp, { recursive: true, force: true });
  }
});
