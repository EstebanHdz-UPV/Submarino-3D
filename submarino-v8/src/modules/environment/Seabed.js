// Lecho marino: carga lecho-marino.glb (modelo propio a escala 1:1). Si falta o no coincide con la fórmula de choque, usa el terreno procedural.
import { SLog } from '../../core/SLog.js';

/** Material PBR de suelo a partir de las texturas locales (albedo, normales, oclusión/rugosidad/metal). */
function materialPBR(B, scene, nombre, base, escala, nivelNormal, tinte) {
  const mat = new B.PBRMaterial(`mat-${nombre}`, scene);
  const tex = (suf) => { const t = new B.Texture(`assets/textures/${base}_${suf}.png`, scene); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.uScale = t.vScale = escala; t.anisotropicFilteringLevel = 8; return t; };
  mat.albedoTexture = tex('albedo'); mat.bumpTexture = tex('normal'); mat.bumpTexture.level = nivelNormal;
  mat.metallicTexture = tex('orm'); mat.useRoughnessFromMetallicTextureGreen = true; mat.useMetallnessFromMetallicTextureBlue = true; mat.useAmbientOcclusionFromMetallicTextureRed = true;
  mat.metallic = 1; mat.roughness = 1; if (tinte) mat.albedoColor = new B.Color3(...tinte);
  mat.environmentIntensity = 0.6;
  return mat;
}

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Seabed {
  constructor(sm, loader, fondoM = 250) {
    this.sm = sm; this.loader = loader; this.fondoM = fondoM; this.node = null; this.size = 800; this.rocas = []; this.colisiones = [];
  }
  /** Componentes del relieve en (x, z): ondulación base, meseta con acantilado, dorsales de arrecife y cañón. */
  _relieve(x, z) {
    const base = Math.sin(x * 0.045) * Math.cos(z * 0.037) * 3 + Math.sin(x * 0.12 + z * 0.09) * 1.2 + Math.sin(z * 0.2) * 0.4;
    const n = Math.sin(x * 0.011 + 0.7) * Math.cos(z * 0.009 + 0.3) + 0.5 * Math.sin(x * 0.023 + z * 0.017 + 1.3) + 0.25 * Math.sin(x * 0.051 - z * 0.043);
    const meseta = 38 * suave(0.34, 0.4, n);                                   // borde casi vertical: acantilado
    const d1 = z - 70 * Math.sin(x * 0.007 + 1) - 40, d2 = x - 60 * Math.sin(z * 0.006 + 2) + 90;
    const dorsal1 = 24 * Math.exp(-((d1 / 16) ** 2)) * (0.65 + 0.35 * Math.sin(x * 0.05));
    const dorsal2 = 18 * Math.exp(-((d2 / 14) ** 2)) * (0.7 + 0.3 * Math.sin(z * 0.06 + 1));
    const dx = x + z * 0.3 - 120, canon = -24 * Math.exp(-((dx / 13) ** 2)) * suave(-0.2, 0.1, n);
    return { base, meseta, dorsal1, dorsal2, canon };
  }
  /** Altura (y de Babylon) del fondo en (x, z). */
  heightAt(x, z) { const r = this._relieve(x, z); return -this.fondoM + r.base + r.meseta + r.dorsal1 + r.dorsal2 + r.canon; }
  /** 0..1: cuánto de "arrecife" hay en (x, z) (dorsales y bordes de meseta); sirve para colocar corales y algas. */
  arrecifeAt(x, z) { const r = this._relieve(x, z); return Math.min(1, r.dorsal1 / 18 + r.dorsal2 / 14 + (r.meseta > 3 && r.meseta < 36 ? 0.4 : 0) + (r.meseta >= 36 ? 0.25 : 0)); }
  /** Altura del lecho para el choque: la mayor entre la fórmula y la interpolación de la malla dibujada (el casco nunca queda dentro del suelo visible). */
  alturaColision(x, z) {
    const f = this.heightAt(x, z), R = this._rejilla; if (!R) return f;
    const n = R.n, u = (x + this.size / 2) / R.paso, v = (z + this.size / 2) / R.paso;
    if (u < 0 || v < 0 || u >= n - 1 || v >= n - 1) return f;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, h = R.h;
    const a = h[j * n + i], b = h[j * n + i + 1], c = h[(j + 1) * n + i], d = h[(j + 1) * n + i + 1];
    const bil = a * (1 - fu) * (1 - fv) + b * fu * (1 - fv) + c * (1 - fu) * fv + d * fu * fv;
    return Math.max(f, bil, Math.max(a, b, c, d) - 0.0); // el punto más alto de la celda: conservador en paredes casi verticales
  }
  /** Pendiente aproximada (0 plano … >1 muy empinado). */
  pendienteAt(x, z) { const e = 1.5; return Math.hypot(this.heightAt(x + e, z) - this.heightAt(x - e, z), this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e); }
  async build() {
    const B = BABYLON, scene = this.sm.scene;
    // Rejilla de alturas (mismos 261 x 261 nodos que lecho-marino.glb): la usa el choque del casco en ambos caminos.
    const n = 261, paso = this.size / 260, h = new Float32Array(n * n);
    let hMin = Infinity, hMax = -Infinity;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const y = this.heightAt(-this.size / 2 + i * paso, -this.size / 2 + j * paso);
      h[j * n + i] = y; if (y < hMin) hMin = y; if (y > hMax) hMax = y;
    }
    this._rejilla = { n, paso, h };
    const matArena = materialPBR(B, scene, 'lecho-arena', 'arena', 18, 1.0, [0.95, 0.9, 0.8]);

    // 1) Modelo propio lecho-marino.glb (relieve a escala 1:1 generado con la misma fórmula que heightAt).
    let malla = null;
    try {
      const { node, meshes, origen } = await this.loader.cargarPieza({ archivo: 'lecho-marino.glb', tipo: 'lecho' }, { ancho: this.size, alto: hMax - hMin, largo: this.size }, 'lecho');
      const m = meshes.find((x) => x.getTotalVertices?.() > 1000);
      if (origen === 'glb' && m) {
        node.position.y = -this.fondoM; // el relieve del modelo va de hMin a hMax respecto al fondo nominal
        node.computeWorldMatrix(true); m.computeWorldMatrix(true);
        const err = this._errorContraFormula(m);
        if (err < 0.05) { malla = m; this.node = node; }
        else { SLog.warn('Seabed', `lecho-marino.glb no coincide con el relieve de choque (error ${err.toFixed(2)} m); se usa el procedural`); node.dispose(); }
      } else node.dispose();
    } catch (e) { SLog.warn('Seabed', 'No se pudo cargar lecho-marino.glb', e?.message); }

    // 2) Respaldo procedural (RNF: alternativa ante recursos faltantes).
    if (!malla) {
      const g = B.MeshBuilder.CreateGround('lecho', { width: this.size, height: this.size, subdivisions: 260, updatable: true }, scene);
      const pos = g.getVerticesData(B.VertexBuffer.PositionKind);
      for (let i = 0; i < pos.length; i += 3) pos[i + 1] = this.heightAt(pos[i], pos[i + 2]);
      g.updateVerticesData(B.VertexBuffer.PositionKind, pos);
      const nor = []; B.VertexData.ComputeNormals(pos, g.getIndices(), nor); g.updateVerticesData(B.VertexBuffer.NormalKind, nor);
      malla = g; this.node = g;
    }
    this._pintar(malla);
    const previo = malla.material;
    malla.material = matArena;
    if (previo && previo !== matArena) previo.dispose(false, true); // libera las texturas embebidas del GLB (se usa la arena local)
    malla.isPickable = false;
    this.origen = this.node === malla ? 'procedural' : 'glb';
    this.texturas = { arena: matArena.albedoTexture };
    this._rocas();
    SLog.info('Seabed', this.origen === 'glb' ? 'Lecho cargado desde lecho-marino.glb' : 'Lecho procedural', { fondoM: this.fondoM, relieveM: +(hMax - hMin).toFixed(1) });
    return this;
  }
  /** Posiciones de los vértices en coordenadas de mundo. */
  _posMundo(mesh) {
    const B = BABYLON, local = mesh.getVerticesData(B.VertexBuffer.PositionKind), W = mesh.getWorldMatrix(), out = new Float32Array(local.length), v = new B.Vector3();
    for (let i = 0; i < local.length; i += 3) { B.Vector3.TransformCoordinatesFromFloatsToRef(local[i], local[i + 1], local[i + 2], W, v); out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z; }
    return out;
  }
  /** Error máximo (m) entre la altura del modelo y heightAt en una muestra de vértices. */
  _errorContraFormula(mesh) {
    const p = this._posMundo(mesh); let err = 0;
    for (let i = 0; i < p.length; i += 3 * 97) err = Math.max(err, Math.abs(p[i + 1] - this.heightAt(p[i], p[i + 2])));
    return err;
  }
  /** Color por pendiente y zona (arena en lo llano, roca en acantilados, pardo-verdoso en el arrecife) y UV lateral en paredes. */
  _pintar(mesh) {
    const B = BABYLON, pos = this._posMundo(mesh), col = [];
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], z = pos[i + 2], pend = Math.min(1, this.pendienteAt(x, z) / 1.2), arr = this.arrecifeAt(x, z) * (1 - pend);
      const k = suave(0.15, 0.7, pend), ruido = 0.92 + 0.08 * Math.sin(x * 0.7) * Math.cos(z * 0.9);
      col.push((1 - k) * (1 - 0.3 * arr) * ruido + k * 0.42, (1 - k) * (1 - 0.12 * arr) * ruido + k * 0.4, (1 - k) * (1 - 0.4 * arr) * ruido + k * 0.38, 1);
    }
    mesh.setVerticesData(B.VertexBuffer.ColorKind, col);
    // En las paredes empinadas la textura se estiraría en vertical: allí se proyecta de lado (u horizontal, v por altura).
    const uv = mesh.getVerticesData(B.VertexBuffer.UVKind);
    if (uv) {
      for (let i = 0, j = 0; i < pos.length; i += 3, j += 2) {
        if (this.pendienteAt(pos[i], pos[i + 2]) > 0.9) { uv[j] = (pos[i] + pos[i + 2]) * 0.6 / this.size + 0.5; uv[j + 1] = (pos[i + 1] + this.fondoM) / this.size * 1.1; }
      }
      mesh.setVerticesData(B.VertexBuffer.UVKind, uv);
    }
  }
  setEnabled(b) { this.node?.setEnabled(b); this.rocas.forEach((r) => r.setEnabled(b)); }
  _rocas() {
    const B = BABYLON, scene = this.sm.scene;
    const mat = materialPBR(B, scene, 'roca', 'roca', 1.5, 1.2, [0.85, 0.88, 0.9]);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Tres siluetas base de roca; el resto son instancias con escala y giro propios.
    const base = [0, 1, 2].map((i) => {
      const m = B.MeshBuilder.CreateIcoSphere(`roca-base-${i}`, { radius: 0.5, subdivisions: 4, updatable: true }, scene);
      const pos = m.getVerticesData(B.VertexBuffer.PositionKind);
      for (let k = 0; k < pos.length; k += 3) {
        const f = 1 + 0.28 * Math.sin(pos[k] * 2.3 + i * 2.1) * Math.cos(pos[k + 2] * 2.1 - i) + 0.14 * Math.sin(pos[k + 1] * 5 + pos[k] * 3 + i);
        pos[k] *= f; pos[k + 1] *= f; pos[k + 2] *= f;
      }
      m.updateVerticesData(B.VertexBuffer.PositionKind, pos);
      const nor = []; B.VertexData.ComputeNormals(pos, m.getIndices(), nor); m.updateVerticesData(B.VertexBuffer.NormalKind, nor);
      m.material = mat; m.isVisible = false; m.isPickable = false; this.rocas.push(m); return m;
    });
    const poner = (nombre, x, z, sx, sy, sz, hundir) => {
      const b = base[Math.floor(rnd() * 3)], m = b.createInstance(nombre);
      m.position.set(x, this.heightAt(x, z) + sy * (hundir ?? 0.15), z); m.scaling.set(sx, sy, sz); m.rotation.y = rnd() * 6.28;
      m.isPickable = false; m.freezeWorldMatrix(); this.rocas.push(m);
      const ext = b.getBoundingInfo().boundingBox.extendSize; // semiejes reales de la silueta deformada
      this.colisiones.push({ x, y: m.position.y, z, ax: ext.x * sx, ay: ext.y * sy, az: ext.z * sz, rot: m.rotation.y }); // elipsoide para el choque del casco
    };
    // Bloques: más abundantes al pie de los acantilados y sobre las dorsales.
    for (let i = 0, n = 0; n < 170 && i < 3000; i++) {
      const x = (rnd() - 0.5) * 640, z = (rnd() - 0.5) * 640;
      if (this.pendienteAt(x, z) < 0.25 && this.arrecifeAt(x, z) < 0.35 && rnd() > 0.12) continue;
      const s = 0.8 + Math.pow(rnd(), 2) * 6; poner(`roca-${n++}`, x, z, s * (0.8 + rnd() * 0.5), s * 0.65, s * (0.8 + rnd() * 0.5));
    }
    // Pilares y agujas de roca que sobresalen de dorsales y mesetas.
    for (let i = 0, n = 0; n < 28 && i < 3000; i++) {
      const x = (rnd() - 0.5) * 600, z = (rnd() - 0.5) * 600;
      if (this.arrecifeAt(x, z) < 0.45) continue;
      const w = 2 + rnd() * 4; poner(`pilar-${n++}`, x, z, w, w * (2.5 + rnd() * 4), w * 0.9, 0.35);
    }
  }
}
