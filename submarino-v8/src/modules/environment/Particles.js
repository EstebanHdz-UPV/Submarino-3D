// Partículas en suspensión (sedimento / nieve marina) alrededor del submarino.
export class Particles {
  constructor(sm) {
    const B = BABYLON;
    const tex = new B.DynamicTexture('tex-particula', 64, sm.scene, false);
    const ctx = tex.getContext(); const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); tex.update();
    const ps = new B.ParticleSystem('sedimento', 500, sm.scene);
    ps.particleTexture = tex;
    ps.minEmitBox = new B.Vector3(-14, -7, -14); ps.maxEmitBox = new B.Vector3(14, 7, 14);
    ps.color1 = new B.Color4(0.85, 0.9, 0.9, 0.5); ps.color2 = new B.Color4(0.7, 0.8, 0.8, 0.35); ps.colorDead = new B.Color4(0.7, 0.8, 0.8, 0);
    ps.minSize = 0.04; ps.maxSize = 0.14; ps.minLifeTime = 6; ps.maxLifeTime = 12; ps.emitRate = 60;
    ps.gravity = new B.Vector3(0, -0.02, 0); ps.direction1 = new B.Vector3(-0.05, -0.03, -0.05); ps.direction2 = new B.Vector3(0.05, 0.03, 0.05);
    ps.minEmitPower = 0.1; ps.maxEmitPower = 0.3; ps.blendMode = B.ParticleSystem.BLENDMODE_STANDARD;
    ps.preWarmCycles = 120; ps.preWarmStepOffset = 5;
    this.ps = ps;
  }
  /** Sigue a un nodo (el submarino o la cámara). */
  seguir(node) { this.ps.emitter = node; }
  iniciar() { this.ps.start(); }
  detener() { this.ps.stop(); this.ps.reset(); }
}
