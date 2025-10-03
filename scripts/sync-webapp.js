#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const webPublicDir = path.join(projectRoot, 'packages', 'web-client', 'public');
const docsDir = path.join(projectRoot, 'docs');
const iosBundleDir = path.join(projectRoot, 'packages', 'ios-app', 'WebBundle');

const DEFAULT_ITEMS = [
  '.nojekyll',
  'index.html',
  'playlist.json',
  'apple-app-site-association',
  '.well-known',
  'assets',
  'data'
];

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function syncTarget(targetDir, items) {
  ensureDirectory(targetDir);
  for (const item of items) {
    const sourcePath = path.join(webPublicDir, item);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    const destPath = path.join(targetDir, item);
    removeIfExists(destPath);
    copyRecursive(sourcePath, destPath);
  }
}

function syncWebApp(options = {}) {
  const items = options.items || DEFAULT_ITEMS;
  if (!fs.existsSync(webPublicDir)) {
    throw new Error(`Directorio base inexistente: ${webPublicDir}`);
  }

  syncTarget(docsDir, items);
  syncTarget(iosBundleDir, items);

  if (!options.silent) {
    console.log('[sync-webapp] Copiado a docs/ y packages/ios-app/WebBundle');
  }
}

if (require.main === module) {
  try {
    syncWebApp();
  } catch (error) {
    console.error('[sync-webapp] Error:', error.message);
    process.exitCode = 1;
  }
}

module.exports = { syncWebApp };
