import { h, limpiar } from '../dom.js';
import { icono } from '../Icons.js';
import { BookViewer } from '../../books/BookViewer.js';

export function BooksScreen(app) {
  const { t } = app;
  let activo = 'piezas';
  return {
    async mount() {
      app.mostrarEscena(false);
      const cont = h('div', {});
      const pintar = () => {
        limpiar(cont);
        const libro = app.datos.books[activo];
        cont.append(h('div', { class: 'tabs' },
          h('button', { class: 'tab' + (activo === 'piezas' ? ' activo' : ''), onclick: () => { activo = 'piezas'; pintar(); } }, icono('pieza', 18), ' ', t('libros.piezas', 'Libro 1 · Piezas y ensamblaje')),
          h('button', { class: 'tab' + (activo === 'materiales' ? ' activo' : ''), onclick: () => { activo = 'materiales'; pintar(); } }, icono('libro', 18), ' ', t('libros.materiales', 'Libro 2 · Materiales'))),
          h('h2', {}, libro.titulo), new BookViewer(libro).el);
      };
      pintar();
      limpiar(app.panel).append(h('section', { class: 'pantalla' }, cont));
    },
    unmount() {}
  };
}
