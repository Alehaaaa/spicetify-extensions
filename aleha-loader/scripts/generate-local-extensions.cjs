const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const extensionsDir = path.join(rootDir, 'extensions');
const outputFile = path.join(rootDir, 'src', 'localExtensions.ts');
const enabled = process.argv.includes('--enabled');
const watch = process.argv.includes('--watch');
const pollIntervalMs = 750;

function stamp() {
  return new Date().toLocaleTimeString();
}

function log(message) {
  console.log(`[local-extensions ${stamp()}] ${message}`);
}

function readExtensionsSnapshot() {
  if (!fs.existsSync(extensionsDir)) {
    return '';
  }

  return fs
    .readdirSync(extensionsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => {
      const filePath = path.join(extensionsDir, entry.name);
      const stat = fs.statSync(filePath);
      return `${entry.name}:${stat.mtimeMs}:${stat.size}`;
    })
    .join('|');
}

function readLocalExtensions() {
  if (!enabled || !fs.existsSync(extensionsDir)) {
    return [];
  }

  return fs
    .readdirSync(extensionsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => {
      const name = entry.name.replace(/\.js$/, '');
      const filePath = path.join(extensionsDir, entry.name);
      return {
        name,
        code: fs.readFileSync(filePath, 'utf8'),
      };
    });
}

function writeManifest() {
  const extensions = readLocalExtensions();
  const contents = [
    'export interface LocalExtension {',
    '  name: string;',
    '  code: string;',
    '}',
    '',
    `export const LOCAL_EXTENSION_MODE = ${enabled ? 'true' : 'false'};`,
    '',
    `const localExtensions: LocalExtension[] = ${JSON.stringify(extensions, null, 2)};`,
    '',
    'export default localExtensions;',
    '',
  ].join('\n');

  if (fs.existsSync(outputFile) && fs.readFileSync(outputFile, 'utf8') === contents) {
    log(`manifest unchanged (${extensions.length} extension(s), local=${enabled})`);
    return;
  }

  fs.writeFileSync(outputFile, contents);
  log(`${enabled ? 'embedded' : 'disabled'} ${extensions.length} extension(s) into src/localExtensions.ts`);
}

writeManifest();

if (watch) {
  let timer;
  let snapshot = readExtensionsSnapshot();
  const scheduleWrite = () => {
    clearTimeout(timer);
    timer = setTimeout(writeManifest, 75);
  };

  log('watching aleha-loader/extensions');

  try {
    fs.watch(extensionsDir, { persistent: true }, () => {
      snapshot = readExtensionsSnapshot();
      log('native event in aleha-loader/extensions');
      scheduleWrite();
    });
  } catch (error) {
    console.warn(`[local-extensions ${stamp()}] native watch failed; polling fallback remains active: ${error.message}`);
  }

  setInterval(() => {
    const next = readExtensionsSnapshot();
    if (next === snapshot) {
      return;
    }

    snapshot = next;
    log('poll fallback detected extension change');
    scheduleWrite();
  }, pollIntervalMs);
}
