import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function run(args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); stop(code || 0); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
run(['--watch', 'server/index.js']);
const endpoint = `http://127.0.0.1:${process.env.TABLETOP_PORT || 3001}/api/tabletop/health`;
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try {
    const response = await fetch(endpoint);
    if (response.ok) { ready = true; break; }
  } catch { /* Wait for the local server, not an external service. */ }
  await delay(150);
}
if (!stopping && ready) run(['node_modules/vite/bin/vite.js']);
else if (!stopping) { console.error('O servidor local não iniciou. Confira a porta e TABLETOP_DATA_DIR.'); stop(1); }
