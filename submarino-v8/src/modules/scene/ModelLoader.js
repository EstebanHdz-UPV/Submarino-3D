// Carga modelos .glb/.gltf. Si falla, usa una pieza procedural (RNF: alternativa ante recursos faltantes).
import { SLog } from '../../core/SLog.js';

const COLORES = {
  casco: [0.55, 0.62, 0.7], propulsion: [0.25, 0.28, 0.32], lastre: [0.85, 0.55, 0.15], cabina: [0.3, 0.65, 0.95], aletas: [0.2, 0.3, 0.45],
  torre: [0.45, 0.5, 0.55], bateria: [0.2, 0.7, 0.35], lastreFijo: [0.3, 0.3, 0.32], flotabilidad: [0.95, 0.8, 0.25], focos: [1, 0.95, 0.6], sonar: [0.7, 0.3, 0.3], controles: [0.16, 0.2, 0.24], periscopio: [0.48, 0.52, 0.58], portillas: [0.12, 0.16, 0.2], escotilla: [0.34, 0.38, 0.43]
};

export class ModelLoader {
  constructor(scene, base = 'assets/models/') { this.scene = scene; this.base = base; this.fallos = new Set(); }

  /**
   * Devuelve un TransformNode escalado a `dims` (largo en z, ancho en x, alto en y) y centrado en el origen.
   * @returns {Promise<{node: BABYLON.TransformNode, origen: 'glb'|'procedural'}>}
   */
  async cargarPieza(pieza, dims, nombre) {
    const B = BABYLON;
    const contenedor = new B.TransformNode(`pieza-${nombre}`, this.scene);
    let meshes = [], origen = 'glb';
    try {
      const url = this.base + pieza.archivo;
      const res = B.ImportMeshAsync ? await B.ImportMeshAsync(url, this.scene) : await B.SceneLoader.ImportMeshAsync('', this.base, pieza.archivo, this.scene);
      meshes = res.meshes;
      const raiz = meshes[0];
      raiz.parent = contenedor; // __root__
      this._ajustar(contenedor, meshes, dims);
      this._enlazarEscotilla(contenedor, res);
      // Aspecto de metal pintado: un metal puro solo refleja el entorno y se vería negro bajo luz de ambiente.
      for (const m of meshes) { const mt = m.material; if (mt?.getClassName?.() === 'PBRMaterial') { if (mt.metallicTexture) mt.metallic = 0.6; mt.backFaceCulling = false; mt.twoSidedLighting = true; } }
    } catch (e) {
      origen = 'procedural';
      if (!this.fallos.has(pieza.archivo)) { this.fallos.add(pieza.archivo); SLog.warn('ModelLoader', `No se pudo cargar ${pieza.archivo}; se usa una pieza procedural`, e?.message ?? String(e)); }
      meshes = this._procedural(pieza, dims, contenedor);
    }
    return { node: contenedor, meshes, origen };
  }

  /** La escotilla GLB lleva un nodo `bisagra-escotilla`: se registra igual que en la versión procedural. */
  _enlazarEscotilla(contenedor, res) {
    const pivot = (res.transformNodes ?? []).find((n) => n.name === 'bisagra-escotilla');
    if (!pivot) return;
    pivot.rotationQuaternion = null; pivot.rotation.set(0, 0, 0); // la animación usa rotation.z
    contenedor.metadata = { ...(contenedor.metadata || {}), hatchPivot: pivot, hatchOpen: false };
    for (const m of res.meshes) {
      let n = m.parent, bajoBisagra = false;
      while (n) { if (n === pivot) { bajoBisagra = true; break; } n = n.parent; }
      if (bajoBisagra) m.metadata = { ...(m.metadata || {}), hatchRoot: contenedor };
    }
  }

  _ajustar(contenedor, meshes, dims) {
    const B = BABYLON;
    contenedor.computeWorldMatrix(true);
    let min = new B.Vector3(Infinity, Infinity, Infinity), max = new B.Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of meshes) {
      if (!m.getBoundingInfo || !m.getTotalVertices || m.getTotalVertices() === 0) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      min = B.Vector3.Minimize(min, bb.minimumWorld); max = B.Vector3.Maximize(max, bb.maximumWorld);
    }
    const size = max.subtract(min);
    if (!isFinite(size.x) || size.x <= 0 || size.y <= 0 || size.z <= 0) return;
    const k = new B.Vector3(dims.ancho / size.x, dims.alto / size.y, dims.largo / size.z);
    const centro = min.add(max).scale(0.5);
    contenedor.scaling = k;
    contenedor.position = new B.Vector3(-centro.x * k.x, -centro.y * k.y, -centro.z * k.z);
  }

  _procedural(pieza, dims, padre) {
    const B = BABYLON, s = this.scene, c = COLORES[pieza.tipo] ?? [0.6, 0.6, 0.6];
    if (['controles', 'periscopio', 'portillas', 'escotilla'].includes(pieza.tipo)) return this._proceduralAccesorio(pieza, dims, padre, c);
    let m;
    const esf = pieza.forma === 'esfera' || pieza.tipo === 'cabina' || pieza.tipo === 'focos';
    if (esf) m = B.MeshBuilder.CreateSphere('p', { diameter: 1, segments: 16 }, s);
    else if (['casco', 'propulsion', 'lastre', 'sonar'].includes(pieza.tipo)) {
      m = B.MeshBuilder.CreateCylinder('p', { height: 1, diameter: 1, tessellation: 24 }, s);
      m.rotation.x = Math.PI / 2; m.bakeCurrentTransformIntoVertices();
    } else m = B.MeshBuilder.CreateBox('p', { size: 1 }, s);
    m.scaling = new B.Vector3(dims.ancho, dims.alto, dims.largo);
    m.parent = padre;
    const mat = new B.StandardMaterial('mat-p', s);
    mat.diffuseColor = new B.Color3(...c); mat.specularColor = new B.Color3(0.2, 0.2, 0.2);
    if (pieza.tipo === 'cabina') mat.alpha = 0.6;
    m.material = mat;
    return [m];
  }

  /** Accesorios detallados generados con primitivas: no requieren GLB externo. */
  _proceduralAccesorio(pieza, dims, padre, color) {
    const B = BABYLON, s = this.scene, meshes = [];
    const material = (name, rgb, metal = 0.55, alpha = 1) => {
      const m = new B.StandardMaterial(`${pieza.tipo}-${name}`, s);
      m.diffuseColor = new B.Color3(...rgb); m.specularColor = new B.Color3(0.7, 0.7, 0.7);
      m.specularPower = 72; m.alpha = alpha; m.metallic = metal;
      return m;
    };
    const metal = material('metal', color, 0.8), dark = material('oscuro', [0.045, 0.065, 0.085], 0.35);
    const brass = material('laton', [0.72, 0.52, 0.2], 0.8);
    const glass = material('cristal', [0.18, 0.62, 0.78], 0.35, 0.48);
    const add = (mesh, mat = metal) => { mesh.parent = padre; mesh.material = mat; mesh.isPickable = true; meshes.push(mesh); return mesh; };
    const box = (name, w, h, d, x, y, z, mat = metal) => {
      const m = B.MeshBuilder.CreateBox(name, { width:w, height:h, depth:d }, s);
      m.position.set(x,y,z); return add(m,mat);
    };
    const cyl = (name, diameter, height, x,y,z, axis = 'y', mat = metal, tess=24) => {
      const m = B.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:tess},s);
      if (axis === 'x') m.rotation.z = Math.PI/2;
      if (axis === 'z') m.rotation.x = Math.PI/2;
      m.position.set(x,y,z); return add(m,mat);
    };
    const torus = (name, diameter, thickness, x,y,z, rotY=0, mat=metal) => {
      const m = B.MeshBuilder.CreateTorus(name,{diameter,thickness,tessellation:40},s);
      m.position.set(x,y,z); m.rotation.y=rotY; return add(m,mat);
    };
    const w=dims.ancho, h=dims.alto, d=dims.largo;
    if (pieza.tipo === 'controles') {
      // Consola inclinada con volante, dos palancas y cuatro instrumentos legibles.
      box('consola', w*.92, h*.24, d*.58, 0, -h*.10, 0, metal);
      box('superficie-panel', w*.86, h*.038, d*.52, 0, h*.02, d*.02, dark);
      for (let i=0; i<4; i++) {
        const x = (i-1.5)*w*.18;
        cyl(`reloj-${i}`, w*.13, h*.038, x, h*.075, d*.065, 'y', brass, 32);
        cyl(`esfera-${i}`, w*.10, h*.014, x, h*.098, d*.065, 'y', glass, 32);
        box(`aguja-${i}`, w*.013, h*.009, d*.048, x, h*.108, d*.065, dark);
      }
      const wheel = torus('timón', w*.44, w*.038, 0, h*.22, -d*.16, 0, brass);
      cyl('eje-timon', w*.085, h*.18, 0, h*.14, -d*.16, 'y', metal);
      for(let i=0; i<3; i++){
        const a = i*Math.PI*2/3;
        box(`radio-${i}`, w*.038, h*.038, w*.20, Math.cos(a)*w*.09, h*.22, -d*.16+Math.sin(a)*w*.09, dark);
      }
      for(let i=0; i<2; i++){
        const x = (i ? 1 : -1)*w*.28;
        cyl(`base-palanca-${i}`, w*.14, h*.055, x, h*.045, -d*.09, 'y', brass);
        const lever = cyl(`palanca-${i}`, w*.038, h*.22, x, h*.15, -d*.09, 'z', metal);
        lever.rotation.x = .25;
        cyl(`empuñadura-${i}`, w*.10, w*.058, x, h*.26, -d*.09, 'z', dark);
      }
      wheel.metadata = {...(wheel.metadata||{}), instrumento:'timón'};
    } else if (pieza.tipo === 'periscopio') {
      cyl('tubo-periscopio', w * 0.44, h * 0.80, 0, h * 0.04, 0, 'y', metal, 32);
      cyl('collar-inferior', w * 0.65, h * 0.075, 0, -h * 0.37, 0, 'y', brass, 32);
      cyl('collar-superior', w * 0.60, h * 0.065, 0, h * 0.40, 0, 'y', brass, 32);
      box('cabezal-optico', w * 0.95, h * 0.20, d * 0.38, 0, h * 0.35, d * 0.14, metal);
      box('visor-frontal', w * 0.52, h * 0.10, d * 0.02, 0, h * 0.36, d * 0.32, dark);
      box('lente', w * 0.36, h * 0.065, d * 0.022, 0, h * 0.36, d * 0.335, glass);
      cyl('anillo-orientacion', w * 0.54, h * 0.048, 0, h * 0.26, 0, 'y', brass, 32);
    } else if (pieza.tipo === 'portillas') {
      // Unidad de portilla pasacascos: manguito estanco, marco de latón/bronce, cristal de alta presión y pernos
      cyl('manguito', h * 0.84, w * 0.85, 0, 0, 0, 'x', metal, 32);
      torus('marco-exterior', h * 0.86, h * 0.08, 0, 0, 0, Math.PI / 2, brass);
      cyl('cristal-portilla', h * 0.72, w * 0.35, 0, 0, 0, 'x', glass, 48);
      torus('aro-interior', h * 0.68, h * 0.04, 0, 0, 0, Math.PI / 2, metal);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        cyl(`perno-${i}`, h * 0.055, w * 0.5, 0, Math.sin(a) * h * 0.40, Math.cos(a) * h * 0.40, 'x', dark, 12);
      }
    } else if (pieza.tipo === 'escotilla') {
      // Escotilla circular hermética con bisagra articulada lateral y animación de apertura
      const pivot = new B.TransformNode('bisagra-escotilla', s); pivot.parent = padre;
      pivot.position.set(-w * 0.42, h * 0.35, 0);
      cyl('brazo-bisagra', w * 0.08, d * 0.5, 0, 0, 0, 'z', brass, 24).parent = pivot;
      const door = cyl('tapa-escotilla', w * 0.88, h * 0.35, w * 0.42, 0, 0, 'y', metal, 32);
      door.parent = pivot;
      const inner = torus('junta-hermetica', w * 0.72, w * 0.03, w * 0.42, -h * 0.12, 0, 0, dark);
      inner.parent = pivot;
      const handle = torus('volante-cierre', w * 0.28, w * 0.035, w * 0.42, h * 0.22, 0, 0, brass);
      handle.parent = pivot;
      cyl('eje-volante', w * 0.04, h * 0.25, w * 0.42, h * 0.1, 0, 'y', metal, 16).parent = pivot;
      // Anillo base coaming soldado al casco
      cyl('anillo-coaming', w * 0.96, h * 0.45, 0, -h * 0.2, 0, 'y', dark, 32);
      padre.metadata = { ...(padre.metadata || {}), hatchPivot: pivot, hatchOpen: false };
      meshes.push(door, inner, handle);
      pivot.getChildMeshes().forEach(m => { m.isPickable = true; m.metadata = { ...(m.metadata || {}), hatchRoot: padre }; });
    }
    return meshes;
  }

}
