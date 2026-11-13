import { SLog } from './SLog.js';
import { generarPuntajes } from './evaluacion.js';

/**
 * Eventos estandarizados de telemetría y evaluación (D1).
 */
export const EVENTOS_ESTANDARIZADOS = Object.freeze({
  MATEMATICAS_INTENTO: 'matematicas_intento',
  CIENCIA_INTENTO: 'ciencia_intento',
  OBJETO_COLOCADO: 'objeto_colocado',
  PROGRAMA_EJECUTADO: 'programa_ejecutado'
});

/**
 * Telemetría local (Telemetry / Telemetria):
 * - Muestreo periódico y buffer en memoria (JSONL).
 * - D2: proyecto_id y dimension_steam en cada muestra.
 * - D3: aciertos/fallos, inactividad, coordenadas (X, Y, Z) y cámara.
 * - D4: conexión con motor de evaluacion.js para generar puntajes.
 */
export class Telemetry {
  constructor({
    endpoint = '/api/telemetry',
    intervalMs = 500,
    batchSize = 20,
    maxBuffer = 1200,
    proyecto_id = 'submarino-exploracion-3d',
    dimension_steam = 'T',
    dimensionSTEAM = null,
    camara = 'taller',
    umbralInactividadS = 10,
    aciertos = 0,
    fallos = 0
  } = {}) {
    this.endpoint = endpoint;
    this.intervalMs = Math.max(1, Number(intervalMs) || 500);
    this.batchSize = Math.max(1, Math.floor(Number(batchSize) || 20));
    this.maxBuffer = Math.max(1, Math.floor(Number(maxBuffer) || 1200));
    this.proyectoId = String(proyecto_id || 'submarino-exploracion-3d');
    this.dimensionSTEAM = String(dimension_steam || dimensionSTEAM || 'T').toUpperCase();
    this.aciertos = Math.max(0, Number(aciertos) || 0);
    this.fallos = Math.max(0, Number(fallos) || 0);
    this.ultimoInputMs = performance.now();
    this.umbralInactividadS = Math.max(1, Number(umbralInactividadS) || 10);
    this.camaraActual = String(camara || 'taller');
    this.coordenadasActuales = { x: 0, y: 0, z: 0 };
    this.last = -Infinity;
    this.buffer = [];
    this.pending = [];
    this.inFlight = false;
    this.serverOk = true;
  }

  /** D2: Establece la dimensión STEAM activa ('M', 'S', 'E', 'T', 'A'). */
  setDimensionSTEAM(dimension) {
    if (typeof dimension === 'string' && dimension.trim()) {
      this.dimensionSTEAM = dimension.trim().toUpperCase();
    }
    return this.dimensionSTEAM;
  }
  setDimension(d) { return this.setDimensionSTEAM(d); }

  /** D3: Registra un acierto e incrementa el contador. */
  registrarAcierto(detalle = {}) {
    this.aciertos++;
    if (detalle && typeof detalle === 'object' && detalle.evento) {
      this.event(detalle.evento, { acierto: true, exito: true, ...detalle });
    }
    return this.aciertos;
  }

  /** D3: Registra un fallo o error e incrementa el contador. */
  registrarFallo(detalle = {}) {
    this.fallos++;
    if (detalle && typeof detalle === 'object' && detalle.evento) {
      this.event(detalle.evento, { acierto: false, fallo: true, exito: false, ...detalle });
    }
    return this.fallos;
  }

  /** D3: Registra actividad del usuario para restablecer el cronómetro de inactividad. */
  registrarActividad(nowMs = performance.now()) {
    this.ultimoInputMs = Number(nowMs) || performance.now();
  }

  /** D3: Devuelve los segundos transcurridos de inactividad. */
  obtenerInactividadS(nowMs = performance.now()) {
    const t = Number(nowMs) || performance.now();
    if (!Number.isFinite(t) || !Number.isFinite(this.ultimoInputMs)) return 0;
    return Math.max(0, +((t - this.ultimoInputMs) / 1000).toFixed(2));
  }

  /** D3: Actualiza el modo de cámara actual. */
  setCamara(modo) {
    if (typeof modo === 'string' && modo.trim()) {
      this.camaraActual = modo.trim();
    }
    return this.camaraActual;
  }

  /** D3: Actualiza las coordenadas actuales (X, Y, Z). */
  setCoordenadas(x, y, z) {
    this.coordenadasActuales = {
      x: Number.isFinite(x) ? +Number(x).toFixed(2) : (this.coordenadasActuales.x || 0),
      y: Number.isFinite(y) ? +Number(y).toFixed(2) : (this.coordenadasActuales.y || 0),
      z: Number.isFinite(z) ? +Number(z).toFixed(2) : (this.coordenadasActuales.z || 0)
    };
    return this.coordenadasActuales;
  }

  /**
   * Registra una muestra periódica en el buffer si pasó el intervalo (D2 + D3).
   */
  record(sample, nowMs = performance.now()) {
    if (!sample || typeof sample !== 'object' || Array.isArray(sample)) return false;
    if (!Number.isFinite(nowMs) || nowMs - this.last < this.intervalMs) return false;
    this.last = nowMs;

    const inactividadS = typeof sample.inactividadS === 'number'
      ? +sample.inactividadS.toFixed(2)
      : (typeof sample.inactividad_s === 'number' ? +sample.inactividad_s.toFixed(2) : this.obtenerInactividadS(nowMs));
    const inactivo = sample.inactivo !== undefined
      ? Boolean(sample.inactivo)
      : (inactividadS >= this.umbralInactividadS);

    const x = Number(sample.x ?? sample.coordenadas?.x ?? this.coordenadasActuales.x ?? 0);
    const y = Number(sample.y ?? sample.coordenadas?.y ?? (sample.depthM !== undefined ? -sample.depthM : this.coordenadasActuales.y ?? 0));
    const z = Number(sample.z ?? sample.coordenadas?.z ?? this.coordenadasActuales.z ?? 0);
    this.coordenadasActuales = { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) };

    const camara = String(sample.camara || sample.camera || this.camaraActual || 'taller');
    this.camaraActual = camara;

    const dimension_steam = String(sample.dimension_steam || sample.dimensionSTEAM || sample.dimension || this.dimensionSTEAM || 'T').toUpperCase();
    const aciertos = typeof sample.aciertos === 'number' ? sample.aciertos : this.aciertos;
    const fallos = typeof sample.fallos === 'number' ? sample.fallos : this.fallos;

    const muestraCompleta = {
      ts: new Date().toISOString(),
      proyecto_id: this.proyectoId,
      dimension_steam,
      dimensionSTEAM: dimension_steam,
      aciertos,
      fallos,
      inactividadS,
      inactivo,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      z: +z.toFixed(2),
      coordenadas: { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) },
      camara,
      ...sample
    };

    this.#push(muestraCompleta);
    if (this.pending.length >= this.batchSize) void this.flush();
    return true;
  }

  /**
   * Registra un evento importante sin aplicar el límite de intervalo.
   */
  event(tipo, detalle = {}) {
    if (!tipo || typeof tipo !== 'string') return false;

    if (detalle.acierto === true || detalle.exito === true) {
      this.aciertos++;
    } else if (detalle.acierto === false || detalle.exito === false || detalle.fallo === true) {
      this.fallos++;
    }

    const dimension_steam = String(
      detalle.dimension_steam || detalle.dimensionSTEAM || detalle.dimension || this.#dimensionPorEvento(tipo) || this.dimensionSTEAM
    ).toUpperCase();

    const inactividadS = typeof detalle.inactividadS === 'number' ? +detalle.inactividadS.toFixed(2) : this.obtenerInactividadS();
    const x = Number(detalle.x ?? detalle.coordenadas?.x ?? this.coordenadasActuales.x ?? 0);
    const y = Number(detalle.y ?? detalle.coordenadas?.y ?? this.coordenadasActuales.y ?? 0);
    const z = Number(detalle.z ?? detalle.coordenadas?.z ?? this.coordenadasActuales.z ?? 0);
    const camara = String(detalle.camara || this.camaraActual || 'taller');

    const s = {
      ts: new Date().toISOString(),
      proyecto_id: this.proyectoId,
      dimension_steam,
      dimensionSTEAM: dimension_steam,
      evento: tipo,
      aciertos: this.aciertos,
      fallos: this.fallos,
      inactividadS,
      inactivo: inactividadS >= this.umbralInactividadS,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      z: +z.toFixed(2),
      coordenadas: { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) },
      camara,
      ...detalle
    };

    this.#push(s);
    SLog.info('Telemetry', `Evento ${tipo}`, detalle);
    if (this.pending.length >= this.batchSize) void this.flush();
    return true;
  }

  #dimensionPorEvento(tipo) {
    if (tipo === 'matematicas_intento') return 'M';
    if (tipo === 'ciencia_intento') return 'S';
    if (tipo === 'objeto_colocado' || tipo === 'object_colocado') return 'E';
    if (tipo === 'programa_ejecutado') return 'T';
    if (tipo === 'biomimetica_completada') return 'A';
    return null;
  }

  /** D1: Registra un intento en las actividades de matemáticas (Fase M / Cuestionarios). */
  matematicasIntento(detalle = {}) {
    return this.event(EVENTOS_ESTANDARIZADOS.MATEMATICAS_INTENTO, detalle);
  }

  /** D1: Registra un intento en las actividades de ciencias / Arquímedes (Fase S / Cuestionarios). */
  cienciaIntento(detalle = {}) {
    return this.event(EVENTOS_ESTANDARIZADOS.CIENCIA_INTENTO, detalle);
  }

  /** D1: Registra la colocación de un componente en el submarino (Fase E / Taller). */
  objetoColocado(detalle = {}) {
    return this.event(EVENTOS_ESTANDARIZADOS.OBJETO_COLOCADO, detalle);
  }

  /** D1: Registra la ejecución de un programa por bloques de control (Fase T). */
  programaEjecutado(detalle = {}) {
    return this.event(EVENTOS_ESTANDARIZADOS.PROGRAMA_EJECUTADO, detalle);
  }

  /** D4: Conecta con evaluacion.js para generar puntajes basados en los datos registrados. */
  generarPuntajes(opciones = {}) {
    return generarPuntajes(this, opciones);
  }

  /** D4: Alias de generarPuntajes para evaluación general. */
  evaluar(opciones = {}) {
    return this.generarPuntajes(opciones);
  }

  #push(sample) {
    const dimension_steam = sample.dimension_steam || sample.dimensionSTEAM || this.dimensionSTEAM || 'T';
    const item = {
      proyecto_id: this.proyectoId,
      dimension_steam,
      dimensionSTEAM: dimension_steam,
      ...sample
    };
    this.buffer.push(item);
    if (this.buffer.length > this.maxBuffer) this.buffer.splice(0, this.buffer.length - this.maxBuffer);
    this.pending.push(item);
  }

  /** Envía el lote pendiente con navigator.sendBeacon al cerrar la pestaña. */
  flushBeacon(navigatorImpl = globalThis.navigator) {
    if (!this.pending.length) return false;
    if (navigatorImpl && typeof navigatorImpl.sendBeacon === 'function') {
      try {
        const body = this.pending.map((s) => JSON.stringify(s)).join('\n');
        const payload = typeof Blob === 'function' ? new Blob([body], { type: 'application/x-ndjson' }) : body;
        if (navigatorImpl.sendBeacon(this.endpoint, payload)) {
          this.pending.length = 0;
          return true;
        }
      } catch { /* usar flush normal como respaldo */ }
    }
    void this.flush();
    return false;
  }

  /** Envía un lote. Los fallos no descartan los datos y se pueden reintentar. */
  async flush() {
    if (!this.pending.length || this.inFlight) return false;
    const batch = this.pending.splice(0, this.pending.length);
    this.inFlight = true;
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: batch.map((s) => JSON.stringify(s)).join('\n'),
        keepalive: true
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.serverOk = true;
      return true;
    } catch (e) {
      // Mantiene el orden y conserva lo que se haya acumulado durante la petición.
      this.pending = [...batch, ...this.pending];
      this.serverOk = false;
      SLog.warn('Telemetry', 'No se pudo enviar la telemetría; los datos quedan pendientes para reintento', e.message);
      return false;
    } finally {
      this.inFlight = false;
    }
  }

  /** Descarga el buffer local como JSONL. */
  exportJSONL() {
    const blob = new Blob([this.buffer.map((s) => JSON.stringify(s)).join('\n')], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `telemetria-${Date.now()}.jsonl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
