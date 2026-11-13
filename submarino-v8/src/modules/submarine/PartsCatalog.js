// Catálogo de piezas y materiales (datos en data/parts.json y data/materials.json).
export class PartsCatalog {
  constructor(parts, materials, tipos) {
    this.parts = parts; this.materials = materials; this.tipos = tipos;
    this._p = new Map(parts.map((p) => [p.id, p]));
    this._m = new Map(materials.map((m) => [m.id, m]));
  }
  part(id) { return this._p.get(id) ?? null; }
  material(id) { return this._m.get(id) ?? null; }
  byTipo(tipo) { return this.parts.filter((p) => p.tipo === tipo); }
}
