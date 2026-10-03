import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.TABLETOP_PORT ?? 3001);
const host = process.env.TABLETOP_HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('TABLETOP_PORT deve estar entre 1 e 65535.');

const app = await createApp({ dataDir: path.resolve(process.env.TABLETOP_DATA_DIR ?? path.join(projectDir, 'data')), ...(process.env.TABLETOP_INSTANCE_ID ? { instanceId: process.env.TABLETOP_INSTANCE_ID } : {}) });
const server = app.listen(port, host, () => console.log(`Tabletop: http://${host}:${port} — dados em ${app.locals.storage.dataDir}`));
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
