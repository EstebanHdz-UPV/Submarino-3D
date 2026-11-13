import { SLog } from './SLog.js';

/** Carga un JSON; si falla lanza un error descriptivo y lo registra en SLog. */
export async function loadJSON(path) {
  let res;
  try { res = await fetch(path, { cache: 'no-cache' }); }
  catch (e) { SLog.error('Config', `No se pudo leer ${path}`, e.message); throw new Error(`No se pudo leer ${path}`); }
  if (!res.ok) { SLog.error('Config', `HTTP ${res.status} en ${path}`); throw new Error(`No se pudo cargar ${path} (HTTP ${res.status})`); }
  try {
    const data = await res.json();
    SLog.info('Config', `Cargado ${path}`);
    return data;
  } catch (e) {
    SLog.error('Config', `JSON mal formado en ${path}`, e.message);
    throw new Error(`JSON mal formado en ${path}: ${e.message}`);
  }
}

/** Comprueba que existan las claves esperadas; registra un error si falta alguna. */
export function requireKeys(obj, keys, label) {
  const missing = keys.filter((k) => !(k in obj));
  if (missing.length) {
    SLog.error('Config', `${label}: faltan claves`, missing);
    throw new Error(`${label}: faltan claves ${missing.join(', ')}`);
  }
  return obj;
}

/** Carga todos los datos del proyecto indicados en manifest.json. */
export async function loadAll() {
  const manifest = await loadJSON('manifest.json');
  const d = manifest.data;
  const [physics, materials, parts, rules, scenarios, i18n, libroPiezas, libroMateriales] = await Promise.all([
    loadJSON(d.physics), loadJSON(d.materials), loadJSON(d.parts), loadJSON(d.assemblyRules),
    loadJSON(d.scenarios), loadJSON(d.i18n), loadJSON(d.bookParts), loadJSON(d.bookMaterials)
  ]);
  requireKeys(physics, ['gravedad', 'presionAtmosfericaPa', 'agua', 'perfilMar', 'factorSeguridad', 'modelo'], 'physics.json');
  requireKeys(physics.modelo, ['tasaInundacionKgS', 'fraccionMinimaHelice', 'exponentePotenciaEmpuje', 'potenciaLateralRel', 'empujeLateralRel', 'razonAmortiguamientoOlas', 'fraccionMinimaVolumen', 'factorRestauracionSuperficie', 'gmMinimoM', 'amortiguamientoGuinadaLineal', 'densidadReferenciaKgM3', 'omegaMaxRadS', 'alertaProfundidadFrac'], 'physics.json › modelo');
  requireKeys(materials, ['materiales'], 'materials.json');
  requireKeys(parts, ['tipos', 'piezas'], 'parts.json');
  requireKeys(rules, ['slots'], 'assembly-rules.json');
  requireKeys(scenarios, ['escenarios'], 'scenarios.json');
  const UMBRAL_OBLIGATORIO = ['flota', 'nivelado', 'alcanza', 'mantiene', 'seguridad', 'gira', 'radio', 'energia', 'velocidad', 'posicion', 'emerge'];
  for (const e of scenarios.escenarios) for (const ev of e.eventos ?? []) {
    if (!Number.isFinite(ev.t) || ev.t < 0 || typeof ev.accion !== 'string') throw new Error(`scenarios.json: evento inválido en "${e.id}" (se necesita "t" ≥ 0 y "accion")`);
  }
  for (const e of scenarios.escenarios) for (const c of e.criterios ?? []) {
    if (UMBRAL_OBLIGATORIO.includes(c.id) && !Number.isFinite(c.umbral)) throw new Error(`scenarios.json: el criterio "${c.id}" de "${e.id}" necesita "umbral" numérico`);
  }
  // F3: la rúbrica oficial define pesos y niveles de la evaluación. Si falta, la app sigue con los valores por defecto.
  const rubrica = d.rubrics ? await loadJSON(d.rubrics).catch(() => null) : null;
  return { manifest, rubrica, physics, materials: materials.materiales, parts: parts.piezas, partTypes: parts.tipos, rules, scenarios: scenarios.escenarios, i18n, books: { piezas: libroPiezas, materiales: libroMateriales } };
}
