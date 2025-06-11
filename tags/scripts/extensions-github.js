// scripts/extensions-github.js
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { name } = require('../package.json');

let destDir = path.join(
  os.homedir(),
  'Documents',
  'Programming',
  'GitHub',
  'spicetify-extensions',
  'aleha-loader',
  'extensions'
);
if (!fs.existsSync(destDir)) {
  destDir = path.join(
  os.homedir(),
  'Documents',
  'GitHub',
  'spicetify-extensions',
  'aleha-loader',
  'extensions'
);
}

// ── Exit early if the folder is missing ────────────────────────────────
if (!fs.existsSync(destDir)) {
  console.error('[copy] destination not found:', destDir);
  process.exit(1);
}

// ----------------------------------------------------------------------
const srcJs  = path.join('dist', `${name}.js`);
const destJs = path.join(destDir, `${name}.js`);
fs.copyFileSync(srcJs, destJs);

const srcAssets = path.join('dist', 'assets');
if (fs.existsSync(srcAssets))
  fs.cpSync(srcAssets, path.join(destDir, 'assets'), { recursive: true });

console.log(`[copy] ${name} → ${destDir}`);
