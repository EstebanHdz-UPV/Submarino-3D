// Palanca de empuje con rampa: W/S aumentan o disminuyen; la física limita y suaviza el empuje real.
export class Propeller {
  constructor(rate = 0.6) { this.rate = rate; this.lever = 0; }
  /** dir: +1 acelerar, -1 desacelerar, 0 mantener. */
  update(dt, dir) { this.lever = Math.min(1, Math.max(-1, this.lever + dir * this.rate * dt)); return this.lever; }
  stop() { this.lever = 0; }
}
