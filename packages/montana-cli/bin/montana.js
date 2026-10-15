#!/usr/bin/env node
const path = require('node:path');
require('dotenv').config({ path: process.env.MONTANA_ENV_FILE || path.resolve(__dirname, '../.env') });
const { program } = require('commander');
const { spawnDetached, killByPidFile } = require('../lib/run');
const { spawn } = require('node:child_process');

program.name('montana').description('Servicios locales Montana / YaVale');
function launch(command, args, cwd, opts) {
  return spawnDetached(command, args, { cwd }, opts.pid, opts.log).then(pid => console.log(`Servicio iniciado: ${pid}`));
}
function runOnce(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`El comando termino con codigo ${code}`)));
  });
}
program.command('addon:start')
  .option('--dir <path>', 'Carpeta del addon', process.env.ADDON_DIR || path.resolve(__dirname, '../../stremio-addon'))
  .option('--entry <file>', 'Ejecutable JS', process.env.ADDON_ENTRY || 'index.js')
  .option('--pid <file>', 'Estado del proceso', process.env.ADDON_PID || '.montana-run/addon.pid.json')
  .option('--log <file>', 'Registro', process.env.ADDON_LOG || '.montana-run/addon.log')
  .action(opts => launch(process.execPath, [path.resolve(opts.dir, opts.entry)], path.resolve(opts.dir), opts));
program.command('addon:stop').option('--pid <file>', 'Estado del proceso', process.env.ADDON_PID || '.montana-run/addon.pid.json')
  .action(opts => console.log(killByPidFile(opts.pid) ? 'Servicio detenido.' : 'El proceso ya estaba detenido.'));
program.command('acestream:start').option('--engine <path>', 'Motor AceStream', process.env.ACESTREAM_BIN)
  .option('--args <args...>', 'Argumentos').option('--pid <file>', 'Estado', process.env.ACESTREAM_PID || '.montana-run/acestream.pid.json')
  .option('--log <file>', 'Registro', process.env.ACESTREAM_LOG || '.montana-run/acestream.log')
  .action(opts => { if (!opts.engine) throw new Error('Falta --engine o ACESTREAM_BIN.'); return launch(path.resolve(opts.engine), opts.args || [], path.dirname(path.resolve(opts.engine)), opts); });
program.command('acestream:stop').option('--pid <file>', 'Estado', process.env.ACESTREAM_PID || '.montana-run/acestream.pid.json')
  .action(opts => console.log(killByPidFile(opts.pid) ? 'Motor detenido.' : 'El proceso ya estaba detenido.'));
for (const up of [true, false]) {
  program.command(up ? 'wg:up' : 'wg:down').option('--conf <file>', 'Configuracion WireGuard', process.env.WG_CONF)
    .option('--log <file>', 'Registro', process.env.WG_LOG || '.montana-run/wireguard.log')
    .action(opts => {
      if (!opts.conf) throw new Error('Falta --conf o WG_CONF.');
      const conf = path.resolve(opts.conf);
      if (process.platform === 'win32') {
        // Ejecutar la consola como administrador. No interpolar rutas en PowerShell.
        return runOnce('wireguard.exe', [up ? '/installtunnelservice' : '/uninstalltunnelservice', up ? conf : path.basename(conf, '.conf')]);
      }
      return runOnce('wg-quick', [up ? 'up' : 'down', conf]);
    });
}
program.parseAsync().catch(error => { console.error(`[montana] ${error.message}`); process.exitCode = 1; });
