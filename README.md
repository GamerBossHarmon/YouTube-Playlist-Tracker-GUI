# ytpt-gui: YouTube Playlist Tracker GUI

The web GUI for [ytpt](https://github.com/GamerBossHarmon/YouTube-Playlist-Tracker) (YouTube Playlist Tracker). Browse and watch your archive, add and manage sources, follow downloads live, and see **how each playlist changes over time** (videos added, removed, reordered).

- **Standalone.** It only needs to know where the ytpt API is (an IP and a port). It shares no files or code with ytpt, so the two can run on different machines.
- **Live.** One app-wide SSE connection keeps the queue, progress and logs up to date without refreshing.
- **Typed against the API.** API types are generated from ytpt's OpenAPI schema, so an API change that breaks the GUI fails the build instead of failing at runtime.
- **Built with** React, Vite, Tailwind (v4), TypeScript, TanStack Query, React Router and Radix primitives.

## How it is wired

```
Browser ──▶ ytpt-gui server (this project) ──▶ ytpt API
            serves dist/, proxies /api/*        (server.enabled = true)
```

The browser only ever talks to the GUI's own origin. The GUI server ([`server/index.mjs`](server/index.mjs), zero dependencies) streams requests through without buffering, which is what keeps video seeking (Range requests) and the live event stream (SSE) working.

## Quick start (local)

Requires Node.js and a running ytpt with its API enabled (`[server] enabled = true` in `ytpt.conf`, then `python ytpt.py run`).

```bash
npm install
npm run build
YTPT_API_URL=http://127.0.0.1:8000 npm start      # then open http://127.0.0.1:8080
```

On Windows PowerShell, set the variable first: `$env:YTPT_API_URL = "http://127.0.0.1:8000"; npm start`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `YTPT_API_URL` | `http://127.0.0.1:8000` | where the ytpt API lives |
| `YTPT_GUI_HOST` | `127.0.0.1` | interface to listen on |
| `YTPT_GUI_PORT` | `8080` | port to listen on |
| `YTPT_GUI_DIST` | `./dist` | built GUI directory |

You can put these in a `.env` file instead of the shell (see `.env.example`).

ytpt has **no built-in authentication**. Keep both servers on loopback, or put them behind Tailscale or a reverse proxy with auth, before listening on anything wider. The server prints a warning if you do.

Alternatively, ytpt can serve the built `dist/` itself via `server.frontend_dir` in `ytpt.conf`: one process, same origin, nothing to proxy.

## Pages

- **Home:** video grid (newest archived first) with status, source and sort filters, search, queued placeholders with their queue position, and live progress.
- **Sources:** add, pause, check now, edit settings, or stop tracking a source.
- **Source detail:** videos in playlist order, plus the **Timeline** of adds, removals and reorders for every check.
- **Watch:** player with subtitles, comments, download attempts with verbose yt-dlp logs, and retry for failed videos.
- **Queue:** the current download with live progress, a countdown to the next one, and the waiting list. Any video can be moved to the front with "download now".
- **Accounts:** upload extra cookies files, refresh or remove accounts, and track an account's playlists with one click. A source can be read by an extra account, and a single video can be downloaded once with a chosen account (e.g. members-only). The primary account still does the normal downloading.
- **Orphaned:** archived videos that no tracked source contains any more.
- **Log:** filterable execution log with a live tail.

## Docker

```bash
# GUI only, pointed at a ytpt API that is already running (default: on this Docker host, port 8000)
YTPT_UPSTREAM_URL=http://192.168.1.20:8000 docker compose up -d --build

# ytpt + GUI together (expects ../YouTube-Playlist-Tracker). ytpt's API is NOT published: only the GUI reaches it.
docker compose -f docker-compose.full.yml up -d --build        # then open http://127.0.0.1:8080
```

The image is a two-stage build (compile, then a small Node runtime running `server/index.mjs`). Ports are published on `127.0.0.1` only. Since ytpt has no authentication, widen that only behind Tailscale or a reverse proxy.

The full setup keeps ytpt's state in `./ytpt-state/config` (database and `cookies.txt`) and `./ytpt-state/data` (downloads).

## Development

```bash
YTPT_API_URL=http://127.0.0.1:8000 npm run dev    # Vite on :5173, proxies /api the same way
npm test                                          # vitest (components, live layer, API client, proxy server)
npm run lint
```

### Keeping types in sync with the API

```bash
YTPT_API_URL=http://127.0.0.1:8000 npm run sync:api    # refetch openapi.json from a running ytpt, regenerate types
```

`gen:api` regenerates from the committed `openapi.json` only. It runs `openapi-typescript` through `npx` because that tool needs TypeScript 5 while this project uses TypeScript 7.

### Layout

```
server/          production server: static files + streaming /api proxy (and its tests)
src/api/         fetch client, generated schema, typed query hooks
src/live/        the one app-wide SSE connection: progress store + event → cache-invalidation mapping
src/pages/       Home, Sources, SourceDetail, Watch, Queue, Accounts, Orphaned, Log
src/components/  shell, cards, dialogs; ui/ holds the small design-system pieces (Radix underneath)
```

## Contributing

Feedback and contributions are welcome. This is a small personal project, so replies may not be instant, but everything gets read.

- **Questions, ideas and comments:** open an [issue](https://github.com/GamerBossHarmon/YouTube-Playlist-Tracker-GUI/issues) and say what's on your mind.
- **Bug reports:** open an issue with what you did, what you expected, and what happened. Include a screenshot or the browser console output if you can, and remove any personal info first.
- **Pull requests:** welcome. For anything big, open an issue first so we can agree on the approach. Please run `npm test` and `npm run lint` before submitting, and add tests for new behavior.
- **ytpt itself (downloads, API, CLI)** issues and PRs go to the [ytpt repo](https://github.com/GamerBossHarmon/YouTube-Playlist-Tracker).

## Disclaimer

This GUI is a front end for ytpt and is intended for personal archival of media you have the right to access. You are responsible for complying with [YouTube's Terms of Service](https://www.youtube.com/t/terms) and with the copyright and licensing rights of the creators whose content you download. Do not redistribute content you do not have permission to share. The authors are not affiliated with YouTube or Google, and the software is provided as is, without warranty (see [LICENSE](LICENSE)).

## Credits

- [ytpt](https://github.com/GamerBossHarmon/YouTube-Playlist-Tracker): the backend this GUI talks to.
- [React](https://react.dev/) and [Vite](https://vite.dev/): the app and its build tooling.
- [Tailwind CSS](https://tailwindcss.com/): styling.
- [TanStack Query](https://tanstack.com/query): data fetching and caching.
- [React Router](https://reactrouter.com/): routing.
- [Radix UI](https://www.radix-ui.com/): accessible dialog, menu, switch and tab primitives.
- [Lucide](https://lucide.dev/): icons.
- [openapi-typescript](https://github.com/openapi-ts/openapi-typescript): generates API types from ytpt's OpenAPI schema.
- [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/) and [oxlint](https://oxc.rs/): tests and linting.

## License

[MIT](LICENSE)
