// Utilidades compartidas por las pantallas de aprendizaje (Biblioteca, Ruta STEAM y Proyecto).
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (n) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });
