/** Bucle con paso de tiempo fijo, tope de dt y pausa al perder el foco (RNF-26, RNF-49). */
export class Loop {
  constructor({ step, update, fixedStep = 1 / 60, maxDt = 0.1 }) {
    this.step = step; this.update = update; this.fixedStep = fixedStep; this.maxDt = maxDt;
    this.acc = 0; this.paused = false;
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; this.acc = 0; });
  }
  /** Llamar una vez por fotograma con el dt real en segundos. */
  tick(dtReal) {
    if (this.paused) return;
    this.acc += Math.min(dtReal, this.maxDt);
    let n = 0;
    while (this.acc >= this.fixedStep && n < 32) { this.step(this.fixedStep); this.acc -= this.fixedStep; n++; }
    this.update(dtReal);
  }
}
