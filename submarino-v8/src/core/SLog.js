// SLog: registro estructurado { ts (ISO-8601), level, module, msg, data }
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MAX_ENTRIES = 2000;
let minLevel = LEVELS.DEBUG;
const entries = [];

function write(level, module, msg, data) {
  if (LEVELS[level] < minLevel) return;
  const entry = { ts: new Date().toISOString(), level, module, msg, data: data ?? null };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  const fn = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : level === 'INFO' ? 'info' : 'log';
  console[fn](`[${entry.ts}] [${level}] [${module}] ${msg}`, data ?? '');
}

export const SLog = {
  /** @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level */
  setLevel(level) { if (level in LEVELS) minLevel = LEVELS[level]; },
  debug: (module, msg, data) => write('DEBUG', module, msg, data),
  info: (module, msg, data) => write('INFO', module, msg, data),
  warn: (module, msg, data) => write('WARN', module, msg, data),
  error: (module, msg, data) => write('ERROR', module, msg, data),
  entries: () => [...entries],
  /** Descarga el registro como JSON (RNF-60). */
  exportJSON() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slog-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};
