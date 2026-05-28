# Local Development

Run the local development watcher from the repository root:

```sh
npm run dev
```

Do not run `spicetify watch -le` by itself for source development. That command only reloads files that are already installed in Spicetify. The repo watcher starts `spicetify watch -le` for you after it builds `tags/`, embeds the local loader extensions, and starts the loader builder.

Expected terminal output includes `[dev-watch ...]` lines. If those lines are not present, the repo watcher is not running.
