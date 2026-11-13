// Utilidades mínimas para crear DOM sin frameworks y sin innerHTML con datos.
/** h('div', { class: 'x', onclick: fn, dataset: {a: 1} }, 'texto', otroNodo) */
export function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    // draggable es un atributo enumerado ("true"/"false"), no booleano HTML.
    // Asignarle una cadena vacía equivale a "auto" y desactiva el drag en botones.
    else if (k === 'draggable') el.setAttribute(k, v === true || v === 'true' ? 'true' : 'false');
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const limpiar = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
