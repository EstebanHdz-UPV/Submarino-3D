// Validación independiente del estado físico para diagnósticos de misión y pruebas automatizadas.
// No reemplaza la calibración del modelo ni determina por sí sola la seguridad real de un vehículo.
const finiteFields = [
  't', 'depthM', 'speedMs', 'forwardMs', 'headingDeg', 'pitchDeg', 'rollDeg',
  'pressureAtm', 'powerW', 'energyWh', 'soc', 'massKg', 'ballastFill', 'ballastKg', 'floodKg'
];

/**
 * Revisa invariantes básicos del snapshot. Devuelve todos los problemas encontrados para
 * que la interfaz o la bitácora puedan mostrarlos juntos, en lugar de detenerse en el primero.
 * @param {object} state snapshot de PhysicsModule
 * @param {object} [limits] límites opcionales: maxDepthM, maxSpeedMs, maxPitchDeg, maxRollDeg
 * @returns {{ok:boolean, errors:string[], warnings:string[]}}
 */
export function validarEstadoFisico(state, limits = {}) {
  const errors = [];
  const warnings = [];
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { ok: false, errors: ['El estado debe ser un objeto snapshot.'], warnings };
  }

  for (const key of finiteFields) {
    if (!Number.isFinite(state[key])) errors.push(`${key} debe ser finito.`);
  }
  if (Array.isArray(state.pos) && !state.pos.every(Number.isFinite)) errors.push('pos debe contener coordenadas finitas.');
  if (state.depthM < -0.05) warnings.push('El centro del casco está por encima de la superficie.');
  if (state.speedMs < 0) errors.push('speedMs no puede ser negativo.');
  if (state.pressureAtm < 0.99) errors.push('La presión absoluta no puede ser menor que aproximadamente una atmósfera.');
  if (state.massKg <= 0) errors.push('La masa total debe ser positiva.');
  if (state.ballastFill < 0 || state.ballastFill > 1) errors.push('El llenado del lastre debe estar entre 0 y 1.');
  if (state.soc < 0 || state.soc > 1) errors.push('El estado de carga debe estar entre 0 y 1.');

  for (const [key, label] of [['maxDepthM', 'profundidad'], ['maxSpeedMs', 'velocidad'], ['maxPitchDeg', 'cabeceo'], ['maxRollDeg', 'balanceo']]) {
    const value = limits[key];
    if (value == null) continue;
    if (!Number.isFinite(value) || value < 0) errors.push(`El límite ${key} debe ser finito y no negativo.`);
    else if (Number.isFinite(state[({ maxDepthM: 'depthM', maxSpeedMs: 'speedMs', maxPitchDeg: 'pitchDeg', maxRollDeg: 'rollDeg' })[key]]) && Math.abs(state[({ maxDepthM: 'depthM', maxSpeedMs: 'speedMs', maxPitchDeg: 'pitchDeg', maxRollDeg: 'rollDeg' })[key]]) > value) {
      errors.push(`Se excedió el límite de ${label} (${value}).`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
