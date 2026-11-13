// Vista 3D del submarino armado: instancia las piezas en sus puntos de montaje y refleja la pose de la física.
import { SLog } from '../../core/SLog.js';
import { posicionSlot, geometriaCasco } from '../submarine/Stats.js';
import { dimsPieza, posicionesVisuales } from '../submarine/Placement.js';
import { Interior } from './Interior.js';

/** Mundo físico (x adelante, y izquierda, z arriba) → Babylon (x derecha, y arriba, z adelante). */
export const aBabylon = (v) => new BABYLON.Vector3(-v[1], v[2], v[0]);

const TINTE = { 'aluminio-6061': [0.78, 0.8, 0.83], 'aluminio-7075': [0.7, 0.75, 0.82], 'acero-hy80': [0.38, 0.42, 0.48], 'titanio-6al4v': [0.6, 0.58, 0.66], 'compuesto-carbono': [0.1, 0.1, 0.12] };

export class AssemblyView {
  constructor(sm, loader) {
    this.sm = sm; this.loader = loader;
    this.root = new BABYLON.TransformNode('submarino', sm.scene);
    this.root.rotationQuaternion = BABYLON.Quaternion.Identity();
    this.nodos = new Map(); // slotId -> { clave, node, meshes, slot }
    this._m = new BABYLON.Matrix(); this.hullAlpha = 1; this.dentro = false; this._seq = 0; this.cabinaNode = null; this.foco = null;
    this._hatchAnimation = null;
    this.interior = new Interior(sm, this.root);
    this._pickObserver = sm.scene.onPointerObservable.add((pi) => {
      if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
      const picked = pi.pickInfo?.pickedMesh, hatch = picked?.metadata?.hatchRoot;
      if (hatch) this.toggleEscotilla(hatch);
    });
  }

  /** Reconstruye solo lo que cambió y reposiciona todo según la geometría del casco. */
  async actualizar(assembly, stats) {
    const seq = ++this._seq;
    const casco = stats.casco;
    const vivos = new Set();
    for (const slot of assembly.slots) {
      const it = assembly.get(slot.id);
      if (!it || !casco) continue;
      vivos.add(slot.id);
      const clave = `${it.part.id}|${it.material?.id ?? ''}|${casco.id}|${casco.radioM}x${casco.largoM}`;
      const prev = this.nodos.get(slot.id);
      if (prev && prev.clave === clave) { prev.slot = it.posRel ? { ...slot, posRel: it.posRel } : slot; continue; }
      if (prev) prev.node.dispose();
      const dims = this._dims(it.part, casco);
      const { node, meshes } = await this.loader.cargarPieza(it.part, dims, slot.id);
      if (seq !== this._seq) { node.dispose(); return; } // llegó una actualización más nueva
      node.parent = this.root;
      this._tinte(it, meshes);
      for (const m of meshes) m.metadata = { ...(m.metadata ?? {}), slotId: slot.id }; // identifica la pieza al apuntar con el ratón
      this.nodos.set(slot.id, { clave, node, meshes, slot: it.posRel ? { ...slot, posRel: it.posRel } : slot, part: it.part });
    }
    for (const [id, n] of [...this.nodos]) if (!vivos.has(id)) { n.node.dispose(); this.nodos.delete(id); }
    // posiciones (en el nodo contenedor: se suma el desfase de centrado calculado al ajustar)
    // Las piezas no se atraviesan: cada una se dibuja en su posición libre más cercana (la física no cambia).
    const visual = posicionesVisuales(assembly, casco);
    for (const [id, n] of this.nodos) {
      const v = visual.get(id);
      const b = v ? new BABYLON.Vector3(v.pos.x, v.pos.y, v.pos.z) : (() => { const p = posicionSlot(n.slot, casco); return new BABYLON.Vector3(-p[1], p[2], p[0]); })();
      if (!n.base) n.base = n.node.position.clone();
      n.node.position = n.base.add(b);
    }
    this.cabinaNode = this.nodos.get('cabina')?.node ?? null;
    this.interior.construir(this.nodos.has('casco') ? casco : null);
    this._visibilidad();
    this._focos(assembly, stats);
  }

  _dims(part, casco) {
    if (part.tipo === 'casco') { const { r, L } = geometriaCasco(casco); return { largo: L, ancho: 2 * r, alto: 2 * r }; }
    return dimsPieza(part, casco); // Las dimensiones se adaptan proporcionalmente al casco (misma regla que la colocación)
  }

  _tinte(it, meshes) {
    if (it.part.tipo !== 'casco') return;
    const c = TINTE[it.material?.id]; if (!c) return;
    for (const m of meshes) {
      const mat = m.material; if (!mat) continue;
      if (mat.albedoColor) mat.albedoColor = new BABYLON.Color3(...c);
      else if (mat.diffuseColor) mat.diffuseColor = new BABYLON.Color3(...c);
    }
  }

  /** Alterna apertura/cierre de la escotilla con una animación de bisagra. */
  toggleEscotilla(node = this.nodos.get('escotilla')?.node) {
    const pivot = node?.metadata?.hatchPivot;
    if (!pivot) return false;
    const abierta = !node.metadata.hatchOpen;
    node.metadata.hatchOpen = abierta;
    const anim = new BABYLON.Animation('animacion-escotilla', 'rotation.z', 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([{ frame: 0, value: pivot.rotation.z }, { frame: 24, value: abierta ? 1.45 : 0 }]);
    this.sm.scene.stopAnimation(pivot);
    this.sm.scene.beginDirectAnimation(pivot, [anim], 0, 24, false, 1.15);
    return abierta;
  }

  /** Casco semitransparente para ver las piezas internas (pantalla de ensamblaje). */
  /** Luces de la nave (foco exterior, luz y tiras del interior). Solo aspecto. */
  setLuces(b) { this.lucesOn = b; this._aplicarLuces(b); }
  _aplicarLuces(on) {
    const k = this.focosDanados ? 0.35 : 1; // foco averiado: luce débil aunque esté encendido
    this.foco?.setEnabled(on); this.relleno?.setEnabled(on); this.cono?.setEnabled(on); this.interior?.setLuces(on);
    if (this.foco) this.foco.intensity = 14 * k;
    if (this.relleno) this.relleno.intensity = 2.2 * k;
    if (this.matCono) this.matCono.alpha = 0.024 * k;
  }
  /** Los focos y las luces de cabina parpadean durante `seg` segundos (p. ej., tras un choque). */
  parpadear(seg = 5) { this._parpadeo = seg; this._pt = 0; }
  setFocosDanados(b) { this.focosDanados = b; this._aplicarLuces(this.lucesOn !== false); }
  actualizarLuces(dt) {
    if (!(this._parpadeo > 0)) { if (this._parpadeando) { this._parpadeando = false; this._aplicarLuces(this.lucesOn !== false); } return; }
    this._parpadeo -= dt; this._parpadeando = true;
    if ((this._pt -= dt) <= 0) { this._on = Math.random() > 0.5; this._pt = 0.05 + Math.random() * 0.2; }
    this._aplicarLuces(this.lucesOn !== false && this._on);
  }
  setCascoAlpha(a) { this.hullAlpha = a; this._visibilidad(); }
  /** Cámara dentro de la cabina: aparece el interior con el casco opaco. */
  setDentro(b) {
    if (this.dentro === b) return; this.dentro = b; this.interior?.setDentro(b);
    this.persona = b ? this._nuevaPersona() : null; this._cajas = null;
    this._visibilidad();
  }
  // --- Persona dentro del casco: mirar con el ratón y caminar por la cabina ---
  _nuevaPersona() { const c = this.interior?.casco; if (!c) return null; const o = this.interior.ojosLocal(c); return { x: 0, z: o.z, z0: o.z, y: o.y, yaw: 0, pitch: 0, caminando: false, ult: { x: 0, z: o.z } }; }
  get caminando() { return !!this.persona?.caminando; }
  setCaminar(b) {
    const p = this.persona; if (!p || p.caminando === b) return;
    p.caminando = b; if (!b) { p.x = 0; p.z = p.z0; }
    p.ult = { x: p.x, z: p.z }; this._visibilidad();
  }
  girar(dYaw, dPitch) { const p = this.persona; if (!p) return; p.yaw += dYaw; p.pitch = Math.min(1.35, Math.max(-1.35, p.pitch + dPitch)); }
  /** Avanza (adelante/lateral en -1..1) a 1.1 m/s sin salir del casco ni atravesar piezas a la altura de los ojos. */
  mover(adelante, lateral, dt) {
    const p = this.persona, casco = this.interior?.casco; if (!p?.caminando || !casco) return;
    const v = 1.1 * dt, sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const dx = (sy * adelante + cy * lateral) * v, dz = (cy * adelante - sy * lateral) * v;
    if (this._libre(p.x + dx, p.z)) p.x += dx;
    if (this._libre(p.x, p.z + dz)) p.z += dz;
    if (Math.hypot(p.x - p.ult.x, p.z - p.ult.z) > 0.05) { p.ult = { x: p.x, z: p.z }; this._visibilidad(); }
  }
  _libre(x, z) {
    const p = this.persona, c = this.interior.casco, { r, L } = geometriaCasco(c), R = 0.16;
    if (c.forma === 'esfera') { if (Math.hypot(x, z) > 0.8 * r - R) return false; }
    else {
      const lim = Math.sqrt(Math.max(0.0025, (0.84 * r) ** 2 - p.y * p.y)) - R;
      if (Math.abs(x) > lim || Math.abs(z) > L / 2 - 0.4) return false;
    }
    this._cajas ??= this._calcularCajas();
    for (const b of this._cajas) { // solo estorba lo que está a la altura de la cabeza
      if (p.y + 0.12 < b.lo.y || p.y - 0.12 > b.hi.y) continue;
      if (x > b.lo.x - R && x < b.hi.x + R && z > b.lo.z - R && z < b.hi.z + R) return false;
    }
    return true;
  }
  _calcularCajas() {
    const out = [];
    for (const [id, n] of this.nodos) { if (id === 'casco' || id === 'cabina') continue; const b = this._cajaLocal(n); if (b) out.push(b); }
    return out;
  }
  /** Caja envolvente de una pieza en ejes del casco. */
  _cajaLocal(n) {
    const B = BABYLON, root = this.root; root.computeWorldMatrix(true);
    const inv = root.getWorldMatrix().clone().invert();
    const lo = new B.Vector3(Infinity, Infinity, Infinity), hi = new B.Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of n.meshes) {
      if (!m.getBoundingInfo || !m.getTotalVertices?.()) continue;
      m.computeWorldMatrix(true);
      for (const v of m.getBoundingInfo().boundingBox.vectorsWorld) { const l = B.Vector3.TransformCoordinates(v, inv); lo.minimizeInPlace(l); hi.maximizeInPlace(l); }
    }
    return Number.isFinite(lo.x) ? { lo, hi } : null;
  }
  /** Extremos [z mín, z máx] (m, eje del casco, + proa) de todo lo montado, para el contacto con el fondo. */
  extensionZ() {
    let z0 = Infinity, z1 = -Infinity;
    for (const [id, n] of this.nodos) { if (id === 'cabina' && false) continue; const b = this._cajaLocal(n); if (b) { z0 = Math.min(z0, b.lo.z); z1 = Math.max(z1, b.hi.z); } }
    return Number.isFinite(z0) ? [z0, z1] : null;
  }
  /** Puntos de contacto (ejes del casco: x, y, z, radio): esquinas de la silueta completa y puntos bajos de cada pieza exterior. */
  puntosContacto() {
    const lo = new BABYLON.Vector3(Infinity, Infinity, Infinity), hi = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity), pts = [];
    for (const [id, n] of this.nodos) {
      const b = this._cajaLocal(n); if (!b) continue;
      lo.minimizeInPlace(b.lo); hi.maximizeInPlace(b.hi);
      if (id !== 'casco' && n.slot.externo) pts.push([(b.lo.x + b.hi.x) / 2, b.lo.y, (b.lo.z + b.hi.z) / 2, 0.1]); // base de cada pieza exterior
    }
    if (!Number.isFinite(lo.x)) return [];
    const m = 0.1, xs = [lo.x + m, hi.x - m], ys = [lo.y + m, hi.y - m], zs = [lo.z + m, hi.z - m];
    for (const x of xs) for (const y of ys) for (const z of zs) pts.push([x, y, z, m]);
    for (const z of zs) pts.push([0, lo.y + m, z, m]);                    // quilla en proa y popa
    for (const x of xs) pts.push([x, 0, (lo.z + hi.z) / 2, m]);           // costados
    return pts;
  }
  /** Dirección de la mirada en el mundo (la proa cuando no hay persona). */
  direccionMirada() {
    const p = this.persona; if (!p) return this.adelante;
    const cp = Math.cos(p.pitch), d = new BABYLON.Vector3(Math.sin(p.yaw) * cp, Math.sin(p.pitch), Math.cos(p.yaw) * cp);
    return BABYLON.Vector3.TransformNormal(d, this.root.getWorldMatrix()).normalize();
  }
  _visibilidad() {
    const h = this.nodos.get('casco');
    if (h) for (const m of h.meshes) {
      const mt = m.material, pbr = mt?.getClassName?.() === 'PBRMaterial';
      if (pbr) { // los GLB fijan transparencyMode=OPAQUE, que ignora `visibility`: se gobierna con el propio material
        mt.transparencyMode = this.hullAlpha < 0.95 ? BABYLON.Material.MATERIAL_ALPHABLEND : BABYLON.Material.MATERIAL_OPAQUE;
        mt.alpha = this.hullAlpha; mt.backFaceCulling = false; mt.twoSidedLighting = true; if (m.visibility !== undefined) m.visibility = 1;
        const solido = this.hullAlpha >= 0.95; mt.needDepthPrePass = solido; mt.forceDepthWrite = solido; // casco sólido: oculta de verdad lo que hay detrás
      } else if (m.visibility !== undefined) m.visibility = this.hullAlpha;
    }
    const estorban = this.dentro ? this._estorban() : new Set();
    for (const [id, n] of this.nodos) {
      if (id === 'casco') continue;
      if (!n.slot.externo) n.node.setEnabled((this.hullAlpha < 0.95 || this.dentro) && !estorban.has(id));
      else if (id !== 'cabina') n.node.setEnabled(!estorban.has(id)); // exterior: visible, salvo si invade el pasillo del piloto
    }
    this.interior?.setEnabled(this.hullAlpha < 0.95 || this.dentro);
    this.interior?.setVentanas(true);
    this.cabinaNode?.setEnabled(!this.dentro); // el domo exterior taparía la vista desde dentro
  }

  /** Piezas que cruzan la zona de visión del piloto (pasillo hacia proa; caminando, la cabeza): se ocultan en primera persona. */
  _estorban() {
    const out = new Set(), casco = this.interior?.casco, p = this.persona;
    if (!casco) return out;
    let min, max;
    if (p?.caminando) { const h = 0.3; min = new BABYLON.Vector3(p.x - h, p.y - h, p.z - h); max = new BABYLON.Vector3(p.x + h, p.y + h, p.z + h); }
    else ({ min, max } = this.interior.corredor(casco));
    for (const [id, n] of this.nodos) {
      if (id === 'casco' || id === 'controles') continue; // también los exteriores que invaden la cabina (escotilla, torre…)
      const b = this._cajaLocal(n); if (!b) continue;
      if (b.lo.x <= max.x && b.hi.x >= min.x && b.lo.y <= max.y && b.hi.y >= min.y && b.lo.z <= max.z && b.hi.z >= min.z) out.add(id);
    }
    return out;
  }

  _focos(assembly, stats) {
    const B = BABYLON, scene = this.sm.scene;
    for (const k of ['foco', 'relleno', 'cono']) { this[k]?.dispose(false, k === 'cono'); this[k] = null; }
    const f = this.nodos.get('focos');
    if (!f) return;
    const alc = Math.max(22 + stats.alcanceLuzM * 1.8, 28);                 // alcance visual del haz (m): bajo el agua se nota de verdad
    const dir = new B.Vector3(0, -0.12, 1).normalize(), semi = 0.62;           // semiángulo del haz (rad)
    // Haz principal: ilumina el fondo, rocas, corales y peces que enfoca.
    const sp = new B.SpotLight('foco', B.Vector3.Zero(), dir, semi * 2, 5, scene);
    sp.parent = f.node; sp.diffuse = new B.Color3(1, 0.96, 0.85); sp.specular = new B.Color3(1, 0.96, 0.85);
    sp.falloffType = B.Light.FALLOFF_STANDARD; sp.range = alc; sp.intensity = 14;
    // Luz de relleno suave alrededor del submarino (casco, aletas, peces cercanos).
    const rl = new B.PointLight('foco-relleno', new B.Vector3(0, 0.1, 0.5), scene);
    rl.parent = f.node; rl.diffuse = new B.Color3(0.85, 0.95, 1); rl.falloffType = B.Light.FALLOFF_STANDARD; rl.range = alc * 0.55; rl.intensity = 2.2;
    // Cono de luz visible (polvo y partículas en suspensión): aditivo, se desvanece con la distancia.
    const grad = new B.DynamicTexture('cono-grad', { width: 4, height: 128 }, scene, false), c = grad.getContext(), g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.08, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 4, 128); grad.update(); grad.hasAlpha = true;
    const mat = new B.StandardMaterial('mat-cono', scene);
    mat.disableLighting = true; mat.emissiveColor = new B.Color3(0.7, 0.82, 0.8); mat.opacityTexture = grad; mat.alpha = 0.024; mat.alphaMode = B.Engine.ALPHA_ADD;
    mat.backFaceCulling = false; mat.fogEnabled = false; mat.disableDepthWrite = true;
    // Varias capas anidadas (de ancha a estrecha) dan un haz de bordes suaves, más intenso en el centro.
    const cono = new B.TransformNode('cono-foco', scene); cono.parent = f.node;
    cono.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Axis.Y.scale(-1), dir, new B.Quaternion());
    cono.position = dir.scale(alc / 2 * 0.0);
    for (const k of [1, 0.88, 0.76, 0.64, 0.52, 0.4, 0.28]) {
      const capa = B.MeshBuilder.CreateCylinder('cono-capa', { height: alc, diameterTop: 0.05, diameterBottom: 2 * alc * Math.tan(semi) * k, tessellation: 40, cap: B.Mesh.NO_CAP }, scene);
      capa.material = mat; capa.isPickable = false; capa.parent = cono; capa.position.y = -alc / 2; // punta en el foco, hacia -Y local
    }
    this.foco = sp; this.relleno = rl; this.cono = cono; this.matCono = mat;
    this._aplicarLuces(this.lucesOn !== false);
  }

  /** Posición/orientación a partir de la física (coordenadas del mundo físico). */
  aplicarPose(pos, R) {
    this.root.position = aBabylon(pos);
    // Ejes del cuerpo en Babylon: derecha = -izquierda, arriba, adelante. (FromLookDirectionLH invierte la proa.)
    const der = aBabylon(R[1]).scale(-1), arr = aBabylon(R[2]), ade = aBabylon(R[0]);
    BABYLON.Matrix.FromXYZAxesToRef(der, arr, ade, this._m);
    BABYLON.Quaternion.FromRotationMatrixToRef(this._m, this.root.rotationQuaternion);
  }
  ponerEn(profundidadM) { this.root.position.set(0, -profundidadM, 0); this.root.rotationQuaternion = BABYLON.Quaternion.Identity(); }
  get adelante() { return this.root.getDirection(BABYLON.Axis.Z); }
  get arriba() { return this.root.getDirection(BABYLON.Axis.Y); }
  posCabina() {
    if (this.dentro && this.interior?.casco) {
      const o = this.interior.ojosLocal(this.interior.casco), p = this.persona;
      return BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(p?.x ?? 0, o.y, p?.z ?? o.z), this.root.getWorldMatrix());
    }
    return this.cabinaNode ? this.cabinaNode.getAbsolutePosition().clone() : this.root.position.clone(); }
  dispose() {
    if (this._pickObserver) this.sm.scene.onPointerObservable.remove(this._pickObserver);
    this.nodos.forEach((n) => n.node.dispose()); this.nodos.clear(); SLog.debug('AssemblyView', 'liberado');
  }
}
