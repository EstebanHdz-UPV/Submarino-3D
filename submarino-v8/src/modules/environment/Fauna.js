// Vida marina (solo visual): bancos de peces, medusas luminosas y flora bioluminiscente, al estilo de un
// juego de exploración. Los animales viven en un volumen que acompaña a la cámara, así que siempre hay
// vida alrededor sin gastar recursos en todo el mapa. Usa instancias para mantener el coste bajo.
const TAU = Math.PI * 2;

export class Fauna {
  constructor(sm, seabed) {
    const B = BABYLON, scene = sm.scene;
    this.sm = sm; this.seabed = seabed; this.t = 0; this.activo = false;
    let seed = 99; const rnd = this.rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // ---------- peces ----------
    const gradiente = (nombre, arriba, medio, abajo, franjas) => {
      const tx = new B.DynamicTexture(nombre, { width: 64, height: 128 }, scene, true), c = tx.getContext();
      const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, abajo); g.addColorStop(0.5, medio); g.addColorStop(1, arriba);
      c.fillStyle = g; c.fillRect(0, 0, 64, 128);
      if (franjas) { c.fillStyle = franjas; for (let y = 20; y < 110; y += 22) c.fillRect(0, y, 64, 6); }
      tx.update(); return tx;
    };
    const especie = (nombre, tex, escala, rugosidad) => {
      const cuerpo = B.MeshBuilder.CreateSphere(`${nombre}-cuerpo`, { diameterX: 0.22, diameterY: 0.36, diameterZ: 1, segments: 12 }, scene);
      const cola = B.MeshBuilder.CreateDisc(`${nombre}-cola`, { radius: 0.24, tessellation: 3, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
      cola.rotation.set(0, Math.PI / 2, Math.PI / 2); cola.position.z = -0.62; cola.bakeCurrentTransformIntoVertices();
      const aleta = B.MeshBuilder.CreateDisc(`${nombre}-aleta`, { radius: 0.18, tessellation: 3, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
      aleta.rotation.set(0, Math.PI / 2, 0); aleta.position.set(0, 0.2, -0.08); aleta.bakeCurrentTransformIntoVertices();
      const m = B.Mesh.MergeMeshes([cuerpo, cola, aleta], true, true, undefined, false, false);
      m.name = nombre; m.isVisible = false; m.isPickable = false;
      const mat = new B.PBRMaterial(`mat-${nombre}`, scene);
      mat.albedoTexture = tex; mat.metallic = 0.35; mat.roughness = rugosidad; mat.backFaceCulling = false; mat.environmentIntensity = 0.9;
      m.material = mat; m.escala = escala; return m;
    };
    const tipos = [
      { m: especie('pez-azul', gradiente('t-azul', '#1c4a8a', '#7fb4d8', '#e8f2f6'), 1.0, 0.35), n: 70, tam: [0.5, 0.9], rap: 2.2, prof: [3, 90] },
      { m: especie('pez-naranja', gradiente('t-naranja', '#e8571e', '#f59a3a', '#fbe3b0', 'rgba(255,255,255,0.9)'), 1.0, 0.45), n: 36, tam: [0.35, 0.6], rap: 1.6, prof: [2, 45] },
      { m: especie('pez-abisal', gradiente('t-abisal', '#101826', '#2b3d55', '#56708a'), 1.0, 0.3), n: 22, tam: [1.2, 2.4], rap: 1.3, prof: [60, 400] }
    ];
    this.peces = [];
    for (const tp of tipos) {
      // cada especie forma bancos con un líder común
      const bancos = Math.max(2, Math.round(tp.n / 14)), lideres = [];
      for (let b = 0; b < bancos; b++) lideres.push({ ang: rnd() * TAU, giro: (rnd() - 0.5) * 0.25, y: 0, fase: rnd() * TAU, cx: (rnd() - 0.5) * 120, cz: (rnd() - 0.5) * 120 });
      for (let i = 0; i < tp.n; i++) {
        const inst = tp.m.createInstance(`${tp.m.name}-${i}`);
        const s = tp.tam[0] + rnd() * (tp.tam[1] - tp.tam[0]); inst.scaling.setAll(s); inst.isPickable = false;
        const lider = lideres[i % bancos];
        this.peces.push({ m: inst, lider, tp, dx: (rnd() - 0.5) * 7, dy: (rnd() - 0.5) * 3.5, dz: (rnd() - 0.5) * 7, fase: rnd() * TAU, v: tp.rap * (0.8 + rnd() * 0.4), s,
          pos: new B.Vector3(), ang: rnd() * TAU, init: false });
      }
      this.peces.liderGrupos = (this.peces.liderGrupos || []).concat(lideres);
    }
    this.fuentes = tipos.map((t) => t.m);

    // ---------- medusas ----------
    const campana = B.MeshBuilder.CreateSphere('medusa-campana', { diameter: 1, slice: 0.55, segments: 16, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    const tent = [];
    for (let k = 0; k < 8; k++) { const c = B.MeshBuilder.CreateCylinder(`t${k}`, { height: 1.4, diameterTop: 0.03, diameterBottom: 0.005, tessellation: 5 }, scene); c.position.set(Math.cos(k / 8 * TAU) * 0.28, -0.75, Math.sin(k / 8 * TAU) * 0.28); tent.push(c); }
    const medusa = B.Mesh.MergeMeshes([campana, ...tent], true, true, undefined, false, false);
    medusa.name = 'medusa'; medusa.isVisible = false; medusa.isPickable = false;
    const mm = new B.PBRMaterial('mat-medusa', scene);
    mm.albedoColor = new B.Color3(0.5, 0.75, 1); mm.emissiveColor = new B.Color3(0.25, 0.55, 1); mm.alpha = 0.55; mm.metallic = 0; mm.roughness = 0.2; mm.backFaceCulling = false;
    mm.subSurface.isTranslucencyEnabled = true; medusa.material = mm;
    this.medusas = [];
    for (let i = 0; i < 16; i++) {
      const inst = medusa.createInstance(`medusa-${i}`); inst.isPickable = false;
      this.medusas.push({ m: inst, ox: (rnd() - 0.5) * 120, oz: (rnd() - 0.5) * 120, oy: rnd(), fase: rnd() * TAU, s: 0.6 + rnd() * 1.6, v: 0.25 + rnd() * 0.3 });
    }
    this.fuentes.push(medusa);

    this.bio = []; // sin flora luminosa: el fondo solo se ve donde llegan las luces del submarino
    this.setEnabled(false);
  }

  setEnabled(b) {
    this.activo = b;
    for (const p of this.peces) p.m.setEnabled(b);
    for (const m of this.medusas) m.m.setEnabled(b);
    for (const p of this.bio) p.setEnabled(b);
  }

  update(dt, cam) {
    if (!this.activo) return;
    const B = BABYLON; this.t += dt;
    const R = 70; // los animales se reciclan dentro de una caja de ±R alrededor de la cámara
    const envolver = (v, c) => { let d = v - c; d = ((d + R) % (2 * R) + 2 * R) % (2 * R) - R; return c + d; };
    for (const l of this.peces.liderGrupos) { l.ang += l.giro * dt + Math.sin(this.t * 0.15 + l.fase) * 0.2 * dt; l.cx += Math.cos(l.ang) * 2 * dt; l.cz += Math.sin(l.ang) * 2 * dt; }
    for (const p of this.peces) {
      const l = p.lider, y0 = cam.y;
      const fondo = this.seabed.heightAt(p.pos.x, p.pos.z) + 1.2;
      const objX = l.cx + p.dx + Math.cos(l.ang) * 3, objZ = l.cz + p.dz + Math.sin(l.ang) * 3;
      // altura objetivo: cerca de la cámara pero dentro del rango de profundidad de la especie
      let objY = y0 + p.dy + Math.sin(this.t * 0.3 + l.fase) * 6;
      const pmin = -p.tp.prof[1], pmax = -p.tp.prof[0];
      objY = Math.max(pmin, Math.min(pmax, objY)); objY = Math.max(objY, fondo);
      if (!p.init) { p.pos.set(envolver(objX, cam.x), objY, envolver(objZ, cam.z)); p.init = true; }
      const dx = objX - p.pos.x, dz = objZ - p.pos.z, dy = objY - p.pos.y;
      const d = Math.hypot(dx, dz) || 1, dest = Math.atan2(dx, dz);
      let da = dest - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      p.ang += da * Math.min(1, dt * 1.6);
      const v = p.v * (0.7 + Math.min(1, d / 6) * 0.9);
      p.pos.x += Math.sin(p.ang) * v * dt; p.pos.z += Math.cos(p.ang) * v * dt; p.pos.y += dy * Math.min(1, dt * 0.8);
      p.pos.x = envolver(p.pos.x, cam.x); p.pos.z = envolver(p.pos.z, cam.z);
      if (Math.abs(p.pos.y - cam.y) > R) p.pos.y = objY;
      p.m.position.copyFrom(p.pos);
      p.m.rotation.y = p.ang + Math.sin(this.t * (6 + v * 2) + p.fase) * 0.18;           // coleo
      p.m.rotation.z = Math.sin(this.t * 3 + p.fase) * 0.05;
      p.m.rotation.x = -Math.atan2(dy, 8) * 0.5;
    }
    for (const m of this.medusas) {
      const y = envolver(-8 - m.oy * 200 + Math.sin(this.t * m.v + m.fase) * 4, cam.y);
      m.m.position.set(envolver(m.ox + Math.sin(this.t * 0.07 + m.fase) * 6, cam.x), Math.max(this.seabed.heightAt(m.ox, m.oz) + 2, Math.min(-3, y)), envolver(m.oz + Math.cos(this.t * 0.06 + m.fase) * 6, cam.z));
      const pulso = Math.sin(this.t * 1.8 + m.fase);
      m.m.scaling.set(m.s * (1 + pulso * 0.1), m.s * (1 - pulso * 0.14), m.s * (1 + pulso * 0.1));
    }
  }
}
