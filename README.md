# Coop Sudoku

Real-time multiplayer Sudoku. Share a link and solve one board together with up to four friends — or race each other on the same puzzle.

**Made by [LMF](https://lmf.logge.top)**

## Features

- **Co-op** — one shared board, shared pencil notes, live cursors, and a colored marker showing who solved which cell
- **Versus** — same puzzle, private boards. First to solve a cell gets +100, everyone after +50, wrong digits cost 250
- **Unique puzzles** — every generated puzzle has exactly one solution (easy / medium / hard)
- **Reconnect-safe** — reload the page or lose your connection and you keep your seat and score for 2 minutes
- **Rematch** — start the next round in the same room once a puzzle is solved
- **Chat** with history for late joiners, invite links, dark & light theme, fully responsive, keyboard friendly

### Shortcuts

| Key | Action |
| --- | --- |
| `1`–`9` | Enter digit (or toggle note in notes mode) |
| `N` | Toggle notes mode |
| `⌫` / `Delete` | Clear notes in the cell |
| Arrow keys | Move selection |
| `H` | Hint (co-op, −15 points) |
| `Ctrl/⌘ Z` | Undo your last note edit |
| `Esc` | Deselect |

## Tech stack

| | |
| --- | --- |
| Client | React 19, Vite, Tailwind CSS 4, Zustand, Motion |
| Server | Node.js, Express 5, Socket.IO 4 |
| Shared | TypeScript types + protocol in `shared/` |
| Tests | Vitest (sudoku engine and game rules) |

npm workspaces tie the three packages together.

```
coop-sudoku/
├── client/   React app (built into server/public)
├── server/   Express + Socket.IO, game engine in src/game
└── shared/   Types, socket protocol, rules and scoring
```

## Development

Requires Node.js 20.19+.

```bash
npm install
npm run dev
```

This starts the server on `:3001` and Vite on [http://localhost:5173](http://localhost:5173) (which proxies the socket to the server).

Other scripts:

```bash
npm test           # server unit tests
npm run typecheck  # all workspaces
npm run lint       # client
npm run build      # client → server/public, server → server/dist
npm start          # run the production build on :3001
```

## Docker

```bash
docker build -t coop-sudoku .
docker run -p 3001:3001 coop-sudoku
```

`PORT` and `PUBLIC_DIR` can be set via environment variables. `GET /healthz` returns the server status.

## License

MIT
