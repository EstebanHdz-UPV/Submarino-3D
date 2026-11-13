// Realismo visual: iluminación basada en imagen (IBL), tonemapping cinematográfico, bloom, brillo de luces,
// sombras y haces de luz solar bajo el agua. Solo afecta al aspecto; no toca la física ni los datos.
import { SLog } from '../../core/SLog.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Haces de luz solar: columnas finas con bordes suaves que siempre miran a la cámara (no nubes). */
class RayosDeLuz {
  constructor(scene) {
    const B = BABYLON;
    this.root = new B.TransformNode('rayos-luz', scene);
    const tex = new B.DynamicTexture('rayo-perfil', { width: 128, height: 256 }, scene, true);
    const c = tex.getContext(), g = c.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 256);
    c.globalCompositeOperation = 'destination-in';
    const v = c.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.7, 'rgba(0,0,0,0.45)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = v; c.fillRect(0, 0, 128, 256); tex.update(); tex.hasAlpha = true;
    const mat = new B.StandardMaterial('mat-rayos', scene);
    mat.disableLighting = true; mat.emissiveColor = new B.Color3(0.5, 0.85, 0.9);
    mat.opacityTexture = tex; mat.backFaceCulling = false; mat.alpha = 0.06; mat.alphaMode = B.Engine.ALPHA_ADD; mat.fogEnabled = false;
    this.mat = mat; this.hojas = [];
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const ancho = 3 + rnd() * 9;
      const p = B.MeshBuilder.CreatePlane(`rayo-${i}`, { width: ancho, height: 110 }, scene);
      p.parent = this.root; p.isPickable = false; p.material = mat; p.billboardMode = B.Mesh.BILLBOARDMODE_Y;
      p.position.set((rnd() - 0.5) * 120, -45, (rnd() - 0.5) * 120);
      p.rotation.z = (rnd() - 0.5) * 0.35; this.hojas.push({ p, fase: rnd() * 6.28 });
    }
    this.root.setEnabled(false);
  }
}

export class Visuals {
  constructor(sm) {
    const B = BABYLON, scene = sm.scene;
    this.sm = sm; this.t = 0;
    // 1) Entorno: reflejos y luz ambiental realistas (panorama submarino local).
    try {
      this.env = new B.EquiRectangularCubeTexture('assets/textures/entorno_agua.png', scene, 256);
      scene.environmentTexture = this.env; scene.environmentIntensity = 1.0;
    } catch (e) { SLog.warn('Visuals', 'Sin textura de entorno; se usa la luz de la escena', e?.message); }
    // 2) Post-proceso: antialiasing, bloom, tonemapping ACES, viñeta y grano de película muy sutil.
    try {
      const pipe = new B.DefaultRenderingPipeline('realismo', true, scene, [sm.arc, sm.proa]);
      pipe.fxaaEnabled = true;
      pipe.bloomEnabled = true; pipe.bloomThreshold = 0.82; pipe.bloomWeight = 0.38; pipe.bloomKernel = 56; pipe.bloomScale = 0.5;
      pipe.sharpenEnabled = true; pipe.sharpen.edgeAmount = 0.22;
      pipe.imageProcessingEnabled = true;
      const ip = pipe.imageProcessing;
      ip.toneMappingEnabled = true; ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
      ip.exposure = 1.45; ip.contrast = 1.04; ip.vignetteEnabled = true; ip.vignetteWeight = 1.7; ip.vignetteStretch = 0.4;
      ip.vignetteColor = new B.Color4(0, 0.03, 0.06, 0);
      pipe.grainEnabled = true; pipe.grain.intensity = 3; pipe.grain.animated = true;
      this.pipe = pipe;
    } catch (e) { SLog.warn('Visuals', 'Post-proceso no disponible', e?.message); }
    // 3) Brillo de lámparas, pantallas y luces de navegación (solo materiales emisivos).
    try { this.glow = new B.GlowLayer('brillo', scene, { mainTextureSamples: 2, blurKernelSize: 40 }); this.glow.intensity = 0.65; }
    catch (e) { SLog.warn('Visuals', 'Brillo no disponible', e?.message); }
    // 4) Sombras suaves del sol sobre y dentro del submarino.
    try {
      const sg = new B.ShadowGenerator(2048, sm.sun);
      sg.usePercentageCloserFiltering = true; sg.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
      sg.bias = 0.0006; sg.normalBias = 0.02; sg.darkness = 0.25;
      sm.sun.autoUpdateExtends = true; sm.sun.autoCalcShadowZBounds = true;
      this.sombras = sg;
    } catch (e) { SLog.warn('Visuals', 'Sombras no disponibles', e?.message); }
    // 0) Con foco, luz de relleno, sol, ambiente e interior, cada material debe admitir más luces a la vez.
    scene.materials.forEach((m) => { if ('maxSimultaneousLights' in m) m.maxSimultaneousLights = 8; });
    scene.onNewMaterialAddedObservable.add((m) => { if ('maxSimultaneousLights' in m) m.maxSimultaneousLights = 8; });
    // 5) Rayos de sol bajo la superficie.
    this.rayos = new RayosDeLuz(scene);
    this.nivel = 0; this._lento = 0; this._espera = 6; this.onNivel = null;
  }

  /** Calidad automática: si los fotogramas por segundo bajan mucho (la simulación va a cámara lenta), se simplifican efectos. */
  _calidad() {
    const eng = this.sm.engine ?? this.sm.scene.getEngine(), fps = eng.getFps(), dt = Math.min(2, (eng.getDeltaTime?.() ?? 16) / 1000); // tiempo real, no el de simulación
    if (this._espera > 0) { this._espera -= dt; return; }
    this._lento = fps < 24 ? this._lento + dt : Math.max(0, this._lento - dt);
    if (this._lento < 3 || this.nivel >= 3) return;
    this._lento = 0; this._espera = 2; this.nivel++;
    const ip = this.pipe;
    if (this.nivel === 1) { this.sm.sun.shadowEnabled = false; if (this.glow) this.glow.isEnabled = false; if (ip) { ip.grainEnabled = false; ip.sharpenEnabled = false; } }
    if (this.nivel === 2) { if (ip) ip.bloomEnabled = false; eng.setHardwareScalingLevel(1.4); }
    if (this.nivel === 3) { eng.setHardwareScalingLevel(1.8); this.onNivel?.(3); }
    SLog.warn('Visuals', `Equipo lento (${Math.round(fps)} fps): calidad reducida al nivel ${this.nivel}`);
  }

  /** Una malla proyecta y recibe sombras (piezas del submarino). */
  agregarSombra(mesh) {
    if (!this.sombras || !mesh?.getTotalVertices || !mesh.getTotalVertices()) return;
    if (!this.sombras.getShadowMap().renderList.includes(mesh)) this.sombras.addShadowCaster(mesh);
    mesh.receiveShadows = true;
  }
  quitarSombra(mesh) { this.sombras?.removeShadowCaster(mesh); }

  /** Ajusta la imagen según la profundidad de la cámara (m, negativa = sobre el agua). */
  actualizar(profM, dt = 1 / 60, agua = true) {
    const { scene } = this.sm;
    this.t += dt;
    if (agua) this._calidad();
    const luz = Math.exp(-Math.max(0, profM) / 35);               // 1 en superficie → 0 en lo profundo
    scene.environmentIntensity = 0.18 + 1.5 * luz;
    if (this.pipe) {
      this.pipe.bloomWeight = 0.30 + 0.25 * luz;
      this.pipe.bloomThreshold = agua && profM < 0 ? 1.3 : 0.82; // sobre el agua el cielo claro no debe 'sangrar' sobre el mar
      this.pipe.imageProcessing.exposure = 1.45;
    }
    if (this.glow) this.glow.intensity = 0.55 + 0.7 * (1 - luz);   // las luces propias destacan más en lo oscuro
    const rayos = agua && this.nivel < 2 && profM > -1 ? clamp01(1 - profM / 90) : 0; // solo bajo la superficie
    this.rayos.root.setEnabled(rayos > 0.02 && this.sm.scene.activeCamera != null);
    if (rayos > 0.02) {
      const cam = scene.activeCamera.globalPosition;
      this.rayos.root.position.set(cam.x, Math.min(-1, cam.y + 55), cam.z);
      this.rayos.mat.alpha = 0.07 * rayos * rayos * (0.85 + 0.15 * Math.sin(this.t * 0.7));
      this.rayos.hojas.forEach((h) => { h.p.rotation.z = 0.15 * Math.sin(h.fase + this.t * 0.15); });
    }
  }
}
