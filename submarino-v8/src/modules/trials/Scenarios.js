// Pilotos automáticos de cada escenario: reciben el estado de la física y devuelven las órdenes (input).
import { KN } from '../../core/Units.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Mantiene profundidad: posición objetivo del lastre = llenado neutro + corrección PD (en fuerza). */
export function mantenerProfundidad(phys, objetivoM) {
  const fn = phys.neutralFill();
  if (fn === null) return {};
  const m = phys.meffVertical(), wn = 0.08, zeta = 1.5;
  const e = objetivoM - phys.depth, vDown = -phys.vel[2];
  const dF = m * wn * wn * e - 2 * zeta * m * wn * vDown; // N hacia abajo
  const rho = phys.rho(), g = phys.w.gravedad;
  return { ballastTarget: clamp(fn + dF / (rho * g * phys.s.tanqueM3), 0, 1) };
}

/** Mantiene velocidad de avance respecto al agua. */
export function mantenerVelocidad(phys, vObjMs) {
  if (phys.s.empujeMaxN <= 0) return { throttle: 0 };
  const vf = phys.forwardSpeed;
  const tff = -phys.dragForward(vObjMs);
  return { throttle: clamp((tff + phys.meffForward() * 0.4 * (vObjMs - vf)) / phys.s.empujeMaxN, -1, 1) };
}

/** Mantiene el rumbo con el timón (rumbo en rad, 0 = dirección inicial). */
export function mantenerRumbo(phys, rumbo = 0) {
  const err = wrap(rumbo - phys.heading);
  const r = phys.omega[2];
  return { rudder: clamp(-1.1 * err + 5 * r, -1, 1) };
}

/** Mantiene la posición horizontal contra una corriente. */
export function mantenerPosicion(phys) {
  if (phys.s.empujeMaxN <= 0) return { throttle: 0 };
  const cur = phys.waterVelocity(), f = phys.R[0];
  const curF = cur[0] * f[0] + cur[1] * f[1];
  const vg = phys.vel[0] * f[0] + phys.vel[1] * f[1];
  const x = phys.pos[0] * f[0] + phys.pos[1] * f[1];
  const vgDes = clamp(-0.3 * x, -0.5, 0.5);
  const T = -phys.dragForward(phys.forwardSpeed - curF) + phys.meffForward() * 1.0 * (vgDes - vg);
  return { throttle: clamp(T / phys.s.empujeMaxN, -1, 1) };
}

/**
 * Eventos programados del escenario (data/scenarios.json › eventos: [{ t, accion }]).
 * Devuelve una función que, llamada en cada paso ANTES del piloto, inyecta una sola vez los eventos ya vencidos.
 */
export function programarEventos(eventos = []) {
  const pendientes = [...eventos].sort((a, b) => a.t - b.t);
  return (phys) => { while (pendientes.length && phys.t >= pendientes[0].t) phys.inject(pendientes.shift().accion); };
}

/** Piloto por tipo de escenario: solo devuelve órdenes, nunca modifica la física. */
export function pilotoDe(tipo, cond) {
  const vObj = (cond.velocidadNudos ?? 0) * KN;
  switch (tipo) {
    case 'flotabilidad': return () => ({});
    case 'profundidad': return (p) => mantenerProfundidad(p, cond.profundidadM);
    case 'maniobra': return (p) => ({ ...mantenerProfundidad(p, cond.profundidadM), ...mantenerVelocidad(p, vObj), rudder: 1 });
    case 'autonomia': return (p) => ({ ...mantenerProfundidad(p, cond.profundidadM), ...mantenerVelocidad(p, vObj), ...mantenerRumbo(p, 0) });
    case 'corriente': return (p) => ({ ...mantenerProfundidad(p, cond.profundidadM), ...mantenerPosicion(p), ...mantenerRumbo(p, 0) });
    // Mantiene profundidad hasta que el escenario provoca la falla de energía; entonces sopla el lastre.
    case 'emergencia': return (p) => (p.fallaEnergia ? { blow: true, throttle: 0 } : mantenerProfundidad(p, cond.profundidadM));
    default: return () => ({});
  }
}
