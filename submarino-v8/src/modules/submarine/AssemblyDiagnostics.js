// Diagnóstico de montaje y estimación de consecuencias para el taller.
export function diagnosticarEnsamblaje(stats) {
  if (!stats?.casco) return { seguro: false, nivel: 'bloqueado', alertas: ['Falta el casco; no se puede evaluar el conjunto.'], desequilibrio: 0 };
  const alertas = [];
  const abs = (v) => Math.abs(Number(v) || 0);
  const cg = stats.cgM ?? [0, 0, 0];
  const profundidadCasco = stats.casco.disenoM || stats.profundidadDisenoM;
  if (stats.flotabilidadNetaKg < 0) alertas.push(`Flotabilidad negativa: ${stats.flotabilidadNetaKg.toFixed(1)} kg; el conjunto tiende a hundirse con lastre vacío.`);
  if (stats.llenadoNeutro !== null && (stats.llenadoNeutro < 0 || stats.llenadoNeutro > 1)) alertas.push('El tanque no puede compensar la masa para alcanzar flotabilidad neutra.');
  if (stats.gmTransM <= 0 || stats.gmLongM <= 0 || stats.bgM <= 0) alertas.push('Pérdida de estabilidad: centro de gravedad alto o margen metacéntrico no positivo.');
  if (abs(stats.trimadoDeg) > 5) alertas.push(`Desequilibrio longitudinal: trimado estimado de ${stats.trimadoDeg.toFixed(1)}°.`);
  if (abs(cg[1]) > stats.radioM * 0.18) alertas.push('Desequilibrio lateral: el centro de gravedad está desplazado hacia un costado.');
  if (stats.componentesFisicos?.some(p => p.profundidadDisenoM && p.profundidadDisenoM < profundidadCasco)) alertas.push('Hay componentes con profundidad de diseño inferior a la del conjunto.');
  if (stats.faltantes?.some(x => x.obligatorio)) alertas.push('Faltan componentes obligatorios; el ensamblaje no está completo.');
  const nivel = alertas.some(x => /Pérdida|Flotabilidad negativa|no puede compensar/i.test(x)) ? 'peligro' : alertas.length ? 'precaucion' : 'seguro';
  return { seguro: nivel === 'seguro' && stats.completo, nivel, alertas, desequilibrio: Math.hypot(...cg), centroGravedadM: [...cg], gmLongM: stats.gmLongM, gmTransM: stats.gmTransM };
}

/** Ejecuta una prueba reproducible con el motor dinámico, en condición nominal o con fallas inducidas. */
export function ejecutarPruebaFisica(PhysicsModule, world, env, stats, { fallas = false, segundos = 20 } = {}) {
  if (!stats?.casco) throw new Error('Coloca un casco antes de ejecutar la prueba.');
  const fill = stats.llenadoNeutro == null ? 0 : Math.max(0, Math.min(1, stats.llenadoNeutro));
  const phys = new PhysicsModule(world, env, stats, {
    startDepthM: 8, fill,
    faults: fallas ? { fugaKgS: 0.45, rollRateRadS: 0.035, pitchRateRadS: 0.025 } : {}
  });
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(segundos / dt); i++) {
    phys.step(dt, { throttle: fallas ? 0.15 : 0.2, power: true });
    if (phys.colapsado) break;
  }
  const end = phys.snapshot();
  return { segundos: end.t, masaFinalKg: end.massKg, inundacionKg: end.floodKg, rollDeg: end.rollDeg, pitchDeg: end.pitchDeg, profundidadM: end.depthM, colapsado: end.colapsado, eventos: [...phys.events] };
}
