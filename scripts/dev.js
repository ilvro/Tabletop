import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function run(args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); stop(code || 0); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
const instanceId = randomUUID();
run(['--watch', 'server/index.js'], { ...process.env, TABLETOP_INSTANCE_ID: instanceId });
const endpoint = `http://127.0.0.1:${process.env.TABLETOP_PORT || 3001}/api/tabletop/health`;
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(750) });
    if (response.ok) {
      const health = await response.json();
      if (health.instanceId !== instanceId) {
        console.error('A porta do backend já está ocupada por outra instância. Encerre-a ou configure TABLETOP_PORT.');
        stop(1);
        break;
      }
      ready = true; break;
    }
  } catch { /* Wait for the local server, not an external service. */ }
  await delay(150);
}
if (!stopping && ready) run(['node_modules/vite/bin/vite.js']);
else if (!stopping) { console.error('O servidor local não iniciou. Confira a porta e TABLETOP_DATA_DIR.'); stop(1); }
