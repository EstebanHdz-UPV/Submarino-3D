// Esfuerzo del casco y colapso. MODELO SIMPLIFICADO (no es análisis de elementos finitos):
//  - Fluencia (membrana): cilindro σ = P·r/t ; esfera σ = P·r/(2t)
//  - Pandeo elástico: cilindro (von Mises, sin refuerzos) ; esfera (clásico) con factor de imperfección
//  - Presión de colapso = mínimo de ambos. Profundidad de diseño = colapso / factor de seguridad.
import { profundidadDesdePresion, presionManometricaPa } from './Pressure.js';

/** Presiones críticas (Pa) del casco para un material. */
export function presionesCriticasPa(casco, material, world) {
  const r = casco?.radioM, t = casco?.espesorM, L = casco?.largoM;
  const E = material?.moduloGPa * 1e9, nu = material?.poisson, sy = material?.limiteElasticoMPa * 1e6;
  if (![r, t, L, E, nu, sy].every(Number.isFinite) || r <= 0 || t <= 0 || L <= 0 || E <= 0 || sy <= 0 || nu <= -1 || nu >= 0.5) {
    throw new RangeError('Geometría del casco o propiedades del material inválidas para calcular presión crítica.');
  }
  if (casco.forma !== 'esfera' && L / (2 * r) - 0.45 * Math.sqrt(t / (2 * r)) <= 0) {
    throw new RangeError('La relación geométrica del cilindro no permite calcular pandeo de forma válida.');
  }
  let fluencia, pandeo;
  if (casco.forma === 'esfera') {
    fluencia = 2 * sy * t / r;
    pandeo = world.factorImperfeccionEsfera * 2 * E * Math.pow(t / r, 2) / Math.sqrt(3 * (1 - nu * nu));
  } else {
    const D = 2 * r;
    fluencia = sy * t / r;
    const denom = Math.pow(1 - nu * nu, 0.75) * (L / D - 0.45 * Math.sqrt(t / D));
    pandeo = world.factorImperfeccionCilindro * 2.42 * E * Math.pow(t / D, 2.5) / denom;
  }
  const colapso = Math.min(fluencia, pandeo);
  return { fluencia, pandeo, colapso, modo: fluencia <= pandeo ? 'fluencia' : 'pandeo' };
}

/** Profundidad de colapso (m) y de diseño (m) del casco. */
export function profundidadesCasco(casco, material, world, env) {
  const p = presionesCriticasPa(casco, material, world);
  const colapsoM = profundidadDesdePresion(world, env, p.colapso);
  return { ...p, colapsoM, disenoM: colapsoM / world.factorSeguridad };
}

/** Esfuerzo de membrana (Pa) a una profundidad. */
export function esfuerzoMembranaPa(casco, world, env, depthM) {
  const P = presionManometricaPa(world, env, depthM);
  return casco.forma === 'esfera' ? P * casco.radioM / (2 * casco.espesorM) : P * casco.radioM / casco.espesorM;
}

/**
 * Razón de esfuerzo (0..>1; 1 = presión de colapso) por sección del casco, para el mapa de colores.
 * Las uniones y tapas concentran esfuerzo (factor simplificado).
 */
export function seccionesEsfuerzo(casco, colapsoPa, world, env, depthM, n = 12) {
  if (!Number.isFinite(colapsoPa) || colapsoPa <= 0) return Array.from({ length: Math.max(0, Math.floor(n) || 0) }, () => Infinity);
  n = Number.isFinite(n) ? Math.max(1, Math.min(256, Math.floor(n))) : 12;
  const base = presionManometricaPa(world, env, depthM) / colapsoPa;
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * 2 - 1; // -1 (popa) .. +1 (proa)
    const cerca = Math.pow(Math.abs(x), 4); // más en los extremos
    const uniones = [-0.9, 0, 0.55].reduce((m, c) => Math.max(m, Math.exp(-Math.pow((x - c) / 0.12, 2))), 0);
    out.push(base * (1 + 0.35 * cerca + 0.15 * uniones));
  }
  return out;
}
