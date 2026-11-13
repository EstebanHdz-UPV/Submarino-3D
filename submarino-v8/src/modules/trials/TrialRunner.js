// Ejecuta un escenario sobre el diseño, sin dibujar, con el mismo paso fijo de la simulación.
import { PhysicsModule } from '../physics/PhysicsModule.js';
import { KN } from '../../core/Units.js';
import { presionManometricaPa } from '../physics/Pressure.js';
import { pilotoDe, programarEventos } from './Scenarios.js';
import { evaluar } from './Verdict.js';
import { puedeProbarse } from '../submarine/MissingParts.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const DEG = 180 / Math.PI;

/** Entorno físico a partir de las condiciones de la prueba y los ajustes. */
export function entornoDe(cond, ajustes = {}) {
  return { tipoAgua: ajustes.tipoAgua ?? 'mar', temperaturaC: cond.temperaturaC ?? 15, corrienteMs: cond.corrienteMs ?? 0, corrienteDirRad: Math.PI, modoSimplificado: !!ajustes.modoSimplificado };
}

/** Profundidad del centro del casco (m) cuando el submarino flota en reposo (0 si se hunde). */
export function caladoEquilibrio(stats) {
  if (!stats.casco) return 0;
  const fr = stats.masaSecaKg / (stats.rhoSuperficie * stats.volumenEnvolventeM3);
  return fr < 1 ? stats.semialturaM * (2 * fr - 1) : 0;
}

/**
 * @returns {Promise<object>} { ok, error?, escenario, cond, serie, resumen, eventos, dictamen }
 */
export async function ejecutarPrueba({ assembly, world, escenario, cond, ajustes = {}, onProgress }) {
  const env = entornoDe(cond, ajustes);
  const stats = assembly.stats(world, env);
  if (!puedeProbarse(stats)) return { ok: false, error: 'Sin casco no se puede probar.' };

  const tipo = escenario.tipo;
  const iniciaSumergido = ['maniobra', 'autonomia', 'corriente', 'emergencia'].includes(tipo);
  // En superficie arranca en el calado de equilibrio (si flota) para no medir el chapuzón inicial
  const inicioM = iniciaSumergido ? cond.profundidadM : caladoEquilibrio(stats);
  const phys = new PhysicsModule(world, env, stats, { startDepthM: inicioM });
  if (iniciaSumergido) phys.ballast.fill = Math.min(1, Math.max(0, phys.neutralFill() ?? 0));
  const piloto = pilotoDe(tipo, cond);
  const aplicarEventos = programarEventos(escenario.eventos);

  let dur = escenario.duracionS;
  if (tipo === 'profundidad') dur = Math.min(24000, Math.max(dur, 300 + cond.profundidadM / 0.2));
  const dt = world.pasoFijoS, steps = Math.round(dur / dt);

  const serie = { t: [], profundidadM: [], velocidadNudos: [], inclinacionDeg: [], energiaPct: [], potenciaW: [], llenadoLastre: [], presionAtm: [], empujeN: [] };
  let nextSample = 0, minErr = Infinity, tailPitch = 0, tailRoll = 0, headingPrev = phys.heading, giro = 0, lastSpeeds = [];
  const x0 = [...phys.pos];

  for (let i = 0; i < steps && !phys.colapsado; i++) {
    aplicarEventos(phys);
    const inp = piloto(phys, phys.t);
    phys.step(dt, inp);
    giro += wrap(phys.heading - headingPrev); headingPrev = phys.heading;
    minErr = Math.min(minErr, Math.abs(cond.profundidadM - phys.depth));
    if (phys.t > 20) { tailPitch = Math.max(tailPitch, Math.abs(phys.pitch) * DEG); tailRoll = Math.max(tailRoll, Math.abs(phys.roll) * DEG); }
    if (phys.t >= nextSample) {
      nextSample += dur > 3000 ? 5 : 1;
      const s = phys.snapshot();
      serie.t.push(s.t); serie.profundidadM.push(s.depthM); serie.velocidadNudos.push(s.forwardMs / KN); serie.inclinacionDeg.push(s.pitchDeg);
      serie.energiaPct.push(s.soc * 100); serie.potenciaW.push(s.powerW); serie.llenadoLastre.push(s.ballastFill); serie.presionAtm.push(s.pressureAtm); serie.empujeN.push(s.thrustN);
      if (phys.t > dur * 0.7) lastSpeeds.push(Math.abs(s.forwardMs));
    }
    if (onProgress && i % 20000 === 0) { onProgress(i / steps); await new Promise((r) => setTimeout(r, 0)); }
  }

  const sFin = phys.snapshot();
  const colEv = phys.events.find((e) => e.tipo === 'colapso');
  const dPmax = presionManometricaPa(world, env, phys.maxDepthM);
  const dPcol = presionManometricaPa(world, env, stats.profundidadColapsoM);
  const yawRate = Math.abs(phys.omega[2]);
  const resumen = {
    duracionS: phys.t, profundidadMaxM: phys.maxDepthM, profundidadFinalM: sFin.depthM, velocidadMaxNudos: phys.maxSpeedMs / KN,
    energiaUsadaWh: phys.battery.usedWh, energiaFinalWh: phys.battery.energyWh, energiaFinalPct: sFin.soc * 100,
    distanciaM: phys.distanceM, inclinacionMaxDeg: tailPitch, alabeoMaxDeg: tailRoll, errorMinProfundidadM: Number.isFinite(minErr) ? minErr : 0,
    factorSeguridadMin: dPmax > 0 ? dPcol / dPmax : null, colapso: phys.colapsado, piezaColapso: colEv?.pieza ?? null,
    giroTotalDeg: Math.abs(giro) * DEG, radioGiroM: yawRate > 0.002 ? Math.abs(phys.forwardSpeed) / yawRate : null,
    velocidadMediaFinalMs: lastSpeeds.length ? lastSpeeds.reduce((a, b) => a + b, 0) / lastSpeeds.length : 0,
    derivaFinalM: Math.hypot(phys.pos[0] - x0[0], phys.pos[1] - x0[1]), presionFinalAtm: sFin.pressureAtm,
    presionMaxAtm: (world.presionAtmosfericaPa + dPmax) / 101325, temperaturaC: env.temperaturaC
  };
  const dictamen = evaluar(escenario, resumen, cond, stats);
  return { ok: true, escenario, cond, env, stats, serie, resumen, eventos: phys.events, dictamen };
}
