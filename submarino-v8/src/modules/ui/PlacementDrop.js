// Convierte el punto donde se suelta una pieza sobre la vista 3D en una posición válida dentro/sobre el casco.
import { semiextensiones, metrosARel, resolverPosicion, obstaculos, zonaDeSlot } from '../submarine/Placement.js';

/** Punto (m, marco local del submarino) bajo el puntero. Exterior: sobre el casco. Interior: plano que contiene el eje del casco. */
export function puntoBajoPuntero(app, canvas, cx, cy, zona) {
  const B = BABYLON, sc = app.view.sm.scene, rect = canvas.getBoundingClientRect();
  const x = cx - rect.left, y = cy - rect.top;
  const inv = app.view.root.getWorldMatrix().clone().invert();
  const aLocal = (v, dir = false) => (dir ? B.Vector3.TransformNormal(v, inv) : B.Vector3.TransformCoordinates(v, inv));
  if (zona === 'exterior') {
    const hit = sc.pick(x, y, (m) => app.view.root.getChildMeshes().includes(m) && m.metadata?.slotId === 'casco');
    if (hit?.hit && hit.pickedPoint) return aLocal(hit.pickedPoint);
  }
  const ray = sc.createPickingRay(x, y, B.Matrix.Identity(), sc.activeCamera);
  const o = aLocal(ray.origin), d = aLocal(ray.direction, true).normalize();
  let n = new B.Vector3(d.x, d.y, 0);
  n = n.lengthSquared() < 1e-4 ? new B.Vector3(0, 1, 0) : n.normalize();
  const den = B.Vector3.Dot(n, d);
  if (Math.abs(den) < 1e-4) return null;
  const t = -B.Vector3.Dot(n, o) / den;
  return t > 0 ? o.add(d.scale(t)) : null;
}

/**
 * Posición final de `part` en `slot` según el puntero, sin atravesar otras piezas.
 * @returns {{posRel}|{sinHueco:true}|null} null si aún no hay casco o el puntero no apunta a nada
 */
export function posRelDesdePuntero(app, canvas, cx, cy, part, slot, excepto = []) {
  const st = app.stats(); if (!st.casco) return null;
  const zona = zonaDeSlot(slot);
  const p = puntoBajoPuntero(app, canvas, cx, cy, zona); if (!p) return null;
  const r = resolverPosicion({ x: p.x, y: p.y, z: p.z }, semiextensiones(part, st.casco), obstaculos(app.assembly, st.casco, [slot.id, ...[].concat(excepto)]), st.casco, zona);
  if (!r.ok) return { sinHueco: true };
  return { posRel: { ...metrosARel(r.pos, st.casco), zona } };
}
