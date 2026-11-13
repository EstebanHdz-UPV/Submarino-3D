// Iconos del menú lateral: SVG en línea (trazo con currentColor), sin depender de archivos externos.
const P = {
  inicio: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  ensamblaje: '<path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3 2.3-2.3a4 4 0 0 0 2 2Z"/><path d="m9.7 6.3-7.9 7.9a2.1 2.1 0 0 0 3 3l7.9-7.9"/><path d="m14 11 7 7-3 3-7-7"/>',
  pruebas: '<path d="M9 3h6M10 3v6l-6 10a1.3 1.3 0 0 0 1.1 2h13.8a1.3 1.3 0 0 0 1.1-2L14 9V3"/><path d="M7 15h10"/>',
  resultados: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  libros: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
  biblioteca: '<path d="M4 5h4v15H4zM10 5h4v15h-4z"/><path d="m16.2 6 3.8-1 3 14.6-3.8 1z"/>',
  ruta: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  proyecto: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  configuracion: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>'
};
export const iconoNav = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[id] ?? P.inicio}</svg>`;
