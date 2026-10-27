import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import { RoomStore } from './game/RoomStore.ts';
import { registerSocketHandlers, type GameServer } from './sockets.ts';

const PORT = Number(process.env.PORT) || 3001;
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(import.meta.dirname, '../public');

const store = new RoomStore();
const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, rooms: store.size });
});

// Hashed build assets can be cached forever; index.html must always revalidate
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(PUBLIC_DIR, { index: false }));
app.get('/{*path}', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const httpServer = createServer(app);
const io: GameServer = new Server(httpServer, {
  // Keep sockets alive through short network hiccups so state isn't lost
  connectionStateRecovery: { maxDisconnectionDuration: 30_000 },
});

const sweep = registerSocketHandlers(io, store);
const sweeper = setInterval(sweep, 15_000);

httpServer.listen(PORT, () => {
  console.log(`🧩 Coop Sudoku listening on http://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(sweeper);
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
