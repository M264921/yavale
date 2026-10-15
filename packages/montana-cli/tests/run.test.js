const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnDetached, killByPidFile } = require('../lib/run');

test('a started fixture process can be stopped through its verified PID file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'montana-test-'));
  const state = path.join(dir, 'pid.json');
  let pid;
  try {
    pid = await spawnDetached(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {}, state, path.join(dir, 'out.log'));
    assert.equal(JSON.parse(fs.readFileSync(state)).pid, pid);
    assert.equal(killByPidFile(state), true);
    assert.equal(fs.existsSync(state), false);
  } finally {
    if (pid) { try { process.kill(pid); } catch {} }
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('start failures do not create PID files and invalid PIDs cannot kill processes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'montana-test-'));
  const pid = path.join(dir, 'state.json'), log = path.join(dir, 'out.log');
  try {
    await assert.rejects(spawnDetached(path.join(dir, 'does-not-exist'), [], {}, pid, log));
    assert.equal(fs.existsSync(pid), false);
    fs.writeFileSync(pid, JSON.stringify({ pid: -1, identity: 'bad' }));
    assert.throws(() => killByPidFile(pid), /no verificable/);
  } finally { assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir())); fs.rmSync(dir, { recursive: true, force: true }); }
});
test('a stale identity cannot terminate a reused PID', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'montana-test-'));
  const file = path.join(dir, 'state.json');
  try {
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid, identity: 'different' }));
    assert.throws(() => killByPidFile(file), /otro proceso/);
    assert.equal(fs.existsSync(file), true);
  } finally { assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir())); fs.rmSync(dir, { recursive: true, force: true }); }
});
