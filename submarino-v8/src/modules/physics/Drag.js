// Arrastre hidrodinámico cuadrático: F_d = -½·ρ·C_d·A·v·|v| (N), con C_d·A por eje.
export const arrastre = (rho, cdA, v) => -0.5 * rho * cdA * v * Math.abs(v);

/** Coeficiente de arrastre rotacional en guiñada (N·m·s²): τ = -k·|ω|·ω. */
export const kArrastreGuinada = (rho, cdLat, alturaM, largoM) => rho * cdLat * alturaM * Math.pow(largoM / 2, 4) / 4;
