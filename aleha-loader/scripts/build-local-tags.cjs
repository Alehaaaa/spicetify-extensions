const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(rootDir, '..');
const tagsDir = path.join(repoDir, 'tags');
const builtTagsFile = path.join(tagsDir, 'dist', 'tags.js');
const loaderTagsFile = path.join(rootDir, 'extensions', 'tags.js');

function stamp() {
  return new Date().toLocaleTimeString();
}

function log(message) {
  console.log(`[local-tags ${stamp()}] ${message}`);
}

function runStep(name, command, args, options) {
  log(`starting ${name}`);
  const result = spawnSync(command, args, options);

  if (result.error) {
    console.error(`[local-tags ${stamp()}] failed to run ${name}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status) {
    console.error(`[local-tags ${stamp()}] ${name} exited with code ${result.status}`);
    process.exit(result.status);
  }

  log(`finished ${name}`);
}

log('pipeline start');
runStep('tags build', 'npm', ['run', 'build-local'], {
  cwd: tagsDir,
  shell: true,
  stdio: 'inherit',
});

if (!fs.existsSync(builtTagsFile)) {
  console.error(`[local-tags ${stamp()}] build did not create ${builtTagsFile}`);
  process.exit(1);
}

let copied = false;
if (
  fs.existsSync(loaderTagsFile) &&
  fs.readFileSync(builtTagsFile, 'utf8') === fs.readFileSync(loaderTagsFile, 'utf8')
) {
  log('tags.js unchanged in aleha-loader/extensions');
} else {
  fs.copyFileSync(builtTagsFile, loaderTagsFile);
  copied = true;
  log(`copied ${path.relative(repoDir, builtTagsFile)} -> ${path.relative(repoDir, loaderTagsFile)}`);
}

runStep('local extension manifest generation', process.execPath, ['scripts/generate-local-extensions.cjs', '--enabled'], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (copied) {
  log('tags extension embedded for local loader');
}

log('pipeline done');
