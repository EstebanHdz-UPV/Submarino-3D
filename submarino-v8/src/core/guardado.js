import { SLog } from './SLog.js';

export const PROYECTO_ID_DEFECTO = 'submarino-exploracion-3d';

/**
 * Extrae el identificador del alumno desde ?alumno=ID (en location.search o dentro del hash).
 * Si existe, activa el modo espejo docente (solo lectura).
 */
export function obtenerAlumnoId(loc = globalThis.location) {
  if (!loc) return null;
  try {
    const searchParams = new URLSearchParams(loc.search || '');
    const directo = searchParams.get('alumno');
    if (directo && directo.trim()) return directo.trim();
    const hash = String(loc.hash || '');
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const hashParams = new URLSearchParams(hash.slice(qIdx + 1));
      const enHash = hashParams.get('alumno');
      if (enHash && enHash.trim()) return enHash.trim();
    }
  } catch { /* entorno sin URLSearchParams o location parcial */ }
  return null;
}

/** Indica si la sesión actual está en modo espejo docente (?alumno=ID). */
export function esModoSoloLectura(loc = globalThis.location) {
  return Boolean(obtenerAlumnoId(loc));
}

export const esModoProfesor = esModoSoloLectura;

/** Clave de almacenamiento local asociada al proyecto (y opcionalmente al alumno). */
export function claveGuardadoLocal(proyecto_id = PROYECTO_ID_DEFECTO, alumno_id = null) {
  const pid = String(proyecto_id || PROYECTO_ID_DEFECTO).trim() || PROYECTO_ID_DEFECTO;
  const aid = alumno_id ? String(alumno_id).trim() : '';
  return aid ? `submarino.autoguardado.${pid}.${aid}` : `submarino.autoguardado.${pid}`;
}

/**
 * Normaliza cualquier instantánea de diseño o estado garantizando siempre la presencia de proyecto_id (C5).
 */
export function normalizarSnapshot(raw, { proyecto_id = PROYECTO_ID_DEFECTO, alumno_id = null, origen = 'autoguardado' } = {}) {
  const pid = String(proyecto_id || raw?.proyecto_id || PROYECTO_ID_DEFECTO).trim() || PROYECTO_ID_DEFECTO;
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : { piezas: {} };
  const piezas = base.piezas && typeof base.piezas === 'object'
    ? { ...base.piezas }
    : (base.diseno?.piezas && typeof base.diseno.piezas === 'object' ? { ...base.diseno.piezas } : {});
  const normalizado = {
    version: Number(base.version) || 1,
    proyecto_id: pid,
    nombre: String(base.nombre || 'autoguardado'),
    ...(alumno_id || base.alumno_id ? { alumno_id: String(alumno_id || base.alumno_id) } : {}),
    piezas,
    ...(base.ajustes && typeof base.ajustes === 'object' ? { ajustes: { proyecto_id: pid, ...base.ajustes } } : {}),
    ...(base.estado && typeof base.estado === 'object' ? { estado: { ...base.estado } } : {}),
    ...(base.diseno && typeof base.diseno === 'object' ? { diseno: { ...base.diseno, proyecto_id: pid } } : {}),
    origen,
    ts: typeof base.ts === 'string' && Number.isFinite(Date.parse(base.ts)) ? base.ts : new Date().toISOString()
  };
  return normalizado;
}

/** Huella determinista del contenido relevante del diseño para evitar guardados redundantes. */
function huellaSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return '';
  return JSON.stringify({
    proyecto_id: snap.proyecto_id,
    alumno_id: snap.alumno_id ?? null,
    piezas: snap.piezas ?? {},
    ajustes: snap.ajustes ?? null,
    estado: snap.estado ?? null
  });
}

/**
 * Persiste una instantánea en localStorage y en el servidor local (/api/guardado).
 * Incluye siempre proyecto_id (C5) y bloquea escrituras en modo solo lectura del profesor (C4).
 */
export async function guardar(snapshotRaw, {
  proyecto_id = PROYECTO_ID_DEFECTO,
  alumno_id = null,
  endpoint = '/api/guardado',
  soloLectura = esModoSoloLectura(),
  origen = 'manual',
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch
} = {}) {
  if (soloLectura) {
    SLog.warn('Guardado', 'Intento de guardado bloqueado: modo solo lectura del profesor activo');
    return { ok: false, bloqueado: true, razon: 'modo_solo_lectura', proyecto_id };
  }
  const snapshot = normalizarSnapshot(snapshotRaw, { proyecto_id, alumno_id, origen });
  let localOk = false;
  try {
    if (storage && typeof storage.setItem === 'function') {
      const serializado = JSON.stringify(snapshot);
      storage.setItem(claveGuardadoLocal(snapshot.proyecto_id, snapshot.alumno_id), serializado);
      storage.setItem(`submarino.diseno.${snapshot.proyecto_id}`, serializado);
      localOk = true;
    }
  } catch (e) {
    SLog.warn('Guardado', 'No se pudo escribir en localStorage', e?.message);
  }

  let remotoOk = false;
  let archivoRemoto = null;
  if (typeof fetchImpl === 'function') {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: snapshot.proyecto_id,
          alumno_id: snapshot.alumno_id ?? null,
          kind: 'diseno',
          name: snapshot.nombre || 'autoguardado',
          origen,
          data: snapshot,
          snapshot
        }),
        keepalive: true
      });
      if (res?.ok) {
        remotoOk = true;
        try {
          const info = await res.json();
          archivoRemoto = info?.file ?? null;
        } catch { /* respuesta sin cuerpo JSON */ }
      }
    } catch (e) {
      SLog.warn('Guardado', 'Respaldo local activo; servidor no disponible en guardado', e?.message);
    }
  }

  return { ok: localOk || remotoOk, local: localOk, remoto: remotoOk, file: archivoRemoto, proyecto_id: snapshot.proyecto_id, snapshot };
}

/**
 * Envía el último estado del diseño mediante navigator.sendBeacon al cerrar la pestaña o cambiar visibilidad (C3).
 * Incluye siempre proyecto_id (C5) y respeta el modo solo lectura del profesor (C4).
 */
export function enviarBeaconSnapshot(obtenerSnapshotOrData, {
  proyecto_id = PROYECTO_ID_DEFECTO,
  alumno_id = null,
  endpoint = '/api/guardado',
  soloLectura = esModoSoloLectura(),
  navigatorImpl = globalThis.navigator,
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch
} = {}) {
  if (soloLectura) return false;
  let raw;
  try {
    raw = typeof obtenerSnapshotOrData === 'function' ? obtenerSnapshotOrData() : obtenerSnapshotOrData;
  } catch (e) {
    SLog.warn('Guardado', 'Error al obtener snapshot para sendBeacon', e?.message);
    return false;
  }
  if (!raw || typeof raw !== 'object') return false;

  const snapshot = normalizarSnapshot(raw, { proyecto_id, alumno_id, origen: 'sendBeacon' });
  const payload = JSON.stringify({
    proyecto_id: snapshot.proyecto_id,
    alumno_id: snapshot.alumno_id ?? null,
    kind: 'diseno',
    name: snapshot.nombre || 'autoguardado',
    origen: 'sendBeacon',
    data: snapshot,
    snapshot
  });

  // 1. Respaldo síncrono inmediato en localStorage antes de descargar la página
  let guardadoLocal = false;
  try {
    if (storage && typeof storage.setItem === 'function') {
      const snapStr = JSON.stringify(snapshot);
      storage.setItem(claveGuardadoLocal(snapshot.proyecto_id, snapshot.alumno_id), snapStr);
      storage.setItem(`submarino.diseno.${snapshot.proyecto_id}`, snapStr);
      guardadoLocal = true;
    }
  } catch { /* sin localStorage */ }

  // 2. Envío prioritario por navigator.sendBeacon (C3)
  try {
    if (navigatorImpl && typeof navigatorImpl.sendBeacon === 'function') {
      const body = typeof Blob === 'function'
        ? new Blob([payload], { type: 'application/json' })
        : payload;
      const enviado = navigatorImpl.sendBeacon(endpoint, body);
      if (enviado) {
        SLog.info('Guardado', `sendBeacon enviado (${snapshot.proyecto_id})`);
        return true;
      }
    }
  } catch (e) {
    SLog.warn('Guardado', 'Fallo en navigator.sendBeacon; usando fetch keepalive', e?.message);
  }

  // 3. Respaldo con fetch keepalive si sendBeacon no está disponible o devuelve false
  if (typeof fetchImpl === 'function') {
    try {
      void fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
      return true;
    } catch { /* ignorar al cerrar */ }
  }

  return guardadoLocal;
}

/**
 * Restaura el diseño guardado del proyecto o el diseño de un alumno específico en modo espejo docente (?alumno=ID) (C2, C4).
 */
export async function cargar({
  proyecto_id = PROYECTO_ID_DEFECTO,
  alumno_id = obtenerAlumnoId(),
  endpoint = '/api/guardado',
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch
} = {}) {
  const pid = String(proyecto_id || PROYECTO_ID_DEFECTO).trim() || PROYECTO_ID_DEFECTO;
  const aid = alumno_id ? String(alumno_id).trim() : null;
  const soloLectura = Boolean(aid);

  // 1. Intentar recuperar desde el servidor (/api/guardado?proyecto_id=...&alumno=...)
  if (typeof fetchImpl === 'function') {
    try {
      const qs = new URLSearchParams({ proyecto_id: pid, ...(aid ? { alumno: aid } : {}) });
      const res = await fetchImpl(`${endpoint}?${qs.toString()}`, { cache: 'no-cache' });
      if (res?.ok) {
        const body = await res.json();
        const candidato = body?.snapshot ?? body?.data ?? (body?.piezas ? body : null);
        if (candidato && typeof candidato === 'object' && candidato.piezas && Object.keys(candidato.piezas).length > 0) {
          const snapshot = normalizarSnapshot(candidato, { proyecto_id: pid, alumno_id: aid, origen: 'servidor' });
          SLog.info('Guardado', `Diseño restaurado desde servidor (${pid}${aid ? ` · alumno ${aid}` : ''})`);
          return { ok: true, origen: 'servidor', soloLectura, alumno_id: aid, proyecto_id: pid, snapshot };
        }
      }
    } catch (e) {
      SLog.warn('Guardado', 'No se pudo consultar /api/guardado en el servidor; probando almacenamiento local', e?.message);
    }
  }

  // 2. Respaldo desde localStorage (clave específica del alumno o clave general del proyecto)
  try {
    if (storage && typeof storage.getItem === 'function') {
      const claves = aid
        ? [claveGuardadoLocal(pid, aid), `submarino.diseno.${pid}.${aid}`, claveGuardadoLocal(pid), `submarino.diseno.${pid}`]
        : [claveGuardadoLocal(pid), `submarino.diseno.${pid}`];
      for (const k of claves) {
        const raw = storage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const candidato = parsed?.snapshot ?? parsed?.data ?? parsed;
        if (candidato && typeof candidato === 'object' && candidato.piezas && Object.keys(candidato.piezas).length > 0) {
          const snapshot = normalizarSnapshot(candidato, { proyecto_id: pid, alumno_id: aid, origen: 'localStorage' });
          SLog.info('Guardado', `Diseño restaurado desde localStorage (${k})`);
          return { ok: true, origen: 'localStorage', soloLectura, alumno_id: aid, proyecto_id: pid, snapshot };
        }
      }
    }
  } catch (e) {
    SLog.warn('Guardado', 'No se pudo restaurar desde localStorage', e?.message);
  }

  return { ok: false, origen: 'ninguno', soloLectura, alumno_id: aid, proyecto_id: pid, snapshot: null };
}

/**
 * Conecta el ciclo de autoguardado periódico, por eventos y con garantía de sendBeacon al cerrar pestaña (C1, C3, C4, C5).
 * @param {() => object} obtenerSnapshot Función que devuelve el estado/diseño actual del submarino.
 * @param {object} opciones Configuración ({ proyecto_id, alumno_id, intervaloMs, debounceMs, endpoint, soloLectura, bus, windowImpl }).
 */
export function iniciarAutoguardado(obtenerSnapshot, opciones = {}) {
  if (typeof obtenerSnapshot !== 'function') {
    throw new TypeError('iniciarAutoguardado requiere una función obtenerSnapshot()');
  }
  const proyecto_id = String(opciones.proyecto_id || PROYECTO_ID_DEFECTO).trim() || PROYECTO_ID_DEFECTO;
  const alumno_id = opciones.alumno_id ?? obtenerAlumnoId(opciones.windowImpl?.location ?? globalThis.location);
  const soloLectura = Boolean(opciones.soloLectura ?? Boolean(alumno_id));
  const intervaloMs = Math.max(1000, Number(opciones.intervaloMs) || 15000);
  const debounceMs = Math.max(100, Number(opciones.debounceMs) || 1000);
  const endpoint = opciones.endpoint || '/api/guardado';
  const storage = opciones.storage ?? globalThis.localStorage;
  const fetchImpl = opciones.fetchImpl ?? globalThis.fetch;
  const navigatorImpl = opciones.navigatorImpl ?? globalThis.navigator;
  const win = opciones.windowImpl ?? globalThis;
  const bus = opciones.bus ?? null;

  // En modo espejo docente (?alumno=ID) no se autoguarda ni se dispara sendBeacon para no sobrescribir al alumno (C4).
  if (soloLectura) {
    SLog.info('Guardado', `Modo espejo docente activo (?alumno=${alumno_id}); autoguardado en pausa.`);
    return {
      activo: false,
      soloLectura: true,
      proyecto_id,
      alumno_id,
      guardarAhora: async () => ({ ok: false, bloqueado: true, razon: 'modo_solo_lectura', proyecto_id }),
      notificarCambio: () => {},
      enviarBeacon: () => false,
      detener: () => {},
      ultimoSnapshot: () => null
    };
  }

  let ultimaHuella = '';
  let ultimoSnap = null;
  let timerIntervalo = null;
  let timerDebounce = null;
  let beaconEnviadoReciente = 0;

  async function guardarAhora(forzar = false, origen = 'autoguardado') {
    let raw;
    try {
      raw = obtenerSnapshot();
    } catch (e) {
      SLog.warn('Guardado', 'No se pudo obtener snapshot en autoguardado', e?.message);
      return { ok: false, proyecto_id };
    }
    const snap = normalizarSnapshot(raw, { proyecto_id, alumno_id, origen });
    const huella = huellaSnapshot(snap);
    if (!forzar && huella === ultimaHuella) {
      return { ok: true, sinCambios: true, proyecto_id, snapshot: ultimoSnap ?? snap };
    }
    ultimaHuella = huella;
    ultimoSnap = snap;
    return guardar(snap, { proyecto_id, alumno_id, endpoint, soloLectura: false, origen, storage, fetchImpl });
  }

  function notificarCambio() {
    if (timerDebounce) clearTimeout(timerDebounce);
    timerDebounce = setTimeout(() => {
      timerDebounce = null;
      void guardarAhora(false, 'cambio-ensamblaje');
    }, debounceMs);
  }

  function ejecutarBeaconCierre() {
    const ahora = Date.now();
    if (ahora - beaconEnviadoReciente < 250) return true;
    beaconEnviadoReciente = ahora;
    if (timerDebounce) {
      clearTimeout(timerDebounce);
      timerDebounce = null;
    }
    return enviarBeaconSnapshot(obtenerSnapshot, {
      proyecto_id,
      alumno_id,
      endpoint,
      soloLectura: false,
      navigatorImpl,
      storage,
      fetchImpl
    });
  }

  const onPageHide = () => { ejecutarBeaconCierre(); };
  const onBeforeUnload = () => { ejecutarBeaconCierre(); };
  const onVisibilityChange = () => {
    const doc = win?.document ?? globalThis.document;
    if (doc?.visibilityState === 'hidden') ejecutarBeaconCierre();
  };

  if (typeof win?.addEventListener === 'function') {
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('beforeunload', onBeforeUnload);
    win.addEventListener('visibilitychange', onVisibilityChange);
  }

  const offBus = [];
  if (bus && typeof bus.on === 'function') {
    offBus.push(bus.on('objeto_colocado', () => notificarCambio()));
    offBus.push(bus.on('object_colocado', () => notificarCambio()));
    offBus.push(bus.on('diseno_cambiado', () => notificarCambio()));
  }

  timerIntervalo = setInterval(() => {
    void guardarAhora(false, 'intervalo');
  }, intervaloMs);
  if (timerIntervalo && typeof timerIntervalo.unref === 'function') timerIntervalo.unref();

  SLog.info('Guardado', `Autoguardado iniciado para ${proyecto_id}`);

  return {
    activo: true,
    soloLectura: false,
    proyecto_id,
    alumno_id: null,
    guardarAhora,
    notificarCambio,
    enviarBeacon: ejecutarBeaconCierre,
    ultimoSnapshot: () => ultimoSnap,
    detener() {
      if (timerIntervalo) { clearInterval(timerIntervalo); timerIntervalo = null; }
      if (timerDebounce) { clearTimeout(timerDebounce); timerDebounce = null; }
      if (typeof win?.removeEventListener === 'function') {
        win.removeEventListener('pagehide', onPageHide);
        win.removeEventListener('beforeunload', onBeforeUnload);
        win.removeEventListener('visibilitychange', onVisibilityChange);
      }
      while (offBus.length) {
        const off = offBus.pop();
        if (typeof off === 'function') off();
      }
    }
  };
}

