// Masa añadida e inercia (el agua acelerada junto con el casco).

/** Masa efectiva por eje (kg): m + k·ρ·V. Los coeficientes k vienen de physics.json. */
export function masaEfectiva(masaKg, rho, volumenEnvolventeM3, k) {
  if (![masaKg, rho, volumenEnvolventeM3, k?.avance, k?.lateral, k?.vertical].every(Number.isFinite) || masaKg <= 0 || rho < 0 || volumenEnvolventeM3 < 0 || k.avance < 0 || k.lateral < 0 || k.vertical < 0) {
    throw new RangeError('Parámetros inválidos para calcular la masa efectiva.');
  }
  const agua = rho * volumenEnvolventeM3;
  return { avance: masaKg + k.avance * agua, lateral: masaKg + k.lateral * agua, vertical: masaKg + k.vertical * agua };
}

/** Inercia añadida aproximada (kg·m²) para roll, pitch y yaw. */
export function inerciaAnadida(rho, volumenEnvolventeM3, k, largoM, radioM) {
  const agua = rho * volumenEnvolventeM3;
  return {
    roll: k.lateral * agua * radioM * radioM / 2,
    pitch: k.vertical * agua * largoM * largoM / 12,
    yaw: k.lateral * agua * largoM * largoM / 12
  };
}
