export function createPerformanceDiagnostics(enabled = globalThis.location?.search?.includes('diagnostics') ?? false) {
  const timings = new Map(), counts = new Map(); let observer;
  const record = (name, ms) => {
    if (!enabled) return;
    const values = timings.get(name) ?? []; values.push(ms);
    if (values.length > 180) values.shift(); timings.set(name, values);
  };
  const count = (name, amount = 1) => { if (enabled) counts.set(name, (counts.get(name) ?? 0) + amount); };
  if (enabled && globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
    observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) { record('longTask', entry.duration); count('longTasks'); } });
    observer.observe({ type: 'longtask', buffered: false });
  }
  return {
    enabled, record, count,
    measure(name, task) { if (!enabled) return task(); const start = performance.now(); try { return task(); } finally { record(name, performance.now() - start); count(name); } },
    async measureAsync(name, task) { if (!enabled) return task(); const start = performance.now(); try { return await task(); } finally { record(name, performance.now() - start); count(name); } },
    snapshot() { return { enabled, counts: Object.fromEntries(counts), timingMs: Object.fromEntries([...timings].map(([name, values]) => { const s = [...values].sort((a,b) => a-b); return [name, { samples: s.length, p50: s[Math.floor(s.length*.5)], p95: s[Math.floor(s.length*.95)], p99: s[Math.floor(s.length*.99)], max: s.at(-1) }]; })) }; },
    reset() { timings.clear(); counts.clear(); },
    dispose() { observer?.disconnect(); timings.clear(); counts.clear(); },
  };
}

export function createGpuTimer(gl, diagnostics) {
  const ext = diagnostics.enabled && gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending = []; let active;
  return {
    supported: Boolean(ext),
    begin() {
      if (!ext) return;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      while (pending.length && (disjoint || gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE))) {
        const query = pending.shift();
        if (!disjoint) diagnostics.record('gpuFrame', gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(query);
      }
      if (pending.length >= 4) return;
      active = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, active);
    },
    end() { if (active) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(active); active = null; } },
    dispose() { if (active) { gl.endQuery(ext.TIME_ELAPSED_EXT); gl.deleteQuery(active); active = null; } for (const q of pending) gl.deleteQuery(q); pending.length = 0; },
  };
}
