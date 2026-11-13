// Cámaras: seguimiento, órbita libre, taller (constructor) y proa (desde el domo). RF-09.
export const MODOS_CAMARA = ['seguimiento', 'orbita', 'proa'];

export class CameraModule {
  constructor(sceneModule) {
    this.sm = sceneModule; this.modo = 'taller';
    this.targetSuave = BABYLON.Vector3.Zero();
    this._alpha = null;
  }
  /** Modo de la cámara: 'taller' | 'seguimiento' | 'orbita' | 'proa'. */
  setModo(modo) {
    const { sm } = this;
    this.modo = modo;
    sm.arc.detachControl();
    if (modo === 'proa') { sm.scene.activeCamera = sm.proa; return; }
    sm.scene.activeCamera = sm.arc;
    sm.arc.attachControl(sm.canvas, true);
    if (modo === 'taller') { sm.arc.lowerRadiusLimit = 3; sm.arc.upperRadiusLimit = 14; sm.arc.radius = 6.5; sm.arc.alpha = -Math.PI / 3; sm.arc.beta = 1.25; sm.arc.target.set(0, 0, 0); }
    else { sm.arc.lowerRadiusLimit = 3; sm.arc.upperRadiusLimit = 60; if (sm.arc.radius < 8) sm.arc.radius = 10; }
  }
  siguiente() {
    const i = MODOS_CAMARA.indexOf(this.modo);
    const n = MODOS_CAMARA[(i + 1) % MODOS_CAMARA.length];
    this.setModo(n);
    return n;
  }
  /** Actualiza la cámara cada fotograma. pos/adelante/arriba en coordenadas de Babylon. */
  update(dt, pos, adelante, arriba, posCabina) {
    const { sm } = this;
    if (this.modo === 'seguimiento' || this.modo === 'orbita') {
      this.targetSuave = BABYLON.Vector3.Lerp(this.targetSuave, pos, Math.min(1, dt * 6));
      sm.arc.target.copyFrom(this.targetSuave);
      if (this.modo === 'seguimiento') {
        const objetivo = Math.atan2(-adelante.z, -adelante.x);
        if (this._alpha === null) this._alpha = sm.arc.alpha;
        let d = objetivo - this._alpha; d = Math.atan2(Math.sin(d), Math.cos(d));
        this._alpha += d * Math.min(1, dt * 2.5);
        sm.arc.alpha = this._alpha; sm.arc.beta += (1.25 - sm.arc.beta) * Math.min(1, dt * 2);
      } else this._alpha = null;
    } else if (this.modo === 'proa') {
      sm.proa.position.copyFrom(posCabina ?? pos);
      sm.proa.setTarget((posCabina ?? pos).add(adelante.scale(10)));
      sm.proa.upVector = arriba;
    }
  }
}
