const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error('PID no valido.');
  if (process.platform === 'win32') {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToFileTimeUtc()`],
    { windowsHide: true, encoding: 'utf8', timeout: 10000 }).trim();
  }
  if (process.platform === 'linux') {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  }
  return execFileSync('ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8', timeout: 5000 }).trim();
}
function spawnDetached(command, args, options = {}, pidFile, logFile) {
  const pidPath = pidFile && path.resolve(pidFile);
  if (pidPath && fs.existsSync(pidPath)) throw new Error('Ya existe un fichero PID; detiene el servicio o revisa su estado.');
  const logPath = path.resolve(logFile || 'montana.log');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const output = fs.openSync(logPath, 'a');
  let child;
  try {
    child = spawn(command, args, { ...options, cwd: options.cwd || process.cwd(),
      detached: true, windowsHide: true, shell: false, stdio: ['ignore', output, output] });
  } finally { fs.closeSync(output); }
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('spawn', () => {
      try {
        const identity = processIdentity(child.pid);
        if (pidPath) {
          fs.mkdirSync(path.dirname(pidPath), { recursive: true });
          fs.writeFileSync(pidPath, JSON.stringify({ pid: child.pid, identity, command }, null, 2), { flag: 'wx' });
        }
        child.unref(); resolve(child.pid);
      } catch (error) { child.kill(); reject(error); }
    });
  });
}
function killByPidFile(pidFile) {
  if (!pidFile) throw new Error('Falta fichero PID.');
  const file = path.resolve(pidFile);
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!record || !Number.isSafeInteger(record.pid) || record.pid <= 1 || !record.identity) throw new Error('Fichero PID no verificable.');
  let current;
  try { process.kill(record.pid, 0); current = processIdentity(record.pid); }
  catch (error) {
    if (error.code !== 'ESRCH') throw error;
    fs.unlinkSync(file); return false;
  }
  if (String(current) !== String(record.identity)) throw new Error('El PID pertenece ahora a otro proceso; no se detiene.');
  process.kill(record.pid);
  fs.unlinkSync(file);
  return true;
}
module.exports = { spawnDetached, killByPidFile, processIdentity };
