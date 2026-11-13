// Acondicionamiento interior del casco (solo visual): forro con paneles, cuadernas, tuberías, cableado y
// tiras de luz. Todo queda entre 0,86 y 0,97 del radio, fuera de la zona donde se colocan las piezas internas.
import { geometriaCasco } from '../submarine/Stats.js';

export class Interior {
  constructor(sm, padre) {
    this.sm = sm; this.padre = padre; this.raiz = null; this.clave = '';
    this.mats = null;
  }

  _materiales() {
    if (this.mats) return this.mats;
    const B = BABYLON, scene = this.sm.scene;
    const pbr = (nombre, base, escala, tinte) => {
      const m = new B.PBRMaterial(`int-${nombre}`, scene);
      const tex = (s) => { const t = new B.Texture(`assets/textures/${base}_${s}.png`, scene); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.uScale = escala[0]; t.vScale = escala[1]; t.anisotropicFilteringLevel = 8; return t; };
      m.albedoTexture = tex('albedo'); m.bumpTexture = tex('normal'); m.metallicTexture = tex('orm');
      m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true; m.useAmbientOcclusionFromMetallicTextureRed = true;
      m.metallic = 1; m.roughness = 1; m.environmentIntensity = 0.8; if (tinte) m.albedoColor = new B.Color3(...tinte);
      return m;
    };
    const luz = new B.StandardMaterial('int-luz', scene);
    luz.disableLighting = true; luz.emissiveColor = new B.Color3(1, 0.95, 0.8); luz.fogEnabled = false;
    this.mats = { panel: pbr('panel', 'panel_interior', [6, 2], [0.9, 0.95, 1]), acero: pbr('acero', 'acero', [2, 2]), oscuro: pbr('oscuro', 'metal_oscuro', [2, 2]), suelo: pbr('suelo', 'placa_antideslizante', [8, 1.5]), luz };
    this.mats.panel.backFaceCulling = true;
    return this.mats;
  }

  /** (Re)construye el interior si cambió el casco; `casco` null lo elimina. */
  construir(casco) {
    const clave = casco ? `${casco.id}|${casco.radioM}|${casco.largoM}|${casco.forma}` : '';
    if (clave === this.clave) return;
    this.clave = clave; this.casco = casco; this.raiz?.dispose(false, false); this.raiz = null;
    if (!casco) { this.vent?.dispose(false, false); this.vent = null; return; }
    this._ventanas(casco);
    const B = BABYLON, scene = this.sm.scene, M = this._materiales();
    const { r, L } = geometriaCasco(casco);
    const raiz = new B.TransformNode('interior', scene); raiz.parent = this.padre; this.raiz = raiz;
    const add = (m, mat) => { m.parent = raiz; m.material = mat; m.isPickable = false; return m; };
    const esfera = casco.forma === 'esfera';
    const R = r * 0.955;
    // Forro: solo visible desde dentro (la cara cercana al observador exterior se descarta).
    if (esfera) {
      add(B.MeshBuilder.CreateSphere('forro', { diameter: 2 * R, segments: 32, sideOrientation: B.Mesh.BACKSIDE }, scene), M.panel);
    } else {
      const c = B.MeshBuilder.CreateCylinder('forro', { height: L * 0.97, diameter: 2 * R, tessellation: 48, cap: B.Mesh.NO_CAP, sideOrientation: B.Mesh.BACKSIDE }, scene);
      c.rotation.x = Math.PI / 2; c.bakeCurrentTransformIntoVertices(); add(c, M.panel);
    }
    // Mamparos de proa y popa con el gran ventanal frontal (vista al mar desde la cabina).
    const MV = this.matVent;
    if (!esfera) {
      const zf = L * 0.97 / 2;
      const proa = B.MeshBuilder.CreateDisc('mamparo-proa', { radius: R, tessellation: 48 }, scene); proa.position.z = zf; add(proa, M.panel);
      const popa = B.MeshBuilder.CreateDisc('mamparo-popa', { radius: R, tessellation: 48 }, scene); popa.position.z = -zf; popa.rotation.y = Math.PI; add(popa, M.oscuro);
      const mar = B.MeshBuilder.CreateDisc('ventanal-proa', { radius: R * 0.62, tessellation: 48 }, scene); mar.position.z = zf - 0.01; add(mar, MV.mar);
      const marco = B.MeshBuilder.CreateTorus('marco-proa', { diameter: R * 1.28, thickness: R * 0.07, tessellation: 56 }, scene); marco.rotation.x = Math.PI / 2; marco.position.z = zf - 0.012; add(marco, MV.marco);
    } else {
      const mar = B.MeshBuilder.CreateDisc('ventanal-proa', { radius: R * 0.38, tessellation: 40 }, scene); mar.position.z = R * 0.9; add(mar, MV.mar);
      const marco = B.MeshBuilder.CreateTorus('marco-proa', { diameter: R * 0.78, thickness: R * 0.05, tessellation: 48 }, scene); marco.rotation.x = Math.PI / 2; marco.position.z = R * 0.895; add(marco, MV.marco);
    }
    // Cuadernas (anillos estructurales) y tiras de luz entre ellas.
    const largo = esfera ? 2 * R * 0.9 : L * 0.9, n = Math.max(3, Math.round(largo / (r * 1.2)));
    for (let i = 0; i < n; i++) {
      const z = (-0.5 + (i + 0.5) / n) * largo;
      const radioAnillo = esfera ? Math.sqrt(Math.max(0, R * R - z * z)) * 0.995 : R * 0.995;
      if (radioAnillo < r * 0.25) continue;
      const t = B.MeshBuilder.CreateTorus(`cuaderna-${i}`, { diameter: 2 * radioAnillo, thickness: r * 0.035, tessellation: 56 }, scene);
      t.rotation.x = Math.PI / 2; t.position.z = z; add(t, M.acero);
    }
    // Tuberías y mazos de cables a lo largo del casco (a 0,90 R, fuera de la zona de piezas).
    const tub = (nombre, ang, rad, grosor, mat) => {
      const cil = B.MeshBuilder.CreateCylinder(nombre, { height: largo * 0.96, diameter: grosor, tessellation: 12 }, scene);
      cil.rotation.x = Math.PI / 2; cil.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0); add(cil, mat);
    };
    const rt = R * 0.9;
    if (!esfera) [[-2.55, 0.026, M.acero], [-2.15, 0.018, M.oscuro], [2.45, 0.026, M.acero], [3.65, 0.016, M.oscuro], [3.85, 0.016, M.oscuro]].forEach(([a, g, m], i) => tub(`tuberia-${i}`, a, rt, r * g * 2, m));
    // Tiras de luz en la parte alta.
    if (!esfera) for (const lado of [-1, 1]) {
      const a = Math.PI / 2 + lado * 0.62, rl = R * 0.9;
      const cinta = B.MeshBuilder.CreateBox(`luz-techo-${lado}`, { width: r * 0.05, height: r * 0.02, depth: largo * 0.7 }, scene);
      cinta.position.set(Math.cos(a) * rl, Math.sin(a) * rl, 0); cinta.rotation.z = a - Math.PI / 2; add(cinta, M.luz);
    }
    // Pasarela de placa antideslizante en el fondo.
    if (!esfera) {
    const suelo = B.MeshBuilder.CreateBox('pasarela', { width: r * 0.62, height: r * 0.025, depth: largo * 0.85 }, scene);
    suelo.position.y = -R * 0.9; add(suelo, M.suelo);
    }
    const luz = new B.PointLight('luz-interior', new B.Vector3(0, r * 0.45, 0), scene);
    this.luz = luz; luz.parent = raiz; luz.diffuse = new B.Color3(1, 0.93, 0.78); luz.intensity = 0.8; luz.range = Math.max(L, 2 * r) * 0.9;
    this.setLuces(this.lucesOn !== false);
    raiz.getChildMeshes().forEach((m) => { m.alwaysSelectAsActiveMesh = false; m.receiveShadows = true; });
  }

  /** Ventanillas con vidrio y vista a una cabina iluminada. Se ven siempre, también con el casco opaco. */
  _ventanas(casco) {
    const B = BABYLON, scene = this.sm.scene;
    this.vent?.dispose(false, false); this.vent = null;
    const { r, L } = geometriaCasco(casco), esfera = casco.forma === 'esfera';
    const raiz = new B.TransformNode('ventanas', scene); raiz.parent = this.padre; this.vent = raiz;
    const dentro = new B.TransformNode('ventanas-dentro', scene); dentro.parent = raiz; dentro.setEnabled(!!this.dentro); this.ventDentro = dentro;
    if (!this.matVent) {
      const tx = new B.DynamicTexture('vista-cabina', { width: 256, height: 256 }, scene, true), c = tx.getContext();
      const g = c.createRadialGradient(128, 110, 10, 128, 128, 150); g.addColorStop(0, '#ffd9a0'); g.addColorStop(0.6, '#b9772f'); g.addColorStop(1, '#3a2410');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#1b2430'; c.fillRect(0, 170, 256, 86); c.fillRect(30, 120, 70, 70);            // consolas y asiento
      c.fillStyle = '#4fd1ff'; c.fillRect(40, 150, 50, 18); c.fillRect(160, 178, 60, 12);          // pantallas
      c.fillStyle = '#ff9d3a'; for (let i = 0; i < 6; i++) c.fillRect(120 + i * 16, 205, 7, 7);    // luces de estado
      tx.update();
      const vista = new B.StandardMaterial('mat-vista-cabina', scene);
      vista.disableLighting = true; vista.emissiveTexture = tx; vista.emissiveTexture.level = 0.6; vista.emissiveColor = new B.Color3(0, 0, 0); vista.fogEnabled = false;
      const vidrio = new B.PBRMaterial('mat-vidrio', scene);
      vidrio.albedoColor = new B.Color3(0.7, 0.9, 1); vidrio.metallic = 0; vidrio.roughness = 0.03; vidrio.alpha = 0.28; vidrio.environmentIntensity = 1.4; vidrio.backFaceCulling = false;
      const marco = new B.PBRMaterial('mat-marco', scene);
      marco.albedoColor = new B.Color3(0.55, 0.42, 0.22); marco.metallic = 0.9; marco.roughness = 0.35;
      const mt = new B.DynamicTexture('vista-mar', { width: 64, height: 128 }, scene, true), mc = mt.getContext();
      const mg = mc.createLinearGradient(0, 0, 0, 128); mg.addColorStop(0, '#9fe0e8'); mg.addColorStop(0.5, '#3a97b0'); mg.addColorStop(1, '#0f4a63');
      mc.fillStyle = mg; mc.fillRect(0, 0, 64, 128); mt.update();
      const mar = new B.StandardMaterial('mat-vista-mar', scene);
      mar.disableLighting = true; mar.emissiveTexture = mt; mar.emissiveColor = new B.Color3(0, 0, 0); mar.fogEnabled = false;
      this.matVent = { vista, vidrio, marco, mar };
    }
    const M = this.matVent, rad = r * 0.19;
    // posiciones (ángulo en el plano XY respecto al eje del casco, z a lo largo)
    const sitios = [];
    const zs = esfera ? [0] : [-0.28, 0, 0.28].map((k) => k * L);
    for (const z of zs) for (const lado of [-1, 1]) sitios.push({ ang: lado > 0 ? 0 : Math.PI, z, y: 0.18 * r });
    if (esfera) sitios.push({ ang: Math.PI / 2 - 0.0, z: 0, y: 0, techo: true });
    for (const st of sitios) {
      const ro = esfera ? r : r;           // radio exterior sobre el que se apoya la ventana
      const nx = Math.cos(st.ang), ny = 0;
      const ang = st.ang;
      const nodo = new B.TransformNode('ventana', scene); nodo.parent = raiz;
      // radio local del casco a esa altura: posición sobre el cilindro a altura y
      const x = Math.sqrt(Math.max(0, ro * ro - st.y * st.y)) * Math.sign(nx || 1);
      nodo.position.set(x * 1.0, st.y, st.z);
      nodo.rotation.y = nx > 0 ? -Math.PI / 2 : Math.PI / 2;      // el disco mira hacia fuera (±x)
      const aro = B.MeshBuilder.CreateTorus('aro', { diameter: rad * 2.2, thickness: rad * 0.28, tessellation: 32 }, scene);
      aro.rotation.x = Math.PI / 2; aro.parent = nodo; aro.material = M.marco; aro.position.z = -0.01 * r;
      const fondo = B.MeshBuilder.CreateDisc('vista', { radius: rad * 1.02, tessellation: 32 }, scene);
      fondo.parent = nodo; fondo.material = M.vista; fondo.position.z = -0.008 * r;
      const vid = B.MeshBuilder.CreateDisc('vidrio', { radius: rad * 1.05, tessellation: 32 }, scene);
      vid.parent = nodo; vid.material = M.vidrio; vid.position.z = -0.016 * r;
      [aro, fondo, vid].forEach((m) => { m.isPickable = false; });
      // Cara interior: el mar visto desde dentro, con su marco, para la cámara de cabina.
      const ni = new B.TransformNode('ventana-int', scene); ni.parent = dentro;
      ni.position.set(x * 0.9, st.y, st.z); ni.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2;
      const ai = B.MeshBuilder.CreateTorus('aro-int', { diameter: rad * 2.2, thickness: rad * 0.3, tessellation: 32 }, scene);
      ai.rotation.x = Math.PI / 2; ai.parent = ni; ai.material = M.marco;
      const di = B.MeshBuilder.CreateDisc('mar-int', { radius: rad * 1.03, tessellation: 32 }, scene);
      di.parent = ni; di.material = M.mar; di.position.z = 0.004 * r;
      [ai, di].forEach((m) => { m.isPickable = false; });
    }
  }

  /** Posición local de los ojos del piloto (dentro de la cabina, mirando a proa). */
  ojosLocal(casco) { const { r, L } = geometriaCasco(casco); const esfera = casco.forma === 'esfera'; return { z: esfera ? -0.2 * r : L * 0.97 / 2 - Math.max(1.55, 2.6 * r), y: 0.1 * r }; }

  /** Pasillo de visión del piloto (ejes del casco): lo que lo cruce se oculta mientras se mira desde dentro. */
  corredor(casco) {
    const { r, L } = geometriaCasco(casco), o = this.ojosLocal(casco), B = BABYLON;
    return { min: new B.Vector3(-0.3 * r, o.y - 0.4 * r, o.z - 0.5), max: new B.Vector3(0.3 * r, o.y + 0.4 * r, Math.max(o.z + 0.6, L / 2 - 0.05)) };
  }

  /** Enciende o apaga la iluminación interior (luz puntual y tiras del techo). */
  setLuces(b) { this.lucesOn = b; this.luz?.setEnabled(b); const m = this.mats?.luz; if (m) m.emissiveColor.set(b ? 1 : 0.04, b ? 0.95 : 0.04, b ? 0.8 : 0.05); }

  setEnabled(b) { this.raiz?.setEnabled(b); }
  setVentanas(b) { this.vent?.setEnabled(b); }
  /** Cámara dentro de la cabina: se muestran las caras interiores de las ventanas. */
  setDentro(b) { this.dentro = b; this.ventDentro?.setEnabled(b); }
  /** El color del mar tras el cristal sigue la luz que llega a esa profundidad (0..1). */
  actualizarMar(luz) { const m = this.matVent?.mar; if (m) { m.emissiveTexture.level = 0.12 + 0.95 * luz; } }
}
