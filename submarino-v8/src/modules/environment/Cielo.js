// Cielo: cúpula con degradado azul, nubes suaves y disco solar. Solo se ve cuando la cámara está sobre el agua.
export class Cielo {
  constructor(scene) {
    const B = BABYLON;
    this.scene = scene;
    const W = 2048, H = 1024;
    const tex = new B.DynamicTexture('cielo-tex', { width: W, height: H }, scene, true);
    const c = tex.getContext();
    // Degradado cenit → horizonte (la mitad inferior se funde con el mar lejano).
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0.00, '#06307a'); g.addColorStop(0.20, '#0d4bb0'); g.addColorStop(0.34, '#1f6fd8'); g.addColorStop(0.43, '#4f9aea');
    g.addColorStop(0.48, '#6fb0ea'); g.addColorStop(0.505, '#a6cfee'); g.addColorStop(0.512, '#3a7aa0'); g.addColorStop(0.56, '#0e4a66'); g.addColorStop(1.00, '#052a3e'); // bajo el horizonte: agua oscura, que se ve a través de la superficie
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Nubes: manchas suaves apiladas, repetidas a ambos lados para que no se note la costura.
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const mancha = (x, y, rx, ry, a) => {
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      const r = c.createRadialGradient(0, 0, 0, 0, 0, rx);
      r.addColorStop(0, `rgba(255,255,255,${a})`); r.addColorStop(0.55, `rgba(245,248,252,${a * 0.45})`); r.addColorStop(1, 'rgba(235,242,250,0)');
      c.fillStyle = r; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore();
    };
    for (let k = 0; k < 13; k++) {
      const cx = rnd() * W, cy = H * (0.30 + rnd() * 0.18), n = 6 + Math.floor(rnd() * 8), s = 60 + rnd() * 120;
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd() - 0.5) * s * 2.6, y = cy + (rnd() - 0.5) * s * 0.35, rx = s * (0.5 + rnd() * 0.7), ry = rx * (0.28 + rnd() * 0.18), a = 0.10 + rnd() * 0.16;
        for (const dx of [-W, 0, W]) mancha(x + dx, y, rx, ry, a);
      }
    }
    tex.update();
    const mat = new B.StandardMaterial('mat-cielo', scene);
    mat.disableLighting = true; mat.emissiveTexture = tex; mat._tex = tex; mat.emissiveTexture.level = 1.05; mat.diffuseColor = B.Color3.Black(); mat.specularColor = B.Color3.Black();
    mat.backFaceCulling = false; mat.fogEnabled = false; mat.disableDepthWrite = true;
    this.domo = B.MeshBuilder.CreateSphere('cielo', { diameter: 3600, segments: 24, sideOrientation: B.Mesh.BACKSIDE }, scene);
    this.domo.material = mat; this.domo.infiniteDistance = true; this.domo.isPickable = false; this.domo.renderingGroupId = 0; this.domo.alwaysSelectAsActiveMesh = true;
    this.domo.applyFog = false;
    // Sol: disco brillante con halo, en la dirección real de la luz solar de la escena.
    const halo = new B.DynamicTexture('sol-halo', { width: 256, height: 256 }, scene, true), h = halo.getContext();
    const rg = h.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(255,252,235,1)'); rg.addColorStop(0.07, 'rgba(255,250,225,1)'); rg.addColorStop(0.12, 'rgba(255,240,200,0.55)'); rg.addColorStop(0.4, 'rgba(255,225,170,0.14)'); rg.addColorStop(1, 'rgba(255,220,160,0)');
    h.fillStyle = rg; h.fillRect(0, 0, 256, 256); halo.update(); halo.hasAlpha = true;
    const sm = new B.StandardMaterial('mat-sol', scene);
    sm.disableLighting = true; sm.emissiveColor = new B.Color3(1, 0.96, 0.85); sm.opacityTexture = halo; sm.alphaMode = B.Engine.ALPHA_ADD; sm.fogEnabled = false; sm.disableDepthWrite = true; sm.backFaceCulling = false;
    this.sol = B.MeshBuilder.CreatePlane('sol', { size: 1100 }, scene);
    this.sol.material = sm; this.sol.billboardMode = B.Mesh.BILLBOARDMODE_ALL; this.sol.isPickable = false; this.sol.applyFog = false; this.sol.renderingGroupId = 0;
    this.setEnabled(false);
  }
  setEnabled(b) { this.domo.setEnabled(b); this.sol.setEnabled(b); }
  /** Coloca el sol relativo a la cámara activa, en sentido contrario a la dirección de la luz. */
  seguirCamara(camPos, sunDir) {
    const d = sunDir.normalizeToNew().scale(-1);
    this.sol.position.copyFrom(camPos).addInPlace(d.scale(1500));
  }
}
