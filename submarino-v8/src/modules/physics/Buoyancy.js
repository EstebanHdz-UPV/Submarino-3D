// Peso, empuje de Arquímedes y flotabilidad parcial en superficie.

/** Peso W = m·g (N). */
export const peso = (masaKg, g) => masaKg * g;

/** Fracción sumergida del casco (0..1) según la profundidad del centro y su semialtura. */
export function fraccionSumergida(profundidadCentroM, semialturaM) {
  // Un casco sin altura válida no tiene una fracción geométrica calculable.
  if (!Number.isFinite(semialturaM) || semialturaM <= 0) return profundidadCentroM >= 0 ? 1 : 0;
  if (!Number.isFinite(profundidadCentroM)) return 0;
  return Math.min(1, Math.max(0, (profundidadCentroM + semialturaM) / (2 * semialturaM)));
}

/** Empuje B = ρ·g·V_desplazado (N). */
export const empuje = (rho, g, volumenEnvolventeM3, fraccion) => rho * g * volumenEnvolventeM3 * fraccion;

/** Llenado de lastre (0..1) que da flotabilidad neutra con el submarino sumergido. */
export function llenadoNeutro({ rho, volumenEnvolventeM3, masaTotalSinLastreKg, tanqueM3 }) {
  if (tanqueM3 <= 0) return null;
  return (rho * volumenEnvolventeM3 - masaTotalSinLastreKg) / (rho * tanqueM3);
}
