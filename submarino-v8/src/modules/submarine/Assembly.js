import { computeStats } from './Stats.js';

/** El submarino armado: qué pieza (y material) hay en cada punto de montaje. */
export class Assembly {
  constructor(catalog, rules, proyecto_id = 'submarino-exploracion-3d') {
    this.catalog = catalog; this.rules = rules; this.slots = rules.slots; this.piezas = {}; // slotId -> { partId, materialId }
    this.proyectoId = rules?.proyecto_id || proyecto_id || 'submarino-exploracion-3d';
  }
  slot(id) { return this.slots.find((s) => s.id === id) ?? null; }
  /** Coloca una pieza. Devuelve { ok, error? }. */
  place(slotId, partId, materialId, posRel = null) {
    const slot = this.slot(slotId), part = this.catalog.part(partId);
    if (!slot) return { ok: false, error: `Punto de montaje desconocido: ${slotId}` };
    if (!part) return { ok: false, error: `Pieza desconocida: ${partId}` };
    if (part.tipo !== slot.tipo) return { ok: false, error: `La pieza ${part.nombre} no es de tipo ${slot.tipo}.` };
    // La cantidad máxima está definida por los puntos de montaje existentes por categoría.
    // Así no se pueden añadir cascos, motores u otros componentes ilimitados.
    const capacidad = this.slots.filter((s) => s.tipo === slot.tipo).length;
    const ocupados = this.slots.filter((s) => s.tipo === slot.tipo && this.piezas[s.id]).length;
    if (!this.piezas[slotId] && ocupados >= capacidad) return { ok: false, error: `Límite alcanzado: máximo ${capacidad} componente(s) de tipo ${slot.tipo}.` };
    let mat = part.material ?? null;
    if (part.tipo === 'casco') {
      mat = materialId ?? part.materialPorDefecto;
      if (!part.materialesPermitidos.includes(mat)) return { ok: false, error: `Material no permitido para ${part.nombre}.` };
    }
    const zona = posRel?.zona === 'interior' || posRel?.zona === 'exterior' ? { zona: posRel.zona } : {};
    this.piezas[slotId] = { partId, materialId: mat, ...(posRel && part.tipo !== 'casco' ? { posRel: { x: Number(posRel.x) || 0, y: Number(posRel.y) || 0, z: Number(posRel.z) || 0, ...zona } } : {}) };
    return { ok: true };
  }
  remove(slotId) { delete this.piezas[slotId]; }
  clear() { this.piezas = {}; }
  /** Pieza y material colocados en un punto de montaje. */
  get(slotId) {
    const it = this.piezas[slotId];
    if (!it) return null;
    return { part: this.catalog.part(it.partId), material: it.materialId ? this.catalog.material(it.materialId) : null, posRel: it.posRel ?? null };
  }
  stats(world, env) { return computeStats(this, world, env); }
  toJSON(nombre = 'diseno', proyecto_id = this.proyectoId) {
    return { version: 1, proyecto_id: proyecto_id || this.proyectoId || 'submarino-exploracion-3d', nombre, piezas: { ...this.piezas } };
  }
  load(json) {
    this.clear();
    const errs = [];
    for (const [slotId, it] of Object.entries(json.piezas ?? {})) {
      const r = this.place(slotId, it.partId, it.materialId, it.posRel);
      if (!r.ok) errs.push(r.error);
    }
    return errs;
  }
}
