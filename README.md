# Spicetify Extensions

This repo contains the `aleha-loader` Spicetify extension plus locally bundled extensions used during development.

## Online Loader

Build and install the loader so Spotify discovers extensions from GitHub:

```sh
npm run build:online
spicetify apply
```

## Local Loader

Build and install the loader with every `.js` file from `aleha-loader/extensions/` bundled directly into it:

```sh
npm run build:local
spicetify apply
```

Run `npm run build:local` again after adding, removing, or editing files in `aleha-loader/extensions/`.

## Spotify Settings

The loader adds a settings section in Spotify:

- `Use local/cached extensions`: uses bundled local extensions first, then the cached online extensions.
- `Refetch`: refreshes the online extension cache and shows the last fetched time.
- `Save & Reload`: persists extension toggles and reloads Spotify.

## Development

For local development, run:

```sh
npm run dev
```

The watcher builds `tags/`, embeds local loader extensions, starts the loader builder, and runs `spicetify watch -le`.

Expected output includes `[dev-watch ...]` lines. If those lines are missing, the repo watcher is not running.
