/**
 * evaluacion.js
 * Motor de evaluación formativa y sumativa para el proyecto STEAM Submarino 3D.
 * Conecta con telemetria.js del Core para analizar muestras, eventos,
 * aciertos, fallos, inactividad y coordenadas, generando puntajes (D4).
 */

export const NIVELES_DESEMPENO = Object.freeze({
  EXCELENTE: { id: 4, nombre: 'Excelente', minimo: 85 },
  BUENO: { id: 3, nombre: 'Bueno', minimo: 70 },
  SUFICIENTE: { id: 2, nombre: 'Suficiente', minimo: 50 },
  INSUFICIENTE: { id: 1, nombre: 'Insuficiente', minimo: 0 }
});

export const PESOS_STEAM_DEFECTO = Object.freeze({
  M: 0.20, // Matemáticas
  S: 0.20, // Ciencias
  E: 0.25, // Ingeniería (ensamblaje y subsistemas)
  T: 0.20, // Tecnología (programación por bloques y pilotaje)
  A: 0.15  // Artes y Diseño (apreciación visual, cámaras y biomimética)
});

/**
 * Determina el nivel cualitativo a partir de un puntaje numérico 0-100.
 */
export function determinarNivel(puntaje) {
  const p = Math.max(0, Math.min(100, Number(puntaje) || 0));
  if (p >= NIVELES_DESEMPENO.EXCELENTE.minimo) return NIVELES_DESEMPENO.EXCELENTE.nombre;
  if (p >= NIVELES_DESEMPENO.BUENO.minimo) return NIVELES_DESEMPENO.BUENO.nombre;
  if (p >= NIVELES_DESEMPENO.SUFICIENTE.minimo) return NIVELES_DESEMPENO.SUFICIENTE.nombre;
  return NIVELES_DESEMPENO.INSUFICIENTE.nombre;
}

/**
 * Evalúa un buffer de telemetría o una instancia de Telemetry y genera puntajes completos.
 * @param {Array|Object} telemetriaOBuffer - Instancia de Telemetría o array de muestras/eventos.
 * @param {Object} [opciones={}] - Parámetros de ponderación y umbrales.
 * @returns {Object} Informe de evaluación con puntajes por dimensión y estadísticas.
 */
export function evaluarTelemetria(telemetriaOBuffer, opciones = {}) {
  const buffer = Array.isArray(telemetriaOBuffer)
    ? telemetriaOBuffer
    : (Array.isArray(telemetriaOBuffer?.buffer) ? telemetriaOBuffer.buffer : []);

  const proyecto_id = opciones.proyecto_id
    || telemetriaOBuffer?.proyectoId
    || 'submarino-exploracion-3d';

  const pesos = { ...PESOS_STEAM_DEFECTO, ...(opciones.pesos || {}) };

  // Separar muestras periódicas de eventos
  const eventos = [];
  const muestras = [];

  for (const item of buffer) {
    if (!item || typeof item !== 'object') continue;
    if (item.evento) {
      eventos.push(item);
    } else {
      muestras.push(item);
    }
  }

  // Métricas acumuladas de aciertos y fallos
  let totalAciertos = 0;
  let totalFallos = 0;

  for (const item of buffer) {
    if (typeof item.aciertos === 'number') totalAciertos = Math.max(totalAciertos, item.aciertos);
    if (typeof item.fallos === 'number') totalFallos = Math.max(totalFallos, item.fallos);
    if (item.acierto === true || item.exito === true) totalAciertos++;
    if (item.acierto === false || item.fallo === true || item.exito === false) totalFallos++;
  }

  // Análisis de inactividad
  let tiempoInactivoTotalS = 0;
  let muestrasInactivas = 0;
  let sumaInactividad = 0;

  for (const m of muestras) {
    const inact = Number(m.inactividadS ?? m.inactividad_s ?? 0);
    sumaInactividad += inact;
    if (m.inactivo || inact >= 10) muestrasInactivas++;
  }
  const inactividadPromedioS = muestras.length ? +(sumaInactividad / muestras.length).toFixed(2) : 0;
  const tasaActividadPct = muestras.length ? Math.round(((muestras.length - muestrasInactivas) / muestras.length) * 100) : 100;

  // Análisis de coordenadas (X, Y, Z) y distancia recorrida
  let distanciaRecorridaM = 0;
  let prevPos = null;
  const minCoord = { x: Infinity, y: Infinity, z: Infinity };
  const maxCoord = { x: -Infinity, y: -Infinity, z: -Infinity };
  let profundidadMaximaM = 0;

  for (const m of muestras) {
    const x = Number(m.x ?? m.coordenadas?.x ?? 0);
    const y = Number(m.y ?? m.coordenadas?.y ?? (m.depthM !== undefined ? -m.depthM : 0));
    const z = Number(m.z ?? m.coordenadas?.z ?? 0);
    const depth = Number(m.depthM ?? Math.abs(y));

    if (depth > profundidadMaximaM) profundidadMaximaM = depth;

    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      minCoord.x = Math.min(minCoord.x, x);
      minCoord.y = Math.min(minCoord.y, y);
      minCoord.z = Math.min(minCoord.z, z);
      maxCoord.x = Math.max(maxCoord.x, x);
      maxCoord.y = Math.max(maxCoord.y, y);
      maxCoord.z = Math.max(maxCoord.z, z);

      if (prevPos) {
        const dx = x - prevPos.x;
        const dy = y - prevPos.y;
        const dz = z - prevPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (Number.isFinite(d)) distanciaRecorridaM += d;
      }
      prevPos = { x, y, z };
    }
  }

  distanciaRecorridaM = +distanciaRecorridaM.toFixed(2);

  // Modos de cámara usados
  const camarasSet = new Set();
  for (const item of buffer) {
    const c = item.camara || item.camera;
    if (c && typeof c === 'string') camarasSet.add(c);
  }
  const camarasUsadas = Array.from(camarasSet);

  // ========================================================
  // EVALUACIÓN POR DIMENSIÓN STEAM
  // ========================================================

  // --- 1. Dimensión M: Matemáticas ---
  const evMat = eventos.filter((e) => e.evento === 'matematicas_intento');
  const matAciertos = evMat.filter((e) => e.exito !== false && e.valido !== false).length;
  const matFallos = evMat.filter((e) => e.exito === false || e.valido === false).length;
  let puntajeM = 0;
  if (evMat.length > 0) {
    const ratioExito = matAciertos / (evMat.length || 1);
    puntajeM = Math.round(ratioExito * 80 + (matAciertos >= 1 ? 20 : 0));
  } else {
    // Si no ha realizado cálculos aún, puntaje base inicial
    puntajeM = 50;
  }
  puntajeM = Math.max(0, Math.min(100, puntajeM));

  // --- 2. Dimensión S: Ciencias ---
  const evCiencia = eventos.filter((e) => e.evento === 'ciencia_intento');
  const colapsos = eventos.filter((e) => e.evento === 'colapso').length;
  const choques = eventos.filter((e) => e.evento === 'choque').length;
  const cienciaAciertos = evCiencia.filter((e) => e.exito !== false && e.valido !== false).length;
  let puntajeS = 0;
  if (evCiencia.length > 0) {
    const ratioCiencia = cienciaAciertos / (evCiencia.length || 1);
    puntajeS = Math.round(ratioCiencia * 70 + (colapsos === 0 ? 30 : 0));
  } else {
    puntajeS = colapsos === 0 ? 60 : 30;
  }
  if (choques > 3) puntajeS = Math.max(0, puntajeS - 15);
  puntajeS = Math.max(0, Math.min(100, puntajeS));

  // --- 3. Dimensión E: Ingeniería (Ensamblaje) ---
  const evObj = eventos.filter((e) => e.evento === 'objeto_colocado' || e.evento === 'object_colocado');
  const slotsColocados = new Set(evObj.map((e) => e.slotId).filter(Boolean));
  const cantidadObjetos = slotsColocados.size || evObj.length;
  // Con 5 componentes colocados se alcanza puntaje óptimo de ingeniería
  let puntajeE = Math.min(100, Math.round((cantidadObjetos / 5) * 100));
  if (cantidadObjetos === 0) puntajeE = 40; // tolerancia base si aún no ensambla

  // --- 4. Dimensión T: Tecnología (Programación y Pilotaje) ---
  const evProg = eventos.filter((e) => e.evento === 'programa_ejecutado');
  const progExitosos = evProg.filter((e) => e.exito !== false && e.ordenado !== false).length;
  let puntosProgramacion = 0;
  if (evProg.length > 0) {
    puntosProgramacion = progExitosos > 0 ? 50 : 20;
  } else {
    puntosProgramacion = 25;
  }
  let puntosPilotaje = 0;
  if (muestras.length > 0) {
    puntosPilotaje += Math.min(30, Math.round(distanciaRecorridaM * 2));
    puntosPilotaje += tasaActividadPct >= 70 ? 20 : 10;
  } else {
    puntosPilotaje = 25;
  }
  let puntajeT = Math.max(0, Math.min(100, puntosProgramacion + puntosPilotaje));

  // --- 5. Dimensión A: Artes y Diseño ---
  let puntosCamara = 0;
  if (camarasUsadas.length >= 3) puntosCamara = 50;
  else if (camarasUsadas.length === 2) puntosCamara = 40;
  else if (camarasUsadas.length === 1) puntosCamara = 25;
  else puntosCamara = 20;

  // Apreciación espacial (recorrido y profundidad explorada)
  let puntosEspaciales = 0;
  if (distanciaRecorridaM > 10 || profundidadMaximaM > 15) puntosEspaciales = 35;
  else if (distanciaRecorridaM > 0 || profundidadMaximaM > 0) puntosEspaciales = 20;
  else puntosEspaciales = 15;

  const evArtes = eventos.filter((e) => e.fase === 'A' || e.evento === 'biomimetica_completada');
  const puntosEntrega = evArtes.length > 0 ? 15 : 10;
  let puntajeA = Math.max(0, Math.min(100, puntosCamara + puntosEspaciales + puntosEntrega));

  // --- Puntaje Global Ponderado ---
  const puntajeGlobal = Math.round(
    puntajeM * pesos.M +
    puntajeS * pesos.S +
    puntajeE * pesos.E +
    puntajeT * pesos.T +
    puntajeA * pesos.A
  );

  const nivelGlobal = determinarNivel(puntajeGlobal);

  // Recomendaciones formativas
  const recomendaciones = [];
  if (puntajeM < 70) recomendaciones.push('Prueba calcular la presión hidrostática en la compuerta de cálculo (Fase M).');
  if (puntajeS < 70) recomendaciones.push('Ajusta el volumen o la masa para lograr flotabilidad neutra en el laboratorio de Arquímedes (Fase S).');
  if (puntajeE < 70) recomendaciones.push('Coloca al menos 5 componentes en el taller de ensamblaje 3D (Fase E).');
  if (puntajeT < 70) recomendaciones.push('Ordena los bloques de control en secuencia: Leer -> Comparar -> Ajustar (Fase T).');
  if (puntajeA < 70) recomendaciones.push('Explora el submarino usando diferentes cámaras (V: proa, órbita y seguimiento).');
  if (choques > 0) recomendaciones.push('Reduce el empuje en zonas de fondo rocoso para evitar colisiones y daños al casco.');
  if (colapsos > 0) recomendaciones.push('Evita superar la profundidad de diseño para prevenir colapso estructural.');
  if (recomendaciones.length === 0) {
    recomendaciones.push('¡Excelente desempeño STEAM! Has cumplido satisfactoriamente con los criterios de evaluación.');
  }

  const informe = {
    proyecto_id,
    ts: new Date().toISOString(),
    puntajeGlobal,
    nivel: nivelGlobal,
    aprobado: puntajeGlobal >= NIVELES_DESEMPENO.SUFICIENTE.minimo,
    dimensiones: {
      M: {
        nombre: 'Matemáticas',
        clave: 'M',
        puntaje: puntajeM,
        nivel: determinarNivel(puntajeM),
        intentos: evMat.length,
        aciertos: matAciertos,
        fallos: matFallos,
        peso: pesos.M
      },
      S: {
        nombre: 'Ciencias',
        clave: 'S',
        puntaje: puntajeS,
        nivel: determinarNivel(puntajeS),
        intentos: evCiencia.length,
        aciertos: cienciaAciertos,
        fallos: colapsos + choques,
        peso: pesos.S
      },
      E: {
        nombre: 'Ingeniería',
        clave: 'E',
        puntaje: puntajeE,
        nivel: determinarNivel(puntajeE),
        objetosColocados: cantidadObjetos,
        peso: pesos.E
      },
      T: {
        nombre: 'Tecnología',
        clave: 'T',
        puntaje: puntajeT,
        nivel: determinarNivel(puntajeT),
        programasEjecutados: evProg.length,
        programasExitosos: progExitosos,
        muestrasTelemetria: muestras.length,
        peso: pesos.T
      },
      A: {
        nombre: 'Artes y Diseño',
        clave: 'A',
        puntaje: puntajeA,
        nivel: determinarNivel(puntajeA),
        camarasUsadas,
        peso: pesos.A
      }
    },
    estadisticas: {
      totalMuestras: muestras.length,
      totalEventos: eventos.length,
      totalRegistros: buffer.length,
      aciertos: totalAciertos,
      fallos: totalFallos,
      tasaAciertosPct: (totalAciertos + totalFallos) > 0
        ? Math.round((totalAciertos / (totalAciertos + totalFallos)) * 100)
        : 100,
      inactividadPromedioS,
      tasaActividadPct,
      distanciaRecorridaM,
      profundidadMaximaM: +profundidadMaximaM.toFixed(2),
      camarasUsadas,
      coordenadasExtremas: Number.isFinite(minCoord.x) ? { min: minCoord, max: maxCoord } : null
    },
    recomendaciones
  };
  // E3: si se conoce el manifest, el informe trae el logro de cada objetivo evaluable declarado en él.
  if (opciones.manifest) informe.objetivos = calcularObjetivos(opciones.manifest, informe, { avance: opciones.avance });
  return informe;
}

/**
 * Función principal para generar puntajes a partir de una instancia de Telemetry o Telemetria.
 */
export function generarPuntajes(telemetria, opciones = {}) {
  return evaluarTelemetria(telemetria, opciones);
}

/**
 * Clase que envuelve y mantiene la evaluación en vivo vinculada a Telemetria.
 */
export class Evaluacion {
  constructor(telemetria = null, opciones = {}) {
    this.telemetria = telemetria;
    this.opciones = opciones;
    this.ultimoResultado = null;
  }

  conectar(telemetria) {
    this.telemetria = telemetria;
    return this;
  }

  generarPuntajes(opcionesExtras = {}) {
    this.ultimoResultado = evaluarTelemetria(this.telemetria, { ...this.opciones, ...opcionesExtras });
    return this.ultimoResultado;
  }

  obtenerPuntajes() {
    return this.ultimoResultado || this.generarPuntajes();
  }

  /** E3: objetivos evaluables del manifest con el último informe (o uno nuevo). */
  calcularObjetivos(manifest = this.opciones.manifest, opciones = {}) {
    return calcularObjetivos(manifest, this.obtenerPuntajes(), { avance: opciones.avance ?? this.opciones.avance });
  }
}

// ============================================================
// E3: OBJETIVOS EVALUABLES (leídos de manifest.json)
// ============================================================

export const DIMENSIONES_STEAM = Object.freeze(['M', 'S', 'E', 'T', 'A']);
export const UMBRAL_LOGRO_DEFECTO = 70; // nivel "Bueno" de la rúbrica

/**
 * Calcula el logro de cada objetivo evaluable declarado en `manifest.objetivos_evaluables`.
 * La fuente es SIEMPRE el manifest (no data/objectives.json, que son los objetivos técnicos del equipo).
 *
 * Cada objetivo del manifest declara qué dimensiones STEAM lo evidencian y cómo se combinan:
 *   { id, objetivo, indicador, evidencia, dimensiones: ['M','S'], regla: 'promedio' | 'minimo', umbral?: 70 }
 * Si un objetivo no trae `dimensiones`, se toman todas (M, S, E, T, A) con regla 'promedio'.
 *
 * @param {Object|Array} manifestUObjetivos - manifest.json completo o el arreglo objetivos_evaluables.
 * @param {Object} informe - resultado de evaluarTelemetria()/generarPuntajes() (usa informe.dimensiones).
 * @param {Object} [opciones] - { avance }: estado de /api/avance-rutas; una fase completada cuenta como evidencia.
 * @returns {Array<{id, objetivo, indicador, evidencia, dimensiones, regla, umbral, puntaje, nivel, estado, logrado, fasesCompletadas, faltan}>}
 */
export function calcularObjetivos(manifestUObjetivos, informe, { avance } = {}) {
  const lista = Array.isArray(manifestUObjetivos) ? manifestUObjetivos : manifestUObjetivos?.objetivos_evaluables;
  if (!Array.isArray(lista)) return [];
  const dims = informe?.dimensiones ?? {};
  const completadas = new Set(Array.isArray(avance?.completadas) ? avance.completadas : []);

  return lista.filter((o) => o && typeof o === 'object' && o.id).map((o) => {
    const dimensiones = (Array.isArray(o.dimensiones) && o.dimensiones.length ? o.dimensiones : DIMENSIONES_STEAM)
      .map((d) => String(d).toUpperCase()).filter((d) => DIMENSIONES_STEAM.includes(d));
    const regla = o.regla === 'minimo' ? 'minimo' : 'promedio';
    const umbral = Number.isFinite(o.umbral) ? o.umbral : UMBRAL_LOGRO_DEFECTO;
    const puntajes = dimensiones.map((d) => Number(dims[d]?.puntaje)).filter(Number.isFinite);
    const puntaje = puntajes.length === 0 ? 0
      : regla === 'minimo' ? Math.min(...puntajes)
        : Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length);
    const fasesCompletadas = dimensiones.filter((d) => completadas.has(d));
    const logrado = puntaje >= umbral;
    return {
      id: o.id,
      objetivo: o.objetivo,
      indicador: o.indicador,
      evidencia: o.evidencia,
      dimensiones,
      regla,
      umbral,
      puntaje,
      nivel: determinarNivel(puntaje),
      estado: logrado ? 'logrado' : puntaje >= NIVELES_DESEMPENO.SUFICIENTE.minimo ? 'en_proceso' : 'no_logrado',
      logrado,
      fasesCompletadas,
      faltan: dimensiones.filter((d) => Number(dims[d]?.puntaje) < umbral)
    };
  });
}

// ============================================================
// F3: RÚBRICA OFICIAL (data/rubrics.json)
// ============================================================

/**
 * Convierte los criterios de data/rubrics.json en pesos 0..1 por dimensión STEAM para evaluarTelemetria().
 * Valida que estén las cinco dimensiones y que los pesos sumen 100; si no, devuelve los pesos por defecto.
 */
export function pesosDesdeRubrica(rubrica) {
  const criterios = Array.isArray(rubrica?.criterios) ? rubrica.criterios : [];
  const pesos = {};
  for (const c of criterios) {
    const d = String(c?.dimension ?? '').toUpperCase();
    if (DIMENSIONES_STEAM.includes(d) && Number.isFinite(c.peso) && c.peso >= 0) pesos[d] = (pesos[d] ?? 0) + c.peso;
  }
  const suma = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (DIMENSIONES_STEAM.some((d) => !(d in pesos)) || Math.abs(suma - 100) > 1e-9) return { ...PESOS_STEAM_DEFECTO };
  return Object.fromEntries(DIMENSIONES_STEAM.map((d) => [d, pesos[d] / 100]));
}
