// Visor de libros: páginas definidas en JSON (data/books/*.json).
import { h, limpiar } from '../ui/dom.js';

export class BookViewer {
  /** libro: { titulo, paginas: [{ titulo, parrafos?, pasos?, tabla?, consejos? }] } */
  constructor(libro, { alElegirPieza } = {}) {
    this.libro = libro; this.i = 0; this.alElegirPieza = alElegirPieza;
    this.cuerpo = h('div', { class: 'libro-cuerpo' });
    this.indice = h('nav', { class: 'libro-indice' });
    this.el = h('div', { class: 'libro' }, this.indice, this.cuerpo);
    this.render();
  }
  ir(n) { this.i = Math.max(0, Math.min(this.libro.paginas.length - 1, n)); this.render(); }
  render() {
    const p = this.libro.paginas[this.i];
    limpiar(this.indice);
    this.libro.paginas.forEach((pg, k) => this.indice.append(h('button', { class: 'indice-item' + (k === this.i ? ' activo' : ''), onclick: () => this.ir(k) }, pg.titulo)));
    limpiar(this.cuerpo);
    this.cuerpo.append(h('h3', {}, p.titulo));
    for (const t of p.parrafos ?? []) this.cuerpo.append(h('p', {}, t));
    if (p.pasos) this.cuerpo.append(h('ol', { class: 'pasos' }, p.pasos.map((x) => h('li', {}, x))));
    if (p.tabla) {
      this.cuerpo.append(h('div', { class: 'tabla-scroll' }, h('table', { class: 'tabla' },
        h('thead', {}, h('tr', {}, p.tabla.columnas.map((c) => h('th', {}, c)))),
        h('tbody', {}, p.tabla.filas.map((f) => h('tr', {}, f.map((c) => h('td', {}, c))))))));
    }
    if (p.consejos?.length) this.cuerpo.append(h('div', { class: 'consejo' }, h('strong', {}, 'Consejos'), h('ul', {}, p.consejos.map((c) => h('li', {}, c)))));
    this.cuerpo.append(h('div', { class: 'libro-nav' },
      h('button', { class: 'btn secundario', disabled: this.i === 0, onclick: () => this.ir(this.i - 1) }, '← Anterior'),
      h('span', { class: 'tenue' }, `${this.i + 1} / ${this.libro.paginas.length}`),
      h('button', { class: 'btn secundario', disabled: this.i === this.libro.paginas.length - 1, onclick: () => this.ir(this.i + 1) }, 'Siguiente →')));
  }
}
