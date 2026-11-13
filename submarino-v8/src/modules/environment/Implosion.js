// Implosión por presión: el casco se arruga hacia dentro (morph target en la GPU), las piezas son "chupadas"
// hacia el centro y se produce un destello, una onda de choque y una nube de burbujas. Solo visual:
// no modifica la física ni los datos del diseño; reset() deja todo exactamente como estaba.
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export class Implosion {
  constructor(view, sm) {
    this.view = view; this.sm = sm; this.t = 0; this.active = false; this.hecho = false;
    this.dur = { aplastar: 0.9, succion: 1.6 };
    this.cascos = []; this.piezas = []; this.fx = [];
  }

  /** Posiciones de destino del casco: estrechamiento en la cintura con lóbulos de pandeo. */
  _destino(mesh) {
    const B = BABYLON, pos = mesh.getVerticesData(B.VertexBuffer.PositionKind);
    if (!pos) return null;
    mesh.refreshBoundingInfo?.();
    const bb = mesh.getBoundingInfo().boundingBox, mn = bb.minimum, mx = bb.maximum;
    const ext = [mx.x - mn.x, mx.y - mn.y, mx.z - mn.z];
    const eje = ext.indexOf(Math.max(...ext));                 // eje largo del casco
    const [p, q] = [0, 1, 2].filter((i) => i !== eje);
    const c = [(mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2];
    const semi = ext[eje] / 2 || 1;
    const out = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const a = (pos[i + eje] - c[eje]) / semi;               // -1..1 a lo largo
      const u = pos[i + p] - c[p], v = pos[i + q] - c[q], th = Math.atan2(v, u);
      const cintura = Math.exp(-(((a - 0.08) / 0.5) ** 2));
      const lobulos = 0.5 + 0.5 * Math.cos(5 * th + 3.2 * a);
      const k = 1 - clamp01(0.52 * cintura * (0.5 + 0.5 * lobulos) + 0.16 * Math.exp(-(((a + 0.55) / 0.3) ** 2)) * lobulos + 0.07);
      out[i + p] = c[p] + u * k; out[i + q] = c[q] + v * k;
      out[i + eje] = c[eje] + (pos[i + eje] - c[eje]) * (1 - 0.07 * cintura);
    }
    return out;
  }

  play() {
    if (this.active || this.hecho) return;
    const B = BABYLON, scene = this.sm.scene;
    this.active = true; this.t = 0;
    // Casco: morph target por malla.
    const hull = this.view.nodos.get('casco');
    for (const m of hull?.meshes ?? []) {
      if (!m.getTotalVertices || !m.getTotalVertices()) continue;
      const dest = this._destino(m); if (!dest) continue;
      const prev = m.morphTargetManager;
      const mgr = prev ?? new B.MorphTargetManager(scene);
      const tg = new B.MorphTarget('implosion', 0, scene); tg.setPositions(dest);
      mgr.addTarget(tg); m.morphTargetManager = mgr;
      this.cascos.push({ m, tg, mgr, previo: !!prev });
    }
    // Resto de piezas: se guardan sus transformaciones para la succión y para restaurarlas.
    let i = 0;
    for (const [id, n] of this.view.nodos) {
      if (id === 'casco') continue;
      this.piezas.push({ node: n.node, p0: n.node.position.clone(), s0: n.node.scaling.clone(), r0: n.node.rotation.clone(), q0: n.node.rotationQuaternion?.clone() ?? null,
        giro: new B.Vector3(Math.sin(i * 7.1), Math.cos(i * 3.7), Math.sin(i * 5.3)).scale(2.5 + (i % 3)), retardo: 0.04 * (i % 6) });
      i++;
    }
    this.view.interior?.setVentanas(false);
    this._crearFx();
  }

  _crearFx() {
    const B = BABYLON, scene = this.sm.scene, root = this.view.root;
    // Destello
    const luz = new B.PointLight('implosion-luz', B.Vector3.Zero(), scene);
    luz.parent = root; luz.diffuse = new B.Color3(1, 0.78, 0.5); luz.range = 40; luz.intensity = 0;
    // Onda de choque (anillo que se expande)
    const anillo = B.MeshBuilder.CreateTorus('implosion-onda', { diameter: 1, thickness: 0.05, tessellation: 48 }, scene);
    const mat = new B.StandardMaterial('implosion-onda-mat', scene);
    mat.disableLighting = true; mat.emissiveColor = new B.Color3(0.7, 0.95, 1); mat.alpha = 0.6; mat.alphaMode = B.Engine.ALPHA_ADD; mat.fogEnabled = false;
    anillo.material = mat; anillo.parent = root; anillo.isPickable = false; anillo.rotation.x = Math.PI / 2; anillo.setEnabled(false);
    // Burbujas y escombros
    const tex = new B.DynamicTexture('implosion-burbuja', { width: 64, height: 64 }, scene, false);
    const ctx = tex.getContext(), g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.55, 'rgba(190,235,255,0.35)'); g.addColorStop(1, 'rgba(190,235,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); tex.update(); tex.hasAlpha = true;
    const ps = new B.ParticleSystem('implosion-burbujas', 500, scene);
    ps.particleTexture = tex; ps.emitter = root;
    ps.minEmitBox = new B.Vector3(-0.8, -0.4, -1.2); ps.maxEmitBox = new B.Vector3(0.8, 0.4, 1.2);
    ps.color1 = new B.Color4(0.85, 0.95, 1, 0.8); ps.color2 = new B.Color4(0.6, 0.85, 1, 0.5); ps.colorDead = new B.Color4(0.6, 0.85, 1, 0);
    ps.minSize = 0.06; ps.maxSize = 0.34; ps.minLifeTime = 1.2; ps.maxLifeTime = 3.2;
    ps.manualEmitCount = 500; ps.emitRate = 0; ps.gravity = new B.Vector3(0, 2.2, 0);
    ps.direction1 = new B.Vector3(-2.2, -1, -2.2); ps.direction2 = new B.Vector3(2.2, 3, 2.2);
    ps.minEmitPower = 0.6; ps.maxEmitPower = 3.2; ps.blendMode = B.ParticleSystem.BLENDMODE_ADD; ps.start();
    this.fx = [{ tipo: 'luz', o: luz }, { tipo: 'onda', o: anillo, mat }, { tipo: 'ps', o: ps, tex }];
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const T = this.t, d = this.dur;
    const crush = ease(clamp01(T / d.aplastar));                 // el casco cede rápido
    for (const c of this.cascos) c.tg.influence = crush;
    for (const p of this.piezas) {                               // las piezas son chupadas hacia el centro
      const k = ease(clamp01((T - 0.15 - p.retardo) / d.succion));
      p.node.position.copyFrom(p.p0).scaleInPlace(1 - 0.88 * k);
      p.node.scaling.copyFrom(p.s0).scaleInPlace(1 - 0.7 * k);
      if (!p.node.rotationQuaternion) p.node.rotation.set(p.r0.x + p.giro.x * k, p.r0.y + p.giro.y * k, p.r0.z + p.giro.z * k);
    }
    for (const f of this.fx) {
      if (f.tipo === 'luz') f.o.intensity = 220 * Math.exp(-T * 3.2) * (T < 0.05 ? T / 0.05 : 1);
      if (f.tipo === 'onda') { const k = clamp01(T / 1.4); f.o.setEnabled(k < 1); f.o.scaling.setAll(2 + 34 * ease(k)); f.mat.alpha = 0.6 * (1 - k); }
    }
    if (T > 6) this.hecho = true;
  }

  /** Restaura casco, piezas y efectos. Seguro de llamar varias veces. */
  reset() {
    for (const c of this.cascos) {
      try { c.tg.influence = 0; c.mgr.removeTarget(c.tg); if (!c.previo) c.m.morphTargetManager = null; if (!c.previo) c.mgr.dispose(); } catch { /* malla ya liberada */ }
    }
    for (const p of this.piezas) {
      if (p.node.isDisposed?.()) continue;
      p.node.position.copyFrom(p.p0); p.node.scaling.copyFrom(p.s0); p.node.rotation.copyFrom(p.r0);
    }
    for (const f of this.fx) { try { f.o.dispose(); f.mat?.dispose(); f.tex?.dispose(); } catch { /* ya liberado */ } }
    this.view.interior?.setVentanas(true);
    this.cascos = []; this.piezas = []; this.fx = []; this.active = false; this.hecho = false; this.t = 0;
  }
}
