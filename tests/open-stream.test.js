const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStreamUrl } = require('../packages/web-client/public/assets/open-stream');
test('manual playback preserves only a valid hash and configured engine', () => {
  const hash = 'A'.repeat(40);
  assert.equal(buildStreamUrl(`acestream://${hash}`, 'http://localhost:6878'), `http://localhost:6878/ace/getstream?id=${hash.toLowerCase()}`);
  for (const value of ['', 'bad', hash + '&token=x', 'https://elsewhere/']) assert.throws(() => buildStreamUrl(value, 'http://localhost'));
  for (const engine of ['javascript:alert(1)', 'ftp://host', 'http://user:password@host']) assert.throws(() => buildStreamUrl(hash, engine));
});
