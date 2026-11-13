// Colocación de piezas sobre/dentro del casco: zonas permitidas y no-interpenetración.
// Funciones puras (sin Babylon) para poder probarlas con `node --test`.
// Marco local del submarino (el mismo del nodo raíz en Babylon): x derecha, y arriba, z proa (metros).
// `posRel` (ver data/assembly-rules.json): x e y en radios del casco, z en medios largos.

const MARGEN = 0.02;            // holgura mínima entre piezas (m)
const FRACCION_INTERIOR = 0.84; // fracción del radio utilizable por dentro (pared + holgura)

/** Zona de una pieza: lo que va dentro del casco (baterías, pesos, timón/controles…) o sobre su superficie. */
export const zonaDeSlot = (slot) => (slot && slot.externo === false ? 'interior' : 'exterior');

export function geometria(casco) {
  const r = casco?.radioM ?? 0.6;
  const L = casco ? (casco.forma === 'esfera' ? 2 * r : casco.largoM) : 3;
  return { r, L, halfL: L / 2 };
}

/** Tamaño visual de una pieza (m) adaptado al casco elegido. Es la misma regla que usa la vista 3D. */
/** Las piezas de interior se dibujan más pequeñas para dejar pasillo y vista libre dentro del casco (solo aspecto). */
const ESCALA_INTERIOR = 0.62;
const TIPOS_INTERIOR = new Set(['bateria', 'lastreFijo', 'controles']);

export function dimsPieza(part, casco) {
  const v = part.visual ?? { largo: 0.5, ancho: 0.5, alto: 0.5 };
  const rRef = 0.6;
  const s = casco?.radioM ? Math.max(0.75, Math.min(1.4, casco.radioM / rRef)) : 1.0;
  const k = TIPOS_INTERIOR.has(part.tipo) ? ESCALA_INTERIOR : 1;
  return {
    largo: Number((v.largo * (part.tipo === 'aletas' || part.tipo === 'cabina' ? s : Math.sqrt(s)) * k).toFixed(3)),
    ancho: Number((v.ancho * s * k).toFixed(3)),
    alto: Number((v.alto * s * k).toFixed(3))
  };
}

/** Semiextensiones (m) de una pieza. */
export function semiextensiones(part, casco) {
  const d = dimsPieza(part, casco);
  return { x: d.ancho / 2, y: d.alto / 2, z: d.largo / 2 };
}

export function relAMetros(posRel, casco) {
  const { r, halfL } = geometria(casco);
  return { x: posRel.x * r, y: posRel.y * r, z: posRel.z * halfL };
}
export function metrosARel(p, casco) {
  const { r, halfL } = geometria(casco);
  return { x: p.x / r, y: p.y / r, z: p.z / halfL };
}

/** Obliga a la posición a quedar dentro de la zona (interior: dentro del casco; exterior: cerca de su superficie). */
export function limitarAZona(p, half, casco, zona) {
  const { r, halfL } = geometria(casco);
  const q = { ...p };
  if (zona === 'interior') {
    const util = Math.max(0.05, r * FRACCION_INTERIOR - Math.hypot(half.x, half.y) * 0.5);
    const rad = Math.hypot(q.x, q.y);
    if (rad > util) { q.x *= util / rad; q.y *= util / rad; }
    const zmax = Math.max(0, halfL * 0.92 - half.z);
    q.z = Math.max(-zmax, Math.min(zmax, q.z));
  } else {
    q.x = Math.max(-1.4 * r, Math.min(1.4 * r, q.x));
    q.y = Math.max(-1.4 * r, Math.min(1.4 * r, q.y));
    q.z = Math.max(-1.5 * halfL, Math.min(1.5 * halfL, q.z));
  }
  return q;
}

/** ¿Se solapan dos cajas alineadas a los ejes (con holgura)? */
export function seSolapan(a, ha, b, hb, gap = MARGEN) {
  return Math.abs(a.x - b.x) < ha.x + hb.x + gap && Math.abs(a.y - b.y) < ha.y + hb.y + gap && Math.abs(a.z - b.z) < ha.z + hb.z + gap;
}

const choca = (p, half, otros, gap) => otros.some((o) => seSolapan(p, half, o.pos, o.half, gap));

/**
 * Posición libre más cercana a `deseada` que no atraviesa ninguna pieza de `otros`.
 * @returns {{pos:{x,y,z}, ok:boolean, movida:boolean}} ok=false si no hay hueco en la zona
 */
export function resolverPosicion(deseada, half, otros, casco, zona, gap = MARGEN) {
  const inicio = limitarAZona(deseada, half, casco, zona);
  if (!choca(inicio, half, otros, gap)) return { pos: inicio, ok: true, movida: inicio.x !== deseada.x || inicio.y !== deseada.y || inicio.z !== deseada.z };
  // 1) empuje por mínima penetración: la pieza "resbala" alrededor de la otra
  let p = { ...inicio };
  for (let it = 0; it < 32; it++) {
    const o = otros.find((q) => seSolapan(p, half, q.pos, q.half, gap));
    if (!o) break;
    const pen = {
      x: o.half.x + half.x + gap - Math.abs(p.x - o.pos.x),
      y: o.half.y + half.y + gap - Math.abs(p.y - o.pos.y),
      z: o.half.z + half.z + gap - Math.abs(p.z - o.pos.z)
    };
    const eje = pen.x <= pen.y && pen.x <= pen.z ? 'x' : pen.y <= pen.z ? 'y' : 'z';
    p[eje] += (p[eje] >= o.pos[eje] ? 1 : -1) * pen[eje];
    p = limitarAZona(p, half, casco, zona);
  }
  if (!choca(p, half, otros, gap)) return { pos: p, ok: true, movida: true };
  // 2) búsqueda en capas alrededor del punto pedido
  const { r, halfL } = geometria(casco);
  const paso = Math.max(0.04, Math.min(r, halfL) * 0.12);
  let mejor = null, mejorD = Infinity;
  for (let k = 1; k <= 40; k++) {
    for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) for (let l = -k; l <= k; l++) {
      if (Math.max(Math.abs(i), Math.abs(j), Math.abs(l)) !== k) continue;
      const c = limitarAZona({ x: inicio.x + i * paso, y: inicio.y + j * paso, z: inicio.z + l * paso }, half, casco, zona);
      if (choca(c, half, otros, gap)) continue;
      const d = (c.x - inicio.x) ** 2 + (c.y - inicio.y) ** 2 + (c.z - inicio.z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = c; }
    }
    if (mejor) return { pos: mejor, ok: true, movida: true };
  }
  return { pos: inicio, ok: false, movida: false };
}

/**
 * Posición visual de cada pieza colocada, separando las que se atraviesan (incluidos los puntos de montaje
 * por defecto). NO modifica el ensamblaje ni la física: solo decide dónde se dibuja cada pieza.
 * Las piezas que el usuario colocó a mano tienen prioridad; el resto se acomoda a su alrededor.
 * @returns {Map<string,{pos:{x,y,z}, half:{x,y,z}, movida:boolean}>}
 */
export function posicionesVisuales(assembly, casco) {
  const out = new Map();
  if (!casco) return out;
  const items = [];
  for (const slot of assembly.slots) {
    if (slot.tipo === 'casco') continue;
    const it = assembly.get(slot.id);
    if (it) items.push({ slot, it, propia: !!it.posRel });
  }
  items.sort((a, b) => Number(b.propia) - Number(a.propia));
  const aceptadas = [];
  for (const { slot, it } of items) {
    const half = semiextensiones(it.part, casco);
    const zona = it.posRel?.zona ?? zonaDeSlot(slot);
    const deseada = relAMetros(it.posRel ?? slot.posRel, casco);
    const r = resolverPosicion(deseada, half, aceptadas, casco, zona);
    const pos = r.ok ? r.pos : deseada;
    out.set(slot.id, { pos, half, movida: r.ok && r.movida });
    aceptadas.push({ pos, half });
  }
  return out;
}

/** Cajas de las piezas ya colocadas (excepto `excepto`) en su posición visual, para comprobar choques. */
export function obstaculos(assembly, casco, excepto = []) {
  const ex = new Set([].concat(excepto ?? []));
  const out = [];
  for (const [id, v] of posicionesVisuales(assembly, casco)) if (!ex.has(id)) out.push({ slot: id, pos: v.pos, half: v.half });
  return out;
}
