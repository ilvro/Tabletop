// Read-only audit. No application repository, personal scenes or assets are written.
// node --expose-gc scripts/audit-performance.js [--browser] [--out=test-results/performance-audit.json]
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { projectPresentation } from '../src/app/presentation.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const names = ['lighting-chapel', 'lighting-office', 'snowy-mountain-pass', 'igreja-antiga'];
const samples = 25, warmup = 5;
const documents = await Promise.all(names.map(async name => ({ name, document: JSON.parse(await readFile(path.join(root, 'public/scenes', name + '.json'), 'utf8')) })));
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { samples: values.length, p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) };
}
function measure(task) {
  const values = [];
  for (let i = 0; i < warmup + samples; i++) {
    const start = performance.now(); task(i);
    if (i >= warmup) values.push(performance.now() - start);
  }
  return summary(values);
}
const report = {
  measuredAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, cpuCount: os.cpus().length },
  method: { samples, warmup, units: 'milliseconds unless named otherwise', cpuIncludesUI: false, gpuTiming: false, note: 'Synthetic isolated operations; do not add percentiles or infer browser FPS from CPU times.' },
  cpu: [],
};
for (const { name, document } of documents) {
  const store = createSceneStore(document);
  const source = Object.values(document.layout.entities).find(e => e.illumination);
  const entity = Object.values(document.layout.entities)[0];
  report.cpu.push({
    name, entities: Object.keys(document.layout.entities).length, jsonBytes: Buffer.byteLength(JSON.stringify(document)),
    timingsMs: {
      clone: measure(() => structuredClone(document)),
      stringify: measure(() => JSON.stringify(document)),
      validate: measure(() => validateDocument(document)),
      projectPresentation: measure(() => projectPresentation(document)),
      dirtyRead: measure(() => store.dirty),
      renameCommand: measure(i => store.execute('entity.update', { id: entity.id, patch: { name: 'Performance audit ' + i } })),
      ...(source ? { intensityCommand: measure(i => store.execute('entity.update', { id: source.id, patch: { illumination: { ...source.illumination, intensity: source.illumination.intensity + i + 1 } } })) } : {}),
    },
  });
}
if (global.gc) {
  const document = documents.find(d => d.name === 'igreja-antiga').document;
  const entity = Object.values(document.layout.entities)[0], store = createSceneStore(document);
  global.gc(); const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 150; i++) store.execute('entity.update', { id: entity.id, patch: { name: 'History audit ' + i } });
  global.gc(); const after = process.memoryUsage().heapUsed;
  report.history = { fixture: 'igreja-antiga', commands: store.editVersion, heapBeforeBytes: before, heapAfterBytes: after, retainedDeltaBytes: after - before, note: 'Node heap after forced GC, including the retained store; not browser/GPU memory.' };
}

if (process.argv.includes('--browser')) {
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  server.middlewares.use((req, res, next) => {
    if (req.url !== '/__performance_audit') return next();
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html><head><title>Isolated Tabletop performance audit</title></head><body style="margin:0"><div id="viewport" style="width:960px;height:640px;position:relative"></div></body></html>');
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    report.browser = { version: browser.version(), renderer: 'SwiftShader (software)', viewport: [960, 640], deviceScaleFactor: 1, reducedMotion: 'reduce', samples: 6, results: [] };
    for (const name of ['lighting-chapel', 'igreja-antiga']) {
      process.stderr.write('Auditing viewport: ' + name + '\n');
      const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      page.setDefaultTimeout(180_000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.resolvedUrls.local[0] + '__performance_audit');
      const result = await page.evaluate(async name => {
        const { createViewport } = await import('/src/render/renderer.js');
        const [document, catalog] = await Promise.all([fetch('/scenes/' + name + '.json').then(r => r.json()), fetch('/assets/catalog.json').then(r => r.json())]);
        const viewport = createViewport(globalThis.document.getElementById('viewport'), { onError: e => { throw e; } });
        const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
        const summarize = values => { const sorted = [...values].sort((a,b) => a-b); return { samples: values.length, p50: sorted[Math.floor(sorted.length*.5)], p95: sorted[Math.floor(sorted.length*.95)], max: sorted.at(-1) }; };
        const compact = info => ({ timingMs: info.timingMs, programs: info.programs, calls: info.calls, triangles: info.triangles, geometries: info.geometries, textures: info.textures, reconciliation: info.reconciliation, lighting: info.lighting, effects: info.effects, assetDiagnostics: info.assetDiagnostics });
        try {
          viewport.setAssets(catalog);
          let start = performance.now(); viewport.setDocument(document);
          const initialSetDocumentMs = performance.now() - start;
          await viewport.ready();
          viewport.setCamera(Object.values(document.cameraPresets)[0]);
          await frame(); await frame();
          const initial = compact(viewport.getInfo()), source = Object.values(document.layout.entities).find(e => e.illumination);
          const intensity = [], unchanged = [];
          let lastDocument = document;
          for (let i = 0; i < 6; i++) {
            const next = structuredClone(document);
            next.layout.entities[source.id].illumination.intensity += i + 1;
            start = performance.now(); viewport.setDocument(next); intensity.push(performance.now() - start);
            await frame();
            start = performance.now(); viewport.setDocument(next); unchanged.push(performance.now() - start);
            await frame();
            lastDocument = next;
          }
          const afterIntensity = compact(viewport.getInfo());
          const rename = structuredClone(lastDocument), entity = Object.values(rename.layout.entities)[0];
          entity.name += ' audit';
          start = performance.now(); viewport.setDocument(rename);
          const renameSetDocumentMs = performance.now() - start;
          await frame();
          const picking = [];
          for (let i = 0; i < 30; i++) {
            start = performance.now(); viewport.pick({ clientX: 160 + i % 5 * 160, clientY: 160 + i % 3 * 160 }); picking.push(performance.now() - start);
          }
          start = performance.now(); const thumbnail = viewport.captureThumbnail();
          const thumbnailMs = performance.now() - start;
          return { name, initialSetDocumentMs, initial, intensitySetDocumentMs: summarize(intensity), unchangedSetDocumentMs: summarize(unchanged), renameSetDocumentMs, afterIntensity, pickingMs: summarize(picking), thumbnailMs, thumbnailBytes: thumbnail?.length ?? 0 };
        } finally { viewport.destroy(); }
      }, name);
      report.browser.results.push({ ...result, pageErrors: errors });
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
}
const output = process.argv.find(arg => arg.startsWith('--out='))?.slice(6);
if (output) { const target = path.resolve(root, output); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, JSON.stringify(report, null, 2) + '\n'); }
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
