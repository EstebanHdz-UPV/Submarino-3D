// Estabilidad: par restaurador por separación entre centro de gravedad (CG) y de flotación (CB).

/** Par de empuje sobre el CG, en ejes del cuerpo: τ = (r_cb − r_cg) × F_b. Ejes: [adelante, izquierda, arriba]. */
export function parEmpuje(rCb, rCg, fbBody) {
  const r = [rCb[0] - rCg[0], rCb[1] - rCg[1], rCb[2] - rCg[2]];
  return [r[1] * fbBody[2] - r[2] * fbBody[1], r[2] * fbBody[0] - r[0] * fbBody[2], r[0] * fbBody[1] - r[1] * fbBody[0]];
}

/** Altura metacéntrica aproximada GM = BG (sumergido) + BM (en superficie, por el plano de flotación). */
export function alturaMetacentrica({ bgM, largoM, anchoM, volumenSumergidoM3, fraccion }) {
  const peso = 4 * fraccion * (1 - fraccion); // 1 con el casco a medio sumergir
  const bm = volumenSumergidoM3 > 0 ? (largoM * Math.pow(anchoM, 3) / 12) / volumenSumergidoM3 : 0;
  return bgM + peso * bm;
}
