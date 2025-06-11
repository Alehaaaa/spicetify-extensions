const fs = require('fs');
const path = require('path');
const { name } = require('../package.json');

const currentFilePath = __filename;

const pathParts = currentFilePath.split(path.sep);
const tagIndex = pathParts.indexOf('tags');

if (tagIndex === -1) {
  console.error('[error] "tags" folder not found in path:', currentFilePath);
  process.exit(1);
}

// Reconstruct path up to 'tags' (excluding)
const gitHub = path.join(...pathParts.slice(0, tagIndex));

const destDir = path.join(
  gitHub,
  'aleha-loader',
  'extensions'
);

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
