const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(rootDir, '..');
const watchedEntries = [
  path.join(repoDir, 'tags'),
];
const watchedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.json']);
const pollIntervalMs = 750;

let pending = false;
let building = false;
let debounceTimer;
let snapshot = new Map();

function stamp() {
  return new Date().toLocaleTimeString();
}

function log(message) {
  console.log(`[local-tags-watch ${stamp()}] ${message}`);
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
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        return;
      }
      walkFiles(path.join(entryPath, entry.name), files);
    });
  } else if (shouldWatchFile(entryPath)) {
    files.push(entryPath);
  }

  return files;
}

function readSnapshot() {
  const next = new Map();
  watchedEntries.forEach(entry => {
    walkFiles(entry).forEach(filePath => {
      const stat = fs.statSync(filePath);
      next.set(filePath, `${stat.mtimeMs}:${stat.size}`);
    });
  });
  return next;
}

function snapshotChanged(next) {
  if (next.size !== snapshot.size) {
    return true;
  }

  for (const [filePath, signature] of next) {
    if (snapshot.get(filePath) !== signature) {
      return true;
    }
  }

  return false;
}

function scheduleBuild(reason) {
  log(`change detected: ${reason}`);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => buildTags(reason), 100);
}

function buildTags(reason) {
  if (building) {
    log(`build already running; queued another build (${reason})`);
    pending = true;
    return;
  }

  building = true;
  log(`starting build for ${reason}`);
  const child = spawn(process.execPath, ['scripts/build-local-tags.cjs'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  child.on('error', error => {
    building = false;
    console.error(`[local-tags-watch ${stamp()}] failed to start build: ${error.message}`);
  });

  child.on('exit', code => {
    building = false;
    log(`build finished with code ${code ?? 0}`);

    if (code) {
      console.error(`[local-tags-watch ${stamp()}] build exited with code ${code}`);
    }

    if (pending) {
      pending = false;
      buildTags('queued change');
    }
  });
}

snapshot = readSnapshot();
log(`watching tags/ (${snapshot.size} file(s), ignoring dist and node_modules)`);

watchedEntries.forEach(entryPath => {
  if (!fs.existsSync(entryPath)) {
    console.warn(`[local-tags-watch ${stamp()}] watch path does not exist: ${path.relative(repoDir, entryPath)}`);
    return;
  }

  const isDirectory = fs.statSync(entryPath).isDirectory();
  try {
    fs.watch(entryPath, { persistent: true, recursive: isDirectory }, (_event, filename) => {
      const changedPath = isDirectory && filename ? path.join(entryPath, filename.toString()) : entryPath;
      if (fs.existsSync(changedPath) && fs.statSync(changedPath).isDirectory()) {
        return;
      }
      if (!shouldWatchFile(changedPath)) {
        return;
      }

      snapshot = readSnapshot();
      scheduleBuild(`native event ${path.relative(repoDir, changedPath)}`);
    });
    log(`native watcher attached: ${path.relative(repoDir, entryPath)}`);
  } catch (error) {
    console.warn(`[local-tags-watch ${stamp()}] native watch failed for ${path.relative(repoDir, entryPath)}; polling fallback remains active`, error.message);
  }
});

setInterval(() => {
  const next = readSnapshot();
  if (!snapshotChanged(next)) {
    return;
  }

  snapshot = next;
  scheduleBuild('poll fallback');
}, pollIntervalMs);
