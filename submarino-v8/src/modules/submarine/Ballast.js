// Tanques de lastre: llenado de 0 (vacío, con aire) a 1 (lleno de agua).
export class Ballast {
  constructor(tanqueM3, bombaM3s, consumoW) {
    this.tanqueM3 = tanqueM3; this.bombaM3s = bombaM3s; this.consumoW = consumoW; this.fill = 0;
  }
  get rate() { return this.tanqueM3 > 0 ? this.bombaM3s / this.tanqueM3 : 0; } // fracción por segundo
  /**
   * @param {number} cmd -1 (vaciar) .. +1 (llenar)
   * @param {boolean} powered hay energía para la bomba
   * @param {boolean} blow soplado de emergencia con aire comprimido (no usa energía)
   * @returns {number} potencia consumida (W)
   */
  step(dt, cmd, powered, blow = false) {
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    if (this.tanqueM3 <= 0 || !Number.isFinite(this.tanqueM3) || !Number.isFinite(this.bombaM3s) || this.bombaM3s <= 0) return 0;
    if (!Number.isFinite(cmd)) cmd = 0;
    let r = 0, power = 0;
    if (blow) r = -4 * this.rate;
    else if (powered && cmd !== 0) { cmd = Math.max(-1, Math.min(1, cmd)); r = cmd * this.rate; power = Number.isFinite(this.consumoW) && this.consumoW > 0 ? this.consumoW * Math.abs(cmd) : 0; }
    this.fill = Math.min(1, Math.max(0, this.fill + r * dt));
    return power;
  }
}
