// Consecuencias de piezas faltantes: el simulador NO bloquea la prueba; aplica efectos físicos reales.
/** Lista legible de consecuencias para mostrar antes de probar. severidad: 'bloqueo' | 'grave' | 'aviso' */
export function consecuencias(stats) {
  const out = [];
  if (stats.efectos.sinCasco) return [{ id: 'casco', severidad: 'bloqueo', mensaje: 'Sin casco no hay submarino: la prueba no se puede ejecutar.' }];
  for (const f of stats.faltantes) {
    const grave = f.obligatorio && ['propulsion', 'lastre', 'cabina', 'bateria', 'aletas'].includes(f.slot);
    out.push({ id: f.slot, severidad: grave ? 'grave' : 'aviso', mensaje: f.mensaje });
  }
  return out;
}
export const puedeProbarse = (stats) => !stats.efectos.sinCasco;

/** Masa máxima de agua que entra al casco abierto (sin cabina): 50 % de su volumen interior. */
export const inundacionMaxKg = (stats, rho) => (stats.casco ? 0.5 * stats.casco.volumenM3 * rho : 0);
