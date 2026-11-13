// Batería: capacidad útil afectada por la temperatura del agua (más fría = menos energía disponible).
export class Battery {
  constructor(capacidadWh, coefTemp, temperaturaC, simplificado = false) {
    const f = simplificado ? 1 : Math.max(0.5, 1 - (coefTemp ?? 0) * Math.max(0, 20 - temperaturaC));
    this.nominalWh = capacidadWh; this.capWh = capacidadWh * f; this.energyWh = this.capWh; this.factorTemp = f;
  }
  drain(potenciaW, dt) {
    // Ignora mediciones inválidas y evita que una potencia negativa cargue la batería accidentalmente.
    if (!Number.isFinite(potenciaW) || potenciaW <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    this.energyWh = Math.max(0, this.energyWh - potenciaW * dt / 3600);
  }
  /** Falla total de energía (escenarios de emergencia). */
  agotar() { this.energyWh = 0; }
  get empty() { return this.energyWh <= 0; }
  get soc() { return this.capWh > 0 ? this.energyWh / this.capWh : 0; }
  get usedWh() { return this.capWh - this.energyWh; }
}
