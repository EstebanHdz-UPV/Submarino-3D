// Presión hidrostática y densidad del agua (unidades SI).
const interp = (xs, ys, x) => {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length === 0 || xs.length !== ys.length) return NaN;
  if (!Number.isFinite(x)) x = 0;
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) { const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); }
  }
  return ys[ys.length - 1];
};

/** Densidad del agua (kg/m³) a una profundidad, según tipo de agua y temperatura. */
export function densidadAgua(world, env = {}, depthM = 0) {
  const tipo = world?.agua?.[env.tipoAgua ?? 'mar'] ?? world?.agua?.mar;
  const base = tipo?.densidadSuperficieKgM3;
  if (!Number.isFinite(base) || base <= 0) throw new RangeError('La densidad superficial del agua debe ser positiva y finita.');
  if (!Number.isFinite(depthM)) depthM = 0;
  if (world.modoSimplificado || env.modoSimplificado) return base;
  const p = world.perfilMar;
  const rhoProfile = interp(p?.profundidadM, p?.densidadKgM3, Math.max(0, depthM));
  if (!Number.isFinite(rhoProfile) || rhoProfile <= 0) throw new RangeError('El perfil de densidad del agua no es válido.');
  const rho = rhoProfile * (base / 1025);
  const dT = (env.temperaturaC ?? p.temperaturaC[0]) - p.temperaturaC[0];
  return rho * (1 - world.coefTermicoDensidad * dT);
}

/** Presión manométrica (sobre la atmosférica): ΔP = ρ_prom·g·h. */
export function presionManometricaPa(world, env, depthM) {
  const h = Number.isFinite(depthM) ? Math.max(0, depthM) : 0;
  if (h === 0) return 0;
  const avg = (densidadAgua(world, env, 0) + 4 * densidadAgua(world, env, h / 2) + densidadAgua(world, env, h)) / 6;
  return avg * world.gravedad * h;
}

/** Presión absoluta: P = P_atm + ρ·g·h. */
export const presionAbsolutaPa = (world, env, depthM) => world.presionAtmosfericaPa + presionManometricaPa(world, env, depthM);

export const pascalAAtm = (pa) => pa / 101325;

/** Profundidad (m) que produce una presión manométrica dada (bisección). */
export function profundidadDesdePresion(world, env, pManoPa) {
  if (!Number.isFinite(pManoPa) || pManoPa <= 0) return 0;
  let lo = 0, hi = 20000;
  if (presionManometricaPa(world, env, hi) < pManoPa) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (presionManometricaPa(world, env, mid) < pManoPa) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
