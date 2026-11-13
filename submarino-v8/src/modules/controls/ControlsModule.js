// Teclado del piloto (RF-02 a RF-05, RF-09, RF-10). Devuelve las órdenes para PhysicsModule.step().
import { Propeller } from './Propeller.js';

export const TECLAS = [
  ['W / ↑', 'Aumentar empuje hacia delante'], ['S / ↓', 'Reducir empuje; mantener para invertir'], ['Espacio', 'Detener el motor'],
  ['A / ←  ·  D / →', 'Timón izquierda / derecha'], ['Z  ·  C', 'Desplazamiento lateral izquierda / derecha'],
  ['E', 'Llenar lastre (descender)'], ['Q', 'Vaciar lastre (ascender)'], ['B', 'Soplar lastre (emergencia)'], ['G', 'Soltar pesos (emergencia)'],
  ['V', 'Cambiar cámara'], ['F', 'Cabina: caminar por dentro / volver a pilotar'], ['Ratón (arrastrar)', 'Cabina: mirar alrededor'], ['R', 'Reiniciar exploración'], ['H', 'Mostrar u ocultar ayuda']
];

export class ControlsModule {
  constructor(bus) {
    this.bus = bus; this.keys = new Set(); this.virt = new Set(); this.caminando = false; this.prop = new Propeller(); this.activo = false;
    this._down = (e) => this._onDown(e); this._up = (e) => this.keys.delete(e.code); this._blur = () => this.keys.clear();
  }
  attach() {
    if (this.activo) return; this.activo = true;
    addEventListener('keydown', this._down); addEventListener('keyup', this._up); addEventListener('blur', this._blur);
  }
  detach() { this.activo = false; removeEventListener('keydown', this._down); removeEventListener('keyup', this._up); removeEventListener('blur', this._blur); this.keys.clear(); this.virt.clear(); this.caminando = false; this.prop.stop(); }
  _onDown(e) {
    const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyC', 'KeyE', 'KeyQ', 'KeyB', 'KeyG'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === 'KeyV') this.bus.emit('camara-siguiente');
    if (e.code === 'KeyR') this.bus.emit('reiniciar');
    if (e.code === 'KeyH') this.bus.emit('ayuda');
    if (e.code === 'KeyG') this.bus.emit('soltar-pesos');
    if (e.code === 'Space') this.prop.stop();
  }
  /** Pulsación virtual (botones de la cabina): equivale a mantener la tecla. */
  presionar(code) { this.virt.add(code); }
  soltar(code) { this.virt.delete(code); }
  /** Con el piloto caminando por la cabina, el teclado físico mueve a la persona y no al submarino (los botones del mando siguen pilotando). */
  _any(...c) { return c.some((k) => this.virt.has(k) || (!this.caminando && this.keys.has(k))); }
  estado() {
    const mapa = [['W', 'KeyW'], ['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['Z', 'KeyZ'], ['C', 'KeyC'], ['E', 'KeyE'], ['Q', 'KeyQ'], ['B', 'KeyB']];
    return { teclas: mapa.filter(([, code]) => this._any(code)).map(([key]) => key), throttle: this.prop.lever, rudder: (this._any('KeyD', 'ArrowRight') ? 1 : 0) - (this._any('KeyA', 'ArrowLeft') ? 1 : 0), lateral: (this._any('KeyC') ? 1 : 0) - (this._any('KeyZ') ? 1 : 0) };
  }
  read(dt) {
    const acc = (this._any('KeyW', 'ArrowUp') ? 1 : 0) - (this._any('KeyS', 'ArrowDown') ? 1 : 0);
    return {
      throttle: this.prop.update(dt, acc),
      rudder: (this._any('KeyD', 'ArrowRight') ? 1 : 0) - (this._any('KeyA', 'ArrowLeft') ? 1 : 0),
      lateral: (this._any('KeyC') ? 1 : 0) - (this._any('KeyZ') ? 1 : 0),
      ballastCmd: (this._any('KeyE') ? 1 : 0) - (this._any('KeyQ') ? 1 : 0),
      blow: this._any('KeyB'), power: true
    };
  }
}
