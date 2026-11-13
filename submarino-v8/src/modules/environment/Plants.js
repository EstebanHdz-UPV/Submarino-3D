// Vegetación y arrecife del fondo: algas que se mecen con la corriente y corales con textura PBR.
// Usa instancias de una sola malla por tipo para mantener el coste de dibujo bajo. Solo visual.
export class Plants {
  constructor(sm, seabed) {
    const B = BABYLON, scene = sm.scene;
    this.sm = sm; this.t = 0; this.algas = []; this.nodos = [];
    let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tex = (n) => { const t = new B.Texture(`assets/textures/${n}.png`, scene); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; return t; };

    // --- algas: cintas verticales curvas con translucidez ---
    const alga = new B.PBRMaterial('mat-alga', scene);
    alga.albedoTexture = tex('alga_albedo'); alga.bumpTexture = tex('alga_normal'); alga.bumpTexture.level = 0.8;
    alga.metallic = 0; alga.roughness = 0.55; alga.backFaceCulling = false; alga.environmentIntensity = 0.5;
    alga.subSurface.isTranslucencyEnabled = true; alga.subSurface.translucencyIntensity = 0.5; alga.subSurface.tintColor = new B.Color3(0.45, 0.8, 0.35);
    const camino = (h) => Array.from({ length: 9 }, (_, i) => { const k = i / 8; return new B.Vector3(0, k * h, 0); });
    const ancho = (k) => 0.55 * (1 - 0.7 * k);
    const base = B.MeshBuilder.CreateRibbon('alga-base', { pathArray: [camino(5).map((p) => p.add(new B.Vector3(-ancho(p.y / 5) / 2, 0, 0))), camino(5).map((p) => p.add(new B.Vector3(ancho(p.y / 5) / 2, 0, 0)))], sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    base.material = alga; base.isPickable = false; base.isVisible = false;
    // Reparte por todo el lecho, con más densidad sobre dorsales y mesetas (rechazo por zona y pendiente).
    const zona = (min) => { for (let t = 0; t < 40; t++) { const x = (rnd() - 0.5) * 560, z = (rnd() - 0.5) * 560; if (seabed.pendienteAt(x, z) < 0.7 && (rnd() < 0.15 || seabed.arrecifeAt(x, z) > min)) return [x, z]; } return [(rnd() - 0.5) * 280, (rnd() - 0.5) * 280]; };
    for (let i = 0; i < 520; i++) {
      const [x, z] = zona(0.3);
      const g = rnd() < 0.5 ? 0 : 1; // cada mata tiene de 1 a 4 hojas
      for (let k = 0; k <= Math.floor(rnd() * 4); k++) {
        const inst = base.createInstance(`alga-${i}-${k}`);
        const s = 0.7 + rnd() * 2.6;
        inst.position.set(x + (rnd() - 0.5) * 1.4, seabed.heightAt(x, z) - 0.1, z + (rnd() - 0.5) * 1.4);
        inst.scaling.set(1, s, 1); inst.rotation.y = rnd() * 6.28; inst.isPickable = false;
        this.algas.push({ m: inst, fase: rnd() * 6.28, amp: 0.05 + rnd() * 0.08 + g * 0.02 });
      }
    }

    // --- corales: racimos de ramas y cúpulas ---
    const mkCoral = (nombre, tinte) => {
      const c = new B.PBRMaterial(`mat-coral-${nombre}`, scene);
      c.albedoTexture = tex('coral_albedo'); c.bumpTexture = tex('coral_normal'); c.bumpTexture.level = 1.0;
      c.metallicTexture = tex('coral_orm'); c.useRoughnessFromMetallicTextureGreen = true; c.useMetallnessFromMetallicTextureBlue = true; c.useAmbientOcclusionFromMetallicTextureRed = true;
      c.metallic = 1; c.roughness = 1; c.environmentIntensity = 0.55; c.albedoColor = new B.Color3(...tinte);
      return c;
    };
    const tonos = [['rosa', [1, 0.72, 0.8]], ['naranja', [1, 0.7, 0.45]], ['violeta', [0.82, 0.62, 1]], ['amarillo', [1, 0.95, 0.55]], ['blanco', [0.95, 0.97, 1]]];
    const familias = tonos.map(([n, t]) => {
      const mat = mkCoral(n, t);
      const rama = B.MeshBuilder.CreateCylinder(`coral-rama-${n}`, { height: 1, diameterTop: 0.12, diameterBottom: 0.3, tessellation: 10 }, scene);
      const cupula = B.MeshBuilder.CreateSphere(`coral-cupula-${n}`, { diameter: 1, segments: 10 }, scene);
      const abanico = B.MeshBuilder.CreateDisc(`coral-abanico-${n}`, { radius: 0.5, tessellation: 20 }, scene);
      for (const m of [rama, cupula, abanico]) { m.material = mat; m.isVisible = false; m.isPickable = false; }
      abanico.material = mat.clone(`mat-abanico-${n}`); abanico.material.backFaceCulling = false;
      return { rama, cupula, abanico };
    });
    const racimos = 150;
    for (let i = 0; i < racimos; i++) {
      let cx = 0, cz = 0;
      for (let t = 0; t < 60; t++) { cx = (rnd() - 0.5) * 560; cz = (rnd() - 0.5) * 560; if (seabed.arrecifeAt(cx, cz) > 0.5 && seabed.pendienteAt(cx, cz) < 0.9) break; }
      const f = familias[Math.floor(rnd() * familias.length)], cy = seabed.heightAt(cx, cz);
      const raiz = new B.TransformNode(`coral-${i}`, scene); raiz.position.set(cx, cy, cz); this.nodos.push(raiz);
      const n = 6 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) {
        const tipo = rnd(), a = rnd() * 6.28, d = rnd() * 1.4;
        const r = tipo < 0.55 ? f.rama.createInstance(`cr-${i}-${k}`) : tipo < 0.82 ? f.cupula.createInstance(`cu-${i}-${k}`) : f.abanico.createInstance(`ab-${i}-${k}`);
        const h = tipo < 0.55 ? 0.6 + rnd() * 1.6 : tipo < 0.82 ? 0.4 + rnd() * 0.7 : 0.9 + rnd() * 1.2;
        r.parent = raiz; r.isPickable = false;
        if (tipo < 0.55) { r.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d); r.scaling.set(1, h, 1); r.rotation.set((rnd() - 0.5) * 0.7, 0, (rnd() - 0.5) * 0.7); }
        else if (tipo < 0.82) { r.position.set(Math.cos(a) * d, h * 0.3, Math.sin(a) * d); r.scaling.set(h * 1.4, h * 0.7, h * 1.4); }
        else { r.position.set(Math.cos(a) * d, h * 0.5, Math.sin(a) * d); r.scaling.set(h, h * 1.1, 1); r.rotation.y = rnd() * 3.14; }
      }
    }
    this.todos = [...this.algas.map((a) => a.m), ...this.nodos];
    this.setEnabled(false);
    this.base = [base, ...familias.flatMap((f) => [f.rama, f.cupula, f.abanico])];
  }
  setEnabled(b) { this.todos.forEach((n) => n.setEnabled(b)); this.activo = b; }
  update(dt = 1 / 60) {
    if (!this.activo) return;
    this.t += dt;
    for (const a of this.algas) {
      a.m.rotation.x = Math.sin(this.t * 0.9 + a.fase) * a.amp;
      a.m.rotation.z = Math.cos(this.t * 0.7 + a.fase * 1.3) * a.amp;
    }
  }
}
