// Navegación por #hash entre pantallas (sin recargar la página).
export class Router {
  constructor(rutas, { alCambiar } = {}) {
    this.rutas = rutas; this.actual = null; this.alCambiar = alCambiar;
    addEventListener('hashchange', () => this.resolver());
  }
  ir(id) { if (location.hash === `#/${id}`) this.resolver(); else location.hash = `#/${id}`; }
  async resolver() {
    const id = (location.hash.replace(/^#\/?/, '') || 'inicio');
    const ruta = this.rutas[id] ?? this.rutas.inicio;
    const rid = this.rutas[id] ? id : 'inicio';
    if (this.actual?.unmount) { try { this.actual.unmount(); } catch (e) { console.error(e); } }
    this.actual = ruta; this.id = rid;
    this.alCambiar?.(rid, ruta);
    await ruta.mount();
  }
}
