/* eslint-disable no-eval */

import { SettingsSection } from './customSettings/settingsSection';
import type { ChangeEvent } from 'react';
import localExtensions, { LOCAL_EXTENSION_MODE } from './localExtensions';

interface ExtensionMeta {
  name: string;
  raw?: string;
  code?: string;
}

const GH_USER = 'Alehaaaa';
const GH_REPO = 'spicetify-extensions';
const GH_BRANCH = 'main';

const EXTENSION = 'aleha-loader';

const API_ROOT = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${EXTENSION}/extensions`;
const RAW_ROOT = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/${EXTENSION}/extensions`;

const STORE_KEY = 'LoaderStates';
const SOURCE_KEY = 'LoaderUseLocalSource';
const CACHE_KEY = 'LoaderCachedExtensions';
const CACHE_TIME_KEY = 'LoaderCachedExtensionsFetchedAt';

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function readSavedStates(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.warn('[Loader] ignored invalid saved extension states', e);
    return {};
  }
}

function readSourcePreference(): boolean {
  const saved = localStorage.getItem(SOURCE_KEY);

  if (saved === null) {
    return LOCAL_EXTENSION_MODE;
  }

  return saved === 'true';
}

function writeSourcePreference(useLocalSource: boolean) {
  localStorage.setItem(SOURCE_KEY, String(useLocalSource));
}

function readCachedExtensions(): ExtensionMeta[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]');

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      ext => typeof ext?.name === 'string' && typeof ext?.code === 'string',
    );
  } catch (e) {
    console.warn('[Loader] ignored invalid cached extensions', e);
    return [];
  }
}

function writeCachedExtensions(extensions: ExtensionMeta[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(extensions));
  localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
}

function formatLastFetched() {
  const fetchedAt = localStorage.getItem(CACHE_TIME_KEY);

  if (!fetchedAt) {
    return 'never';
  }

  const date = new Date(fetchedAt);

  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  return date.toLocaleString();
}

async function discoverRemoteExtensions(): Promise<ExtensionMeta[]> {
  const response = await fetch(API_ROOT);

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const entries = await response.json();

  if (!Array.isArray(entries)) {
    throw new Error('GitHub API returned an unexpected payload');
  }

  return entries
    .filter(f => f.type === 'file' && f.name.endsWith('.js'))
    .map(f => ({
      name: f.name.replace(/\.js$/, ''),
      raw: `${RAW_ROOT}/${f.name}`,
    }));
}

async function discoverOnlineExtensions(): Promise<ExtensionMeta[]> {
  const extensions = await Promise.all(
    (await discoverRemoteExtensions()).map(async ext => ({
      name: ext.name,
      code: await getExtensionCode(ext),
    })),
  );

  writeCachedExtensions(extensions);
  return extensions;
}

async function discoverLocalOrCachedExtensions(): Promise<ExtensionMeta[]> {
  if (localExtensions.length) {
    return localExtensions;
  }

  const cachedExtensions = readCachedExtensions();

  if (cachedExtensions.length) {
    return cachedExtensions;
  }

  console.warn('[Loader] no bundled or cached extensions found; fetching online extensions');
  return discoverOnlineExtensions();
}

async function discoverExtensions(useLocalSource: boolean): Promise<ExtensionMeta[]> {
  if (useLocalSource) {
    return discoverLocalOrCachedExtensions();
  }

  return discoverOnlineExtensions();
}

async function getExtensionCode(ext: ExtensionMeta): Promise<string> {
  if (ext.code !== undefined) {
    return ext.code;
  }

  if (!ext.raw) {
    throw new Error(`Extension ${ext.name} has no code source`);
  }

  const response = await fetch(ext.raw);

  if (!response.ok) {
    throw new Error(`Fetch returned ${response.status}`);
  }

  return response.text();
}

export default async function Loader(): Promise<void> {
  while (!(window as any).Spicetify?.Platform?.History) {
    await new Promise(r => setTimeout(r, 300));
  }

  const saved = readSavedStates();
  let useLocalSource = readSourcePreference();
  let extensions: ExtensionMeta[] = [];

  try {
    extensions = await discoverExtensions(useLocalSource);
  } catch (e) {
    console.error('[Loader] failed to discover extensions', e);
    return;
  }

  console.log(
    `[Loader] using ${useLocalSource ? 'local/cached' : 'online'} extension source (${extensions.length} extension(s))`,
  );

  const section = new SettingsSection(`${GH_USER} Loader`, 'ale-loader-settings'); 

  section.addToggle(
    'use-local-source',
    'Use local/cached extensions',
    useLocalSource,
    undefined,
    {
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        useLocalSource = e.currentTarget.checked;
        writeSourcePreference(useLocalSource);
      },
    },
  );

  section.addButton(
    'refetch-online',
    `Refetch online extensions (last fetched: ${formatLastFetched()})`,
    'Refetch',
    async () => {
      try {
        await discoverOnlineExtensions();
        Spicetify.showNotification?.('[Loader] Refetched online extensions. Reloading...');
        window.location.reload();
      } catch (e) {
        console.error('[Loader] failed to refetch online extensions', e);
        Spicetify.showNotification?.('[Loader] Failed to refetch online extensions', true);
      }
    },
  );

  extensions.forEach(ext => {
    const id = slug(ext.name);

    section.addToggle(
      id,
      ` - ${ext.name}`,
      saved[id] !== false,
      undefined,
      {
        onChange: (e: ChangeEvent<HTMLInputElement>) => {
          saved[id] = e.currentTarget.checked;
        },
      },
    );
  });

  section.addButton(
    'save-and-reload',
    'Persist changes and reload Spotify',
    'Save & Reload',
    () => {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
      window.location.reload();
    },
  );

  section.pushSettings();

  await Promise.all(
    extensions
      .filter(ext => saved[slug(ext.name)] !== false)
      .map(async ext => {
        try {
          const code = await getExtensionCode(ext);
          new Function(code)();
          console.log(`[Loader] loaded ${ext.name}`);
        } catch (e) {
          console.error(`[Loader] failed ${ext.name}`, e);
        }
      }),
  );

}
