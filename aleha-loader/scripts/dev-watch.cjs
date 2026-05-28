const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(rootDir, '..');
const tagsDir = path.join(repoDir, 'tags');
const loaderExtensionsDir = path.join(rootDir, 'extensions');
const spicetifyCreatorBin = path.join(rootDir, 'node_modules', '.bin', 'spicetify-creator');

const pollIntervalMs = 750;
const heartbeatIntervalMs = 15000;
const watchedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.json']);
const ignoredDirs = new Set(['node_modules', 'dist']);
const children = [];

let tagsSnapshot = new Map();
let loaderExtensionsSnapshot = new Map();
let pipelineRunning = false;
let queuedPipelineReason = null;

function stamp() {
  return new Date().toLocaleTimeString();
}

function log(message) {
  console.log(`[dev-watch ${stamp()}] ${message}`);
}

function rel(filePath) {
  return path.relative(repoDir, filePath) || '.';
}

function shouldWatchFile(filePath) {
  return watchedExtensions.has(path.extname(filePath));
}

function walkFiles(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) {
    return files;
  }

  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    fs.readdirSync(entryPath, { withFileTypes: true }).forEach(entry => {
      if (ignoredDirs.has(entry.name)) {
        return;
      }
      walkFiles(path.join(entryPath, entry.name), files);
    });
  } else if (shouldWatchFile(entryPath)) {
    files.push(entryPath);
  }

  return files;
}

function readSnapshot(entryPath) {
  const snapshot = new Map();
  walkFiles(entryPath).forEach(filePath => {
    const stat = fs.statSync(filePath);
    snapshot.set(filePath, `${stat.mtimeMs}:${stat.size}`);
  });
  return snapshot;
}

function findSnapshotChanges(previous, next) {
  const changed = [];

  for (const [filePath, signature] of next) {
    if (previous.get(filePath) !== signature) {
      changed.push(filePath);
    }
  }

  for (const filePath of previous.keys()) {
    if (!next.has(filePath)) {
      changed.push(filePath);
    }
  }

  return changed;
}

function runStep(name, command, args, options) {
  log(`starting ${name}: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, options);

  if (result.error) {
    console.error(`[dev-watch ${stamp()}] ${name} failed: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status) {
    console.error(`[dev-watch ${stamp()}] ${name} exited with code ${result.status}`);
    process.exit(result.status);
  }

  log(`finished ${name}`);
}

function spawnManaged(name, command, args, options) {
  log(`starting ${name}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, options);
  children.push(child);

  child.on('error', error => {
    console.error(`[dev-watch ${stamp()}] ${name} failed: ${error.message}`);
    shutdown(1);
  });

  child.on('exit', code => {
    log(`${name} exited with code ${code ?? 0}`);
    if (code) {
      console.error(`[dev-watch ${stamp()}] ${name} exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
}

function refreshSnapshots() {
  tagsSnapshot = readSnapshot(tagsDir);
  loaderExtensionsSnapshot = readSnapshot(loaderExtensionsDir);
}

function runLocalPipeline(reason) {
  if (pipelineRunning) {
    queuedPipelineReason = reason;
    log(`pipeline already running; queued another run for ${reason}`);
    return;
  }

  pipelineRunning = true;
  log(`local pipeline start: ${reason}`);

  runStep('build tags and embed local extensions', process.execPath, ['scripts/build-local-tags.cjs'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  refreshSnapshots();
  pipelineRunning = false;
  log(`local pipeline done: ${reason}`);

  if (queuedPipelineReason) {
    const queuedReason = queuedPipelineReason;
    queuedPipelineReason = null;
    runLocalPipeline(`queued change after ${queuedReason}`);
  }
}

function regenerateLocalExtensions(reason) {
  if (pipelineRunning) {
    log(`ignored extension manifest regen during active pipeline: ${reason}`);
    return;
  }

  log(`local extension manifest refresh: ${reason}`);
  runStep('embed local extensions', process.execPath, ['scripts/generate-local-extensions.cjs', '--enabled'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  refreshSnapshots();
}

function pollChanges() {
  const nextTagsSnapshot = readSnapshot(tagsDir);
  const tagChanges = findSnapshotChanges(tagsSnapshot, nextTagsSnapshot);

  if (tagChanges.length) {
    tagsSnapshot = nextTagsSnapshot;
    const first = tagChanges.slice(0, 4).map(rel).join(', ');
    const suffix = tagChanges.length > 4 ? `, +${tagChanges.length - 4} more` : '';
    log(`tags/ changed: ${first}${suffix}`);
    runLocalPipeline(`tags change (${tagChanges.length} file(s))`);
    return;
  }

  const nextLoaderExtensionsSnapshot = readSnapshot(loaderExtensionsDir);
  const loaderExtensionChanges = findSnapshotChanges(loaderExtensionsSnapshot, nextLoaderExtensionsSnapshot);

  if (loaderExtensionChanges.length) {
    loaderExtensionsSnapshot = nextLoaderExtensionsSnapshot;
    const first = loaderExtensionChanges.slice(0, 4).map(rel).join(', ');
    const suffix = loaderExtensionChanges.length > 4 ? `, +${loaderExtensionChanges.length - 4} more` : '';
    log(`aleha-loader/extensions/ changed: ${first}${suffix}`);
    regenerateLocalExtensions(`extension change (${loaderExtensionChanges.length} file(s))`);
  }
}

function shutdown(codeOrSignal = 0) {
  children.forEach(child => {
    if (!child.killed) {
      child.kill(typeof codeOrSignal === 'string' ? codeOrSignal : undefined);
    }
  });

  if (typeof codeOrSignal === 'number') {
    process.exit(codeOrSignal);
  }
}

log(`repo: ${repoDir}`);
log('initial local pipeline');
runLocalPipeline('startup');

log('watching tags/ directly from dev-watch');
log('watching aleha-loader/extensions/ directly from dev-watch');
log('watching aleha-loader/src/ through spicetify-creator --watch');
log(`polling every ${pollIntervalMs}ms; heartbeat every ${heartbeatIntervalMs / 1000}s`);

spawnManaged(
  'aleha-loader builder',
  spicetifyCreatorBin,
  ['--watch'],
  {
    cwd: rootDir,
    stdio: 'inherit',
  },
);

spawnManaged(
  'spicetify live refresh',
  'spicetify',
  ['watch', '-le'],
  {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
  },
);

setInterval(pollChanges, pollIntervalMs);

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
