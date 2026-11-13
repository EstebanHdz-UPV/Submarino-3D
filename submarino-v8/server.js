// Servidor local. ÚNICO uso de Node en el proyecto: servir archivos y guardar telemetría/diseños.
// Solo módulos nativos. Escucha únicamente en 127.0.0.1.
import http from 'node:http';
import { readFile, appendFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutarMigraciones, sincronizarProyecto } from './server/migraciones.js';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';
const MAX_BODY = 1024 * 1024; // 1 MB

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wasm': 'application/wasm'
};

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "connect-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'";

async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new Error('Cuerpo demasiado grande');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const PROYECTO_ID_DEFECTO = 'submarino-exploracion-3d';
const safeName = (s) => String(s ?? 'sin-nombre').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sin-nombre';
const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
};

const SESSION = new Date().toISOString().replace(/[:.]/g, '-');

// Registro en el Core/catálogo (E1): aplica migraciones pendientes y mantiene la tarjeta al día con el manifest.
const catalogo = (async () => {
  const { db } = await ejecutarMigraciones({ raiz: ROOT, log: (m) => console.log(m) });
  await sincronizarProyecto(db, { raiz: ROOT });
  return db;
})();
catalogo.catch((e) => console.error('No se pudo preparar el catálogo de proyectos:', e.message));
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': MIME['.json'] });

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`);

    // --- Catálogo de proyectos (E1/E2): solo lectura ---
    if (url.pathname === '/api/proyectos' && req.method === 'GET') {
      const db = await catalogo;
      const soloActivos = url.searchParams.get('activos') !== '0';
      return json(res, 200, { proyectos: await db.seleccionar('proyectos', (p) => !soloActivos || p.activo) });
    }
    if (url.pathname.startsWith('/api/proyectos/') && req.method === 'GET') {
      const db = await catalogo;
      const slug = safeName(decodeURIComponent(url.pathname.slice('/api/proyectos/'.length)));
      const [p] = await db.seleccionar('proyectos', (x) => x.slug === slug || x.id === slug);
      if (!p) return json(res, 404, { ok: false, error: 'Proyecto no registrado' });
      const rutas = (await db.seleccionar('rutas_aprendizaje', (r) => r.proyecto_id === p.id)).sort((a, b) => a.orden - b.orden);
      return json(res, 200, { ...p, rutas });
    }
    if (url.pathname === '/api/rutas-aprendizaje' && req.method === 'GET') {
      const db = await catalogo;
      const proyecto_id = safeName(url.searchParams.get('proyecto_id') || PROYECTO_ID_DEFECTO);
      const rutas = (await db.seleccionar('rutas_aprendizaje', (r) => r.proyecto_id === proyecto_id)).sort((a, b) => a.orden - b.orden);
      return json(res, 200, { proyecto_id, rutas });
    }

    // --- API (únicas rutas que escriben, y solo dentro de data/) ---
    if (url.pathname === '/api/guardado' && req.method === 'GET') {
      const proyecto_id = safeName(url.searchParams.get('proyecto_id') || PROYECTO_ID_DEFECTO);
      const alumnoRaw = url.searchParams.get('alumno');
      const alumno_id = alumnoRaw ? safeName(alumnoRaw) : null;
      const candidatos = alumno_id
        ? [
            join(ROOT, 'data/guardado', `${proyecto_id}--${alumno_id}.json`),
            join(ROOT, 'data/designs', `alumno-${alumno_id}.json`),
            join(ROOT, 'data/designs', `diseno-${alumno_id}.json`),
            join(ROOT, 'data/guardado', `${proyecto_id}.json`),
            join(ROOT, 'data/designs', 'diseno-autoguardado.json'),
            join(ROOT, 'data/designs', 'ejemplo.json')
          ]
        : [
            join(ROOT, 'data/guardado', `${proyecto_id}.json`),
            join(ROOT, 'data/designs', 'diseno-autoguardado.json')
          ];
      for (const ruta of candidatos) {
        try {
          const parsed = JSON.parse(await readFile(ruta, 'utf8'));
          const base = parsed?.snapshot ?? parsed?.data ?? parsed;
          if (base && typeof base === 'object') {
            const snapshot = {
              version: 1,
              ...base,
              proyecto_id,
              ...(alumno_id ? { alumno_id } : {})
            };
            return send(res, 200, JSON.stringify({
              ok: true,
              proyecto_id,
              alumno_id,
              soloLectura: Boolean(alumno_id),
              snapshot
            }), { 'Content-Type': MIME['.json'] });
          }
        } catch { /* probar siguiente ruta candidata */ }
      }
      return send(res, 200, JSON.stringify({
        ok: false,
        proyecto_id,
        alumno_id,
        soloLectura: Boolean(alumno_id),
        snapshot: null
      }), { 'Content-Type': MIME['.json'] });
    }
    if (url.pathname === '/api/guardado' && req.method === 'POST') {
      const payload = JSON.parse(await readBody(req));
      if (payload?.soloLectura === true || payload?.modo === 'solo_lectura') {
        return send(res, 403, JSON.stringify({ ok: false, error: 'Modo solo lectura del profesor activo' }), { 'Content-Type': MIME['.json'] });
      }
      const proyecto_id = safeName(payload?.proyecto_id || payload?.snapshot?.proyecto_id || payload?.data?.proyecto_id || PROYECTO_ID_DEFECTO);
      const alumnoRaw = payload?.alumno_id || payload?.snapshot?.alumno_id || url.searchParams.get('alumno');
      const alumno_id = alumnoRaw ? safeName(alumnoRaw) : null;
      const base = payload?.snapshot ?? payload?.data ?? payload;
      const snapshot = {
        version: 1,
        ...(base && typeof base === 'object' ? base : {}),
        proyecto_id,
        ...(alumno_id ? { alumno_id } : {}),
        ts: new Date().toISOString()
      };
      await mkdir(join(ROOT, 'data/guardado'), { recursive: true });
      await mkdir(join(ROOT, 'data/designs'), { recursive: true });
      const mainFile = join(ROOT, 'data/guardado', `${proyecto_id}.json`);
      await writeFile(mainFile, JSON.stringify(snapshot, null, 2));
      await writeFile(join(ROOT, 'data/designs', 'diseno-autoguardado.json'), JSON.stringify(snapshot, null, 2));
      if (alumno_id) {
        await writeFile(join(ROOT, 'data/guardado', `${proyecto_id}--${alumno_id}.json`), JSON.stringify(snapshot, null, 2));
        await writeFile(join(ROOT, 'data/designs', `alumno-${alumno_id}.json`), JSON.stringify(snapshot, null, 2));
      }
      return send(res, 200, JSON.stringify({
        ok: true,
        proyecto_id,
        alumno_id,
        file: `data/guardado/${proyecto_id}.json`
      }), { 'Content-Type': MIME['.json'] });
    }
    if (url.pathname === '/api/avance-rutas' && req.method === 'GET') {
      const alumnoRaw = url.searchParams.get('alumno');
      const archivo = alumnoRaw ? `data/avance_rutas_${safeName(alumnoRaw)}.json` : 'data/avance_rutas.json';
      let state;
      try { state = JSON.parse(await readFile(join(ROOT, archivo), 'utf8')); }
      catch {
        try { state = JSON.parse(await readFile(join(ROOT, 'data/avance_rutas.json'), 'utf8')); }
        catch { state = { proyecto_id: PROYECTO_ID_DEFECTO, desbloqueada: 'M', completadas: [], datos: {}, eventos: { objetos_colocados: 0 } }; }
      }
      state.proyecto_id = state.proyecto_id || PROYECTO_ID_DEFECTO;
      return send(res, 200, JSON.stringify(state), { 'Content-Type': MIME['.json'] });
    }
    if (url.pathname === '/api/avance-rutas' && req.method === 'POST') {
      const payload = JSON.parse(await readBody(req));
      if (payload?.soloLectura === true) {
        return send(res, 403, JSON.stringify({ ok: false, error: 'Modo solo lectura del profesor activo' }), { 'Content-Type': MIME['.json'] });
      }
      const proyecto_id = safeName(payload?.proyecto_id || PROYECTO_ID_DEFECTO);
      const file = join(ROOT, 'data/avance_rutas.json');
      let state = { proyecto_id, desbloqueada: 'M', completadas: [], datos: {}, eventos: { objetos_colocados: 0 } };
      try { state = { ...state, ...JSON.parse(await readFile(file, 'utf8')), proyecto_id }; } catch { /* primer avance */ }
      if (payload.evento === 'object_colocado' || payload.evento === 'objeto_colocado') {
        const slotId = String(payload.slotId || '').slice(0, 100);
        const slots = Array.isArray(state.eventos?.slots_colocados) ? state.eventos.slots_colocados : [];
        if (slotId && !slots.includes(slotId)) slots.push(slotId);
        state.eventos = { ...(state.eventos || {}), slots_colocados: slots, objetos_colocados: slots.length };
        state.ultimo_objeto = { proyecto_id, slotId, partId: String(payload.partId || '').slice(0, 100), fecha: new Date().toISOString() };
      } else if (payload.evento === 'matematicas_intento') {
        state.eventos = state.eventos || {};
        state.eventos.matematicas_intentos = (state.eventos.matematicas_intentos || 0) + 1;
        state.ultimo_matematicas = { proyecto_id, ...payload, fecha: new Date().toISOString() };
      } else if (payload.evento === 'ciencia_intento') {
        state.eventos = state.eventos || {};
        state.eventos.ciencia_intentos = (state.eventos.ciencia_intentos || 0) + 1;
        state.ultimo_ciencia = { proyecto_id, ...payload, fecha: new Date().toISOString() };
      } else if (payload.evento === 'programa_ejecutado') {
        state.eventos = state.eventos || {};
        state.eventos.programas_ejecutados = (state.eventos.programas_ejecutados || 0) + 1;
        state.ultimo_programa = { proyecto_id, ...payload, fecha: new Date().toISOString() };
      } else if (typeof payload.evento === 'string' && payload.evento) {
        // Otro evento (p. ej. biomimetica_completada): se cuenta, pero nunca reemplaza el avance guardado.
        const clave = safeName(payload.evento).replace(/-/g, '_');
        state.eventos = state.eventos || {};
        state.eventos[clave] = (state.eventos[clave] || 0) + 1;
      } else {
        const fases = ['M', 'S', 'E', 'T', 'A'];
        const completadas = Array.isArray(payload.completadas) ? payload.completadas.filter((x) => fases.includes(x)) : [];
        state = { ...state, proyecto_id, desbloqueada: fases.includes(payload.desbloqueada) ? payload.desbloqueada : 'M', completadas, datos: payload.datos && typeof payload.datos === 'object' ? payload.datos : {}, eventos: state.eventos };
      }
      await mkdir(join(ROOT, 'data'), { recursive: true });
      await writeFile(file, JSON.stringify(state, null, 2));
      return send(res, 200, JSON.stringify(state), { 'Content-Type': MIME['.json'] });
    }
    if (req.method === 'POST' && url.pathname === '/api/telemetry') {
      const body = (await readBody(req)).trim();
      if (!body) return send(res, 400, 'Telemetría vacía');
      const lines = body.split(/\r?\n/);
      if (lines.length > 500) return send(res, 413, 'Demasiadas muestras en un lote');
      try {
        for (const line of lines) {
          const sample = JSON.parse(line);
          if (!sample || typeof sample !== 'object' || Array.isArray(sample) || typeof sample.ts !== 'string' || !Number.isFinite(Date.parse(sample.ts))) {
            return send(res, 400, 'Muestra de telemetría inválida');
          }
        }
      } catch { return send(res, 400, 'JSONL de telemetría inválido'); }
      await mkdir(join(ROOT, 'data/telemetry'), { recursive: true });
      await appendFile(join(ROOT, 'data/telemetry', `session-${SESSION}.jsonl`), lines.join('\n') + '\n');
      return send(res, 204, '');
    }
    if (req.method === 'POST' && url.pathname === '/api/designs') {
      const payload = JSON.parse(await readBody(req)); // { proyecto_id, kind, name, data }
      if (payload?.soloLectura === true) {
        return send(res, 403, JSON.stringify({ ok: false, error: 'Modo solo lectura del profesor activo' }), { 'Content-Type': MIME['.json'] });
      }
      const proyecto_id = safeName(payload.proyecto_id || payload.data?.proyecto_id || PROYECTO_ID_DEFECTO);
      const kind = payload.kind === 'reporte' ? 'reporte' : 'diseno';
      const file = `${kind}-${safeName(payload.name)}.json`;
      const dataConProyecto = payload.data && typeof payload.data === 'object'
        ? { proyecto_id, ...payload.data }
        : { proyecto_id, valor: payload.data ?? null };
      await mkdir(join(ROOT, 'data/designs'), { recursive: true });
      await writeFile(join(ROOT, 'data/designs', file), JSON.stringify(dataConProyecto, null, 2));
      if (kind === 'diseno') {
        await mkdir(join(ROOT, 'data/guardado'), { recursive: true });
        await writeFile(join(ROOT, 'data/guardado', `${proyecto_id}.json`), JSON.stringify(dataConProyecto, null, 2));
      }
      return send(res, 200, JSON.stringify({ ok: true, proyecto_id, file: `data/designs/${file}` }), { 'Content-Type': MIME['.json'] });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');

    // --- Archivos estáticos con protección contra path traversal ---
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const full = resolve(join(ROOT, rel));
    if (full !== ROOT && !full.startsWith(ROOT + sep)) return send(res, 403, 'Prohibido');
    if (rel.split('/').some((p) => p.startsWith('.'))) return send(res, 403, 'Prohibido');
    // Los registros de telemetría son datos de ejecución, no recursos públicos de la interfaz.
    if (rel.replaceAll('\\', '/').startsWith('/data/telemetry/')) return send(res, 403, 'Prohibido');
    // El código del servidor y las tablas del catálogo se consultan por la API, no como archivos.
    if (/^\/(server|data\/db)\//.test(rel.replaceAll('\\', '/'))) return send(res, 403, 'Prohibido');
    const info = await stat(full);
    if (!info.isFile()) return send(res, 404, 'No encontrado');
    const data = await readFile(full);
    send(res, 200, req.method === 'HEAD' ? '' : data, {
      'Content-Type': MIME[extname(full).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
  } catch (e) {
    const notFound = e && e.code === 'ENOENT';
    send(res, notFound ? 404 : 400, notFound ? 'No encontrado' : 'Solicitud inválida');
  }
}).listen(PORT, HOST, () => console.log(`Submarino de exploración en http://localhost:${PORT} (solo local)`));
