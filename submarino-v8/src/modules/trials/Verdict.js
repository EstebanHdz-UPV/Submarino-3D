// Dictamen: compara el resultado de la prueba con los criterios del escenario (data/scenarios.json).
import { KN } from '../../core/Units.js';
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');

export function evaluar(escenario, r, cond, stats) {
  const checks = escenario.criterios.map((c) => {
    let ok = false, detalle = '';
    switch (c.id) {
      case 'flota': ok = r.profundidadFinalM <= c.umbral; detalle = `Profundidad final ${f1(r.profundidadFinalM)} m`; break;
      case 'nivelado': ok = r.inclinacionMaxDeg <= c.umbral; detalle = `Inclinación máxima ${f1(r.inclinacionMaxDeg)}°`; break;
      case 'alcanza': ok = r.errorMinProfundidadM <= c.umbral; detalle = `Mínimo error de profundidad ${f1(r.errorMinProfundidadM)} m`; break;
      case 'mantiene': ok = Math.abs(r.profundidadFinalM - cond.profundidadM) <= c.umbral; detalle = `Profundidad final ${f1(r.profundidadFinalM)} m (objetivo ${cond.profundidadM} m)`; break;
      case 'sinColapso': ok = !r.colapso; detalle = r.colapso ? `Colapso de: ${r.piezaColapso}` : 'Sin colapso'; break;
      case 'seguridad': ok = r.factorSeguridadMin !== null && r.factorSeguridadMin >= c.umbral; detalle = r.factorSeguridadMin === null ? 'Sin datos' : `Factor de seguridad ${r.factorSeguridadMin.toFixed(2)} (pieza limitante: ${stats.limitante})`; break;
      case 'gira': ok = r.giroTotalDeg >= c.umbral; detalle = `Giro total ${f1(r.giroTotalDeg)}°`; break;
      case 'radio': ok = r.radioGiroM !== null && r.radioGiroM <= c.umbral * stats.largoM; detalle = r.radioGiroM === null ? 'No se pudo medir' : `Radio ${f1(r.radioGiroM)} m (largo ${f1(stats.largoM)} m)`; break;
      case 'energia': ok = stats.capacidadWh > 0 && r.energiaFinalPct > c.umbral; detalle = `Energía restante ${r.energiaFinalPct.toFixed(0)} %`; break;
      case 'velocidad': ok = r.velocidadMediaFinalMs >= c.umbral * (cond.velocidadNudos * KN); detalle = `Velocidad media ${(r.velocidadMediaFinalMs / KN).toFixed(2)} nudos (pedida ${cond.velocidadNudos})`; break;
      case 'posicion': ok = r.derivaFinalM <= c.umbral; detalle = `Deriva ${f1(r.derivaFinalM)} m`; break;
      case 'emerge': ok = r.profundidadFinalM <= c.umbral; detalle = `Profundidad final ${f1(r.profundidadFinalM)} m`; break;
      default: detalle = 'Criterio desconocido';
    }
    return { id: c.id, texto: c.texto, ok, detalle };
  });
  const aprobado = checks.length > 0 && checks.every((c) => c.ok);
  return { aprobado, checks };
}
