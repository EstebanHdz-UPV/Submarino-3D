// Mapa de esfuerzo del casco en colores (MODELO SIMPLIFICADO por secciones) y efectos de daño.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Rampa de color tipo "jet": 0 = azul (bajo) → 1 = rojo (alto). */
export function colorEsfuerzo(r) {
  const t = clamp(r, 0, 1);
  const f = (a) => clamp(1.5 - Math.abs(4 * (t - a)), 0, 1);
  return [f(0.75), f(0.5), f(0.25)];
}

export class DamageFx {
  constructor(sm) { this.sm = sm; this.meshes = []; }
  limpiar() { this.meshes.forEach((m) => m.dispose()); this.meshes = []; }
  /**
   * @param {object} casco { forma, radioM, largoM }  @param {number[]} razones razón de esfuerzo por sección (1 = colapso)
   * @param {BABYLON.TransformNode} padre submarino
   */
  mostrarMapa(casco, razones, padre) {
    const B = BABYLON, s = this.sm.scene;
    this.limpiar();
    const r = casco.radioM, L = casco.forma === 'esfera' ? 2 * r : casco.largoM;
    const n = casco.forma === 'esfera' ? 1 : razones.length;
    for (let i = 0; i < n; i++) {
      const col = colorEsfuerzo(casco.forma === 'esfera' ? Math.max(...razones) : razones[i]);
      let m;
      if (casco.forma === 'esfera') m = B.MeshBuilder.CreateSphere('esf', { diameter: 2 * r * 1.015, segments: 24 }, s);
      else {
        m = B.MeshBuilder.CreateCylinder(`esf-${i}`, { height: L / n, diameter: 2 * r * 1.015, tessellation: 28 }, s);
        m.rotation.x = Math.PI / 2; m.bakeCurrentTransformIntoVertices();
        m.position.z = -L / 2 + (i + 0.5) * (L / n);
      }
      const mat = new B.StandardMaterial(`mat-esf-${i}`, s);
      mat.diffuseColor = new B.Color3(...col); mat.emissiveColor = new B.Color3(...col).scale(0.45); mat.alpha = 0.92; mat.specularColor = B.Color3.Black();
      m.material = mat; m.parent = padre; m.isPickable = false;
      this.meshes.push(m);
    }
  }
}
