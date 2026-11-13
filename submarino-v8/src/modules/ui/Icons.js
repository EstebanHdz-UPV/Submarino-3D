// Iconos SVG (assets/icons/*.svg): para el DOM (<img>) y para el HUD en Canvas 2D (Image).
import { h } from './dom.js';
const cache = new Map();
export const icono = (nombre, tam = 20, clase = 'icono') => h('img', { src: `assets/icons/${nombre}.svg`, alt: '', width: tam, height: tam, class: clase, draggable: 'false' });
export function imagen(nombre) {
  if (!cache.has(nombre)) { const i = new Image(); i.src = `assets/icons/${nombre}.svg`; cache.set(nombre, i); }
  return cache.get(nombre);
}
export const precargar = (nombres) => nombres.forEach(imagen);
