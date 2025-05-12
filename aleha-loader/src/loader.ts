/*  Loader – dynamic extension manager for Spicetify
 *  © 2025  MIT-0.  NO WARRANTY.
 *
 *  Author:  github.com/Alehaaaa
 */
/* eslint-disable no-eval */

import { SettingsSection } from 'spcr-settings';
import type { ChangeEvent } from 'react';

interface ExtensionMeta {
  name: string;
  raw: string;
}

/* ──────────────────────────────
   GitHub & Storage constants
──────────────────────────────── */
const GH_USER = 'Alehaaaa';
const GH_REPO = 'spicetify-extensions';
const GH_BRANCH = 'main';

const API_ROOT = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/extensions/aleha-loader`;
const RAW_ROOT = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/extensions/aleha-loader`;

const STORE_KEY = 'LoaderStates';

/* ──────────────────────────────
   Main entry (exported so we can
   call it from the real entry-point)
──────────────────────────────── */
export default async function Loader(): Promise<void> {
  /* 1️⃣  Wait for Spicetify helpers */
  while (!(window as any).Spicetify?.Platform?.History) {
    await new Promise(r => setTimeout(r, 300));
  }

  function slug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  /* 2️⃣  Read persisted states */
  const saved: Record<string, boolean> =
    JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');

  /* 3️⃣  Discover *.js files in the repo */
  const extensions: ExtensionMeta[] = await fetch(API_ROOT)
    .then(r => r.json())
    .then((arr: any[]) =>
      arr
        .filter(f => f.type === 'file' && f.name.endsWith('.js'))
        .map(f => ({
          name: f.name.replace(/\.js$/, ''),
          raw: `${RAW_ROOT}/${f.name}`,
        })),
    );

  /* 4️⃣  Build the Settings UI  */
  const section = new SettingsSection(`${GH_USER} Loader`, 'ale-loader-settings'); 

  extensions.forEach(ext => {
    const id = slug(ext.name);            // ONE canonical key

    section.addToggle(
      id,                                 // 1  id
      ` • ${ext.name}`,                           // 2  label / description
      saved[id] !== false,                // 3  defaultValue
      undefined,                          // 4  legacy onChange
      {
        onChange: (e: ChangeEvent<HTMLInputElement>) => {
          saved[id] = e.currentTarget.checked;   // ✅ store by *id*
        },
      },
    );
  });

  section.addButton(
    'save-and-reload',                    // id
    'Persist changes and reload Spotify', // description
    'Save & Reload',                      // button caption
    () => {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
      window.location.reload();           // hard reload ⇒ fresh context
    },
  );




  section.pushSettings();      // <- make it appear in Settings

  /* 5️⃣  Load only the toggled-on scripts */
  await Promise.all(
    extensions
      .filter(ext => saved[slug(ext.name)] !== false)   // ✅ check by *id*
      .map(ext =>
        fetch(ext.raw)
          .then(r => r.text())
          .then(code => {
            try {
              new Function(code)();
              console.log(`[Loader] loaded ${ext.name}`);
            } catch (e) {
              console.error(`[Loader] failed ${ext.name}`, e);
            }
          }),
      ),
  );

}
