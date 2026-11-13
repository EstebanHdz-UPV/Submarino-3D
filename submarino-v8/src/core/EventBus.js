// Bus de eventos: los módulos se comunican aquí en vez de importarse entre sí.
export class EventBus extends EventTarget {
  /** Suscribe y devuelve una función para cancelar la suscripción. */
  on(type, fn) {
    const h = (e) => fn(e.detail);
    this.addEventListener(type, h);
    return () => this.removeEventListener(type, h);
  }
  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
