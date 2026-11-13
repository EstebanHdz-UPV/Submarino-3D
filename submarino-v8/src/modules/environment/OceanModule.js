import { Cielo } from './Cielo.js';
// Agua: color, niebla y atenuación de luz con la profundidad; superficie del mar.
const lerp = (a, b, t) => a + (b - a) * t;

export class OceanModule {
  constructor(sm) {
    const B = BABYLON;
    this.sm = sm;
    this.superficie = B.MeshBuilder.CreateGround('superficie', { width: 3000, height: 3000, subdivisions: 1 }, sm.scene);
    // Superficie PBR: mapa de normales de olas local, reflejo del entorno y transparencia suave.
    const mat = new B.PBRMaterial('mat-superficie', sm.scene);
    const normales = new B.Texture('assets/textures/agua_normal.png', sm.scene);
    normales.wrapU = normales.wrapV = B.Texture.WRAP_ADDRESSMODE; normales.uScale = normales.vScale = 35;
    mat.bumpTexture = normales; mat.bumpTexture.level = 0.45; mat.invertNormalMapX = mat.invertNormalMapY = false;
    mat.albedoColor = new B.Color3(0.05, 0.28, 0.4); mat.metallic = 0.0; mat.roughness = 0.12;
    mat.emissiveColor = new B.Color3(0.015, 0.07, 0.1); mat.alpha = 0.34; mat.backFaceCulling = false;
    mat.environmentIntensity = 0.45; mat.indexOfRefraction = 1.33;
    this.normalesAgua = normales;
    this.superficie.material = mat; this.superficie.isPickable = false; this.t = 0;
    this.cielo = new Cielo(sm.scene);
    this.shallow = [0.08, 0.42, 0.55]; this.deep = [0.006, 0.02, 0.05];
  }
  /** Intensidad relativa de la luz del sol a una profundidad (m): I = exp(-k·z). */
  static luz(depthM) { return Math.exp(-Math.max(0, depthM) / 35); }
  /** Ajusta color, niebla y luces según la profundidad de la cámara (m, positiva hacia abajo). */
  update(camDepthM) {
    const { scene } = this.sm;
    this.t += 1 / 60; this.normalesAgua.uOffset = this.t * 0.006; this.normalesAgua.vOffset = this.t * 0.004;
    const sobre = camDepthM < 0.5 && this.superficie.isEnabled();
    this.cielo.setEnabled(sobre);
    this.superficie.material.environmentIntensity = camDepthM < 0 ? 0.1 : 0.45; // vista desde arriba: sin reflejo blanquecino rasante
    this.superficie.material.alpha = camDepthM < 0 ? 0.62 : 0.34;
    if (sobre) this.cielo.seguirCamara(scene.activeCamera.globalPosition, this.sm.sun.direction);
    if (camDepthM < 0) { // sobre el agua: el mar lejano se funde con el horizonte del cielo
      scene.clearColor.set(0.5, 0.7, 0.85, 1); scene.fogColor.set(0.5, 0.7, 0.82); scene.fogDensity = 0.0022;
      this.sm.ambient.intensity = 1; this.sm.sun.intensity = 1.1; return;
    }
    const t = 1 - Math.exp(-camDepthM / 70);
    const c = this.shallow.map((v, i) => lerp(v, this.deep[i], t));
    scene.clearColor.set(c[0], c[1], c[2], 1); scene.fogColor.set(c[0], c[1], c[2]);
    scene.fogDensity = lerp(0.011, 0.03, t);
    const luz = OceanModule.luz(camDepthM);
    this.sm.ambient.intensity = 0.1 + 0.8 * luz;
    this.sm.sun.intensity = 1.0 * luz;
  }
}
