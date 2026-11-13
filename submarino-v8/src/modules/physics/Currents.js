// Corrientes marinas como velocidad del agua (m/s) en el plano horizontal del mundo físico.
// Mundo físico: x = dirección inicial de avance, y = izquierda, z = arriba.
/** env.corrienteMs: rapidez; env.corrienteDirRad: dirección hacia donde fluye (π = contra el avance inicial). */
export function corrienteEn(env, _depthM) {
  const v = env.corrienteMs ?? 0;
  const d = env.corrienteDirRad ?? Math.PI;
  return [v * Math.cos(d), v * Math.sin(d), 0];
}
