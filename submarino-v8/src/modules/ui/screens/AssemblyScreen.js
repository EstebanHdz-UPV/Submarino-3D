import { h, limpiar, fmt } from '../dom.js';
import { icono } from '../Icons.js';
import { consecuencias } from '../../submarine/MissingParts.js';
import { puntoBajoPuntero, posRelDesdePuntero } from '../PlacementDrop.js';
import { PhysicsModule } from '../../physics/PhysicsModule.js';
import { entornoDe } from '../../trials/TrialRunner.js';
import { diagnosticarEnsamblaje, ejecutarPruebaFisica } from '../../submarine/AssemblyDiagnostics.js';

const TIPO_LABEL = {
  casco: 'Cascos', propulsion: 'Propulsión', lastre: 'Tanques de lastre', cabina: 'Cabinas y domos',
  aletas: 'Aletas', torre: 'Torres', bateria: 'Baterías', lastreFijo: 'Pesos de compensación',
  flotabilidad: 'Flotabilidad', focos: 'Iluminación', sonar: 'Sonar', controles: 'Timón y navegación', periscopio: 'Periscopios', portillas: 'Portillas', escotilla: 'Escotillas'
};
const TIPO_COLOR = { casco:'#91a8c2', propulsion:'#50b8d8', lastre:'#d99a45', cabina:'#7cc7e8', aletas:'#7b9bd0', torre:'#a2b1c2', bateria:'#71c78c', lastreFijo:'#c1a16c', flotabilidad:'#e2cb68', focos:'#f3d77b', sonar:'#d58c8c', controles:'#a6b8ca', periscopio:'#8ea9bf', portillas:'#71b9cc', escotilla:'#c3a477' };

function miniatura(pieza, nombre='', indiceVariante=null) {
  // Miniatura vectorial individual: la silueta depende de la categoría y cada
  // variante utiliza su propio identificador para cambiar forma, proporciones y detalles.
  const part = typeof pieza === 'object' && pieza ? pieza : { tipo: pieza, nombre };
  const tipo = part.tipo || 'sonar';
  const id = String(part.id || part.nombre || nombre || tipo);
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const variant = Number.isInteger(indiceVariante) ? ((indiceVariante % 8) + 8) % 8 : seed % 8;
  const c = TIPO_COLOR[tipo] || '#8eb5d8';
  const w = 48 + (variant % 4) * 5;
  const hgt = 20 + ((variant * 3) % 5) * 3;
  const x = 48 - w / 2;
  let body = '';
  const stroke = '#e7f3ff';
  if (tipo === 'casco') {
    const r = part.forma === 'esfera' ? 25 + variant % 3 * 2 : 8 + variant % 4 * 2;
    body = part.forma === 'esfera'
      ? `<circle cx="48" cy="38" r="${r}"/><path d="M${48-r+5} 38h${(r-5)*2}" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M48 ${38-r+4}v${(r-4)*2}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`
      : `<rect x="${x}" y="${38-hgt/2}" width="${w}" height="${hgt}" rx="${r}"/><path d="M${x+8} ${38-hgt/2+2}v${hgt-4}M${x+w-8} ${38-hgt/2+2}v${hgt-4}" stroke="${stroke}" stroke-width="2" fill="none"/><path d="M${x+14} 38h${w-28}" stroke="${stroke}" stroke-width="1.5"/>`;
  } else if (tipo === 'propulsion') {
    const blades = 3 + variant % 4;
    const bladePaths = Array.from({length:blades}, (_,i)=>`<path d="M76 38 Q${82+variant} ${25+i*2} ${88+variant} ${18+i*3} Q${84+variant} 38 76 38Z" transform="rotate(${i*360/blades} 76 38)"/>`).join('');
    body = `<rect x="${x}" y="27" width="${w-12}" height="22" rx="${5+variant%4}"/><path d="M${x+8} 30v16M${x+16} 30v16" stroke="${stroke}" stroke-width="2"/><circle cx="76" cy="38" r="7"/><g>${bladePaths}</g>`;
  } else if (tipo === 'lastre') {
    body = `<rect x="${x+5}" y="${23-variant%3}" width="${w-10}" height="${30+variant%4*3}" rx="${4+variant%4}"/><path d="M${x+10} 31h${w-20}M${x+10} 43h${w-20}" stroke="${stroke}" stroke-width="2"/><path d="M${48-8} 20v-5h16v5" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="48" cy="38" r="${3+variant%3}" fill="${stroke}"/>`;
  } else if (tipo === 'cabina') {
    body = `<path d="M${x+5} 52v-13a${18+variant%5} ${18+variant%5} 0 0 1 ${36+variant%5*2} 0v13Z"/><path d="M${x+12} 38a${12+variant%4} ${12+variant%4} 0 0 1 ${24+variant%4*2} 0" fill="none" stroke="${stroke}" stroke-width="3"/><path d="M48 18v-5M${x+8} 52h${w-16}" stroke="${stroke}" stroke-width="2"/>`;
  } else if (tipo === 'aletas') {
    body = `<path d="M48 39L${x+2} ${16+variant%5*2}l${10+variant%4} 34 28 5 28-5 ${96-x-2} ${16+variant%5*2}l-${10+variant%4} 34Z"/><path d="M48 39v25M${x+8} 46l16 5m48-5-16 5" fill="none" stroke="${stroke}" stroke-width="2.5"/>`;
  } else if (tipo === 'torre') {
    body = `<path d="M${x+8} 55V35l${8+variant%4} -${14+variant%4*2}h${w-32}l${8+variant%4} ${14+variant%4*2}v20Z"/><rect x="${48-8-variant%3}" y="26" width="${16+variant%3*2}" height="9" rx="4" fill="${stroke}"/><path d="M48 16v-5m-8 7h16" stroke="${stroke}" stroke-width="2"/>`;
  } else if (tipo === 'bateria') {
    body = `<rect x="${x+3}" y="24" width="${w-6}" height="30" rx="${3+variant%4}"/><path d="M${x+w-3} 32h6v14h-6"/><path d="M${x+14} 31v16m-7-8h14M${x+34} 31v16m-7-8h14" stroke="${stroke}" stroke-width="${2+variant%2}" fill="none"/><path d="M${x+12} 20h${w-24}" stroke="${stroke}" stroke-width="2"/>`;
  } else if (tipo === 'lastreFijo') {
    body = `<path d="M${x+3} 25h${w-6}v27h-${w-6}Z"/><path d="M${x+8} 19h${w-16}v6h-${w-16}ZM${x+8} 52h${w-16}v6h-${w-16}Z" fill="${stroke}"/><path d="M${x+14} 32h${w-28}m0 8h${w-28}" stroke="#243b53" stroke-width="2"/>`;
  } else if (tipo === 'flotabilidad') {
    body = `<path d="M${x+3} 43q${10+variant} -${22+variant} ${20+variant} 0t${20+variant} 0t${20+variant} 0" fill="none" stroke="${c}" stroke-width="${8+variant%3}" stroke-linecap="round"/><path d="M${x+5} 53q${12+variant} -${12+variant} ${22+variant} 0t${22+variant} 0" fill="none" stroke="${stroke}" stroke-width="3"/><circle cx="${x+8}" cy="23" r="3" fill="${stroke}"/><circle cx="${x+w-8}" cy="19" r="2" fill="${stroke}"/>`;
  } else if (tipo === 'controles') {
    body = `<rect x="18" y="34" width="60" height="23" rx="4"/><circle cx="48" cy="28" r="15" fill="none" stroke="${stroke}" stroke-width="4"/><path d="M48 13v30m-15-15h30M25 35l-5-12m51 12 5-12" stroke="${stroke}" stroke-width="2"/><circle cx="30" cy="45" r="4" fill="${stroke}"/><circle cx="42" cy="45" r="4" fill="${stroke}"/>`;;
  } else if (tipo === 'periscopio') {
    body = `<path d="M38 58V20h20v38Z"/><path d="M38 20V14h31v10H58"/><rect x="60" y="15" width="12" height="8" rx="2" fill="${stroke}"/>`;;
  } else if (tipo === 'portillas') {
    body = `<circle cx="30" cy="38" r="17"/><circle cx="30" cy="38" r="11" fill="#75c9df"/><circle cx="66" cy="38" r="17"/><circle cx="66" cy="38" r="11" fill="#75c9df"/>`;;
  } else if (tipo === 'escotilla') {
    body = `<rect x="21" y="20" width="54" height="36" rx="7"/><path d="M21 29h54M28 17v12m40-12v12" stroke="${stroke}" stroke-width="3" fill="none"/><circle cx="48" cy="41" r="9" fill="none" stroke="${stroke}" stroke-width="3"/>`;;
  } else if (tipo === 'focos') {
    body = `<path d="M${x+9} 22h${w-18}v27H${x+9}Z"/><circle cx="48" cy="35" r="${9+variant%4*2}" fill="#fff5c4"/><path d="M${x+15} 49l-8 12h${w-14}l-8-12" fill="#fff0ad"/><path d="M48 10v7m-20 3-4-5m44 5 4-5" stroke="#fff5c4" stroke-width="2"/>`;
  } else {
    const rings = 1 + variant % 3;
    body = `<circle cx="48" cy="38" r="${18+variant%4*2}"/><circle cx="48" cy="38" r="${10+variant%3*2}" fill="none" stroke="${stroke}" stroke-width="2.5"/>${Array.from({length:rings},(_,i)=>`<path d="M48 ${8+i*3}v10M48 58v10M18 ${38+i*2}h10M68 ${38+i*2}h10" stroke="${stroke}" stroke-width="2"/>`).join('')}<circle cx="48" cy="38" r="3" fill="${stroke}"/>`;
  }
  const accent = `<path d="M8 64h80" stroke="#6d8ba8" stroke-width="1" opacity=".45"/><text x="48" y="70" text-anchor="middle" font-size="6" fill="#dceaf7" opacity=".8">${String(variant+1).padStart(2,'0')}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 76"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#1b405f"/><stop offset="1" stop-color="#0b2034"/></linearGradient></defs><rect width="96" height="76" rx="10" fill="url(#g)"/><g fill="${c}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${body}</g>${accent}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const resumen = (p) => {
  switch (p.tipo) {
    case 'casco': return `${p.forma} · radio ${p.radioM} m · pared ${(p.espesorM * 1000).toFixed(0)} mm`;
    case 'propulsion': return `${p.empujeMaxN} N · ${(p.potenciaNominalW / 1000).toFixed(1)} kW · ${p.masaKg} kg`;
    case 'lastre': return `${p.volumenM3} m³ · ${p.masaKg} kg`;
    case 'cabina': case 'torre': return `hasta ${p.profundidadDisenoM} m · ${p.masaKg} kg`;
    case 'aletas': return `${p.areaAletasM2} m² · ${p.masaKg} kg`;
    case 'bateria': return `${p.capacidadWh / 1000} kWh · ${p.masaKg} kg`;
    case 'lastreFijo': return `${p.masaKg} kg`;
    case 'flotabilidad': return `${p.volumenM3} m³ · hasta ${p.profundidadDisenoM} m`;
    case 'focos': return `${p.consumoW} W · ${p.alcanceLuzM} m`;
    case 'sonar': return `${p.alcanceM} m · ${p.consumoW} W`;
    case 'controles': return `Timón · instrumentos de profundidad y presión · ${p.masaKg} kg`;
    case 'periscopio': return `Óptica de observación · ${p.profundidadDisenoM} m · ${p.masaKg} kg`;
    case 'portillas': return `Cristal reforzado · ${p.profundidadDisenoM} m · ${p.masaKg} kg`;
    case 'escotilla': return `Apertura animada · cierre hermético · ${p.masaKg} kg`;
    default: return '';
  }
};

export function AssemblyScreen(app) {
  const { t } = app;
  let slotSel = 'casco';
  let cont;
  let canvas;
  let dragSlot = null;

  async function cambiar(fn) {
    if (app.soloLectura) {
      app.aviso('Modo solo lectura del profesor: el diseño del alumno no puede modificarse.', 'error');
      return;
    }
    const r = fn();
    if (r && r.ok === false) app.aviso(r.error, 'error');
    else app.bus?.emit?.('diseno_cambiado', { proyecto_id: app.proyecto_id });
    await app.refrescarVista();
    pintar();
  }

  function slotLibre(tipo, preferido = slotSel, excluir = null) {
    const prefer = app.assembly.slot(preferido);
    // Primero se respeta el punto seleccionado (permite sustituir su pieza).
    if (prefer?.tipo === tipo && prefer.id !== excluir) return prefer;
    // Después se busca un punto libre de la misma categoría.
    const libre = app.assembly.slots.find(s => s.tipo === tipo && s.id !== excluir && !app.assembly.get(s.id));
    if (libre) return libre;
    // Si todos están ocupados, se devuelve uno para que el usuario pueda sustituirlo.
    return app.assembly.slots.find(s => s.tipo === tipo && s.id !== excluir) || null;
  }

  function iniciarArrastre(e, p, indice, origenSlotId = null) {
    if (app.soloLectura || !e.dataTransfer) { e.preventDefault(); return; }
    const destino = origenSlotId
      ? (slotLibre(p.tipo, slotSel, origenSlotId) || app.assembly.slot(origenSlotId))
      : slotLibre(p.tipo, slotSel);
    dragSlot = destino?.id || null;
    const payload = { partId: p.id, tipo: p.tipo, slotId: dragSlot, sourceSlotId: origenSlotId };
    e.dataTransfer.effectAllowed = origenSlotId ? 'move' : 'copy';
    e.dataTransfer.setData('application/x-submarine-part', JSON.stringify(payload));
    // text/plain mantiene compatibilidad con navegadores que filtran MIME personalizados.
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    const img = e.currentTarget?.querySelector?.('img');
    if (img && e.dataTransfer.setDragImage) {
      // La imagen original ya está cargada y visible: evita que el navegador
      // sustituya el arrastre por el texto del botón o por una miniatura vacía.
      const rect = img.getBoundingClientRect();
      e.dataTransfer.setDragImage(img, Math.max(1, rect.width / 2), Math.max(1, rect.height / 2));
    }
  }

  function listaSlots() {
    return h('div', { class: 'lista-piezas' }, app.assembly.slots.map((s) => {
      const puesto = app.assembly.get(s.id);
      const part = puesto?.part;
      return h('button', { class: 'slot-item' + (slotSel === s.id ? ' activo' : ''), draggable: !!part,
        onclick: () => { slotSel = s.id; pintar(); },
        ondragstart: (e) => { if (part) iniciarArrastre(e, part, Math.max(0, app.catalog.byTipo(s.tipo).findIndex(p => p.id === part.id)), s.id); } },
        h('img', { class: 'mini-pieza mini-slot', src: miniatura(part || app.catalog.byTipo(s.tipo)[0] || s.tipo, '', part ? Math.max(0, app.catalog.byTipo(s.tipo).findIndex(p => p.id === part.id)) : 0), alt: `Miniatura ${part?.nombre || TIPO_LABEL[s.tipo]}`, draggable: 'false' }),
        h('span', { class: 'slot-nombre' }, s.nombre, s.obligatorio ? h('em', { class: 'obl' }, ' *') : null),
        h('span', { class: 'slot-estado ' + (puesto ? 'ok' : 'falta') }, puesto ? '✓' : '—'));
    }));
  }

  function detalle() {
    const slot = app.assembly.slot(slotSel); if (!slot) return h('div');
    const actual = app.assembly.piezas[slot.id];
    const variantes = app.catalog.byTipo(slot.tipo);
    const hijos = [h('div', { class: 'catalogo-cabecera' }, h('div', {}, h('h4', {}, TIPO_LABEL[slot.tipo] || slot.nombre), h('p', { class: 'tenue pequeno' }, `${variantes.length} opciones · ${slot.nombre}`)), h('span', { class: 'limite-piezas' }, `${app.assembly.slots.filter(s => s.tipo === slot.tipo).length} montaje(s) máx.`))];
    hijos.push(h('p', { class: 'tenue pequeno' }, 'Arrastra una miniatura directamente sobre el submarino 3D o selecciónala para colocarla en este punto.'));
    hijos.push(h('div', { class: 'variantes variantes-graficas' }, variantes.map((p, indice) => h('button', {
      class: 'variante variante-grafica' + (actual?.partId === p.id ? ' activo' : ''),
      draggable: true,
      disabled: !!app.soloLectura,
      title: `${p.nombre}. ${p.descripcion}`,
      ondragstart: (e) => iniciarArrastre(e, p, indice),
      onclick: () => cambiar(() => {
        const r = app.assembly.place(slot.id, p.id, undefined);
        if (r?.ok) {
          const d = { proyecto_id: app.proyecto_id, slotId: slot.id, partId: p.id };
          app.bus.emit('objeto_colocado', d);
          app.bus.emit('object_colocado', d);
        }
        return r;
      })
    }, h('img', { class: 'mini-pieza mini-variante', src: miniatura(p, '', indice), alt: `Ilustración única de ${p.nombre}`, draggable: 'false' }),
       h('span', { class: 'variante-texto' }, h('strong', {}, p.nombre), h('span', { class: 'tenue pequeno' }, resumen(p)), h('span', { class: 'tenue micro' }, p.descripcion)),
       h('span', { class: 'arrastrar-indicador', 'aria-hidden': 'true' }, '⠿')))));
    if (slot.tipo === 'escotilla' && actual) hijos.push(h('p', { class: 'nota-interaccion' }, 'En la vista 3D, haz clic sobre la tapa para alternar entre abierta y cerrada.'));
    if (slot.tipo === 'casco' && actual) {
      const part = app.catalog.part(actual.partId);
      hijos.push(h('label', { class: 'campo' }, t('ens.material', 'Material del casco'),
        h('select', { disabled: !!app.soloLectura, onchange: (e) => cambiar(() => app.assembly.place(slot.id, actual.partId, e.target.value)) },
          part.materialesPermitidos.map((id) => { const m = app.catalog.material(id); return h('option', { value: id, selected: id === actual.materialId }, `${m.nombre} · ${m.densidadKgM3} kg/m³ · ${m.limiteElasticoMPa} MPa`); }))));
      const m = app.catalog.material(actual.materialId);
      hijos.push(h('p', { class: 'tenue pequeno' }, m.uso));
    }
    if (actual) hijos.push(h('button', { class: 'btn peligro', disabled: !!app.soloLectura, onclick: () => cambiar(() => app.assembly.remove(slot.id)) }, t('ens.quitar', 'Quitar pieza')));
    return h('div', { class: 'detalle' }, hijos);
  }

  function estadisticas() {
    const st = app.stats();
    const fila = (k, v, mal) => h('div', { class: 'fila-stat' + (mal ? ' mal' : '') }, h('span', {}, k), h('strong', {}, v));
    if (!st.casco) return h('div', { class: 'tarjeta' }, h('h4', {}, t('ens.stats', 'Estadísticas del diseño')), h('p', { class: 'tenue' }, t('ens.sincasco', 'Coloca un casco para ver las estadísticas.')));
    const neto = st.flotabilidadNetaKg;
    return h('div', { class: 'tarjeta' }, h('h4', {}, t('ens.stats', 'Estadísticas del diseño')),
      fila(t('ens.masa', 'Masa total (en seco)'), `${fmt(st.masaSecaKg, 0)} kg`),
      fila(t('ens.volumen', 'Volumen desplazado'), `${fmt(st.volumenEnvolventeM3, 2)} m³`),
      fila(t('ens.flot', 'Flotabilidad neta (lastre vacío)'), `${fmt(neto, 0)} kg`, neto < 0),
      fila(t('ens.neutro', 'Llenado de lastre neutro'), st.llenadoNeutro === null ? '—' : `${fmt(st.llenadoNeutro * 100, 0)} %`, st.llenadoNeutro !== null && (st.llenadoNeutro < 0 || st.llenadoNeutro > 1)),
      fila(t('ens.diseno', 'Profundidad de diseño'), `${fmt(st.profundidadDisenoM, 0)} m`),
      fila(t('ens.colapso', 'Profundidad de colapso'), `${fmt(st.profundidadColapsoM, 0)} m`),
      fila(t('ens.limitante', 'Pieza limitante'), st.limitante),
      fila(t('ens.bg', 'Estabilidad (BG)'), `${fmt(st.bgM, 2)} m`, st.bgM <= 0),
      fila(t('ens.trim', 'Trimado estimado'), st.trimadoDeg === null ? '—' : `${fmt(st.trimadoDeg, 1)}°`),
      fila(t('ens.autonomia', 'Autonomía a 1,5 m/s'), st.autonomiaCrucero ? `${fmt(st.autonomiaCrucero.horas, 1)} h` : '—'),
      fila(t('ens.costo', 'Costo estimado'), `$${fmt(st.costoUsd, 0)} USD`),
      st.advertencias.length ? h('ul', { class: 'advertencias' }, st.advertencias.map((a) => h('li', {}, a))) : null);
  }

  function alSoltar(e) {
    e.preventDefault();
    if (app.soloLectura) return app.aviso('Modo solo lectura del profesor: no se puede modificar el diseño del alumno.', 'error');
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('application/x-submarine-part') || e.dataTransfer.getData('text/plain') || '{}'); } catch { data = {}; }
    if (!data.partId) return;
    const part = app.catalog.part(data.partId);
    const tipo = data.tipo || part?.tipo;
    if (!part || part.tipo !== tipo) return app.aviso('No se pudo identificar la pieza arrastrada.', 'error');
    // Al mover una pieza instalada se conserva su punto si no existe otro compatible;
    // al arrastrar desde el catálogo se permite reemplazar cuando la categoría está llena.
    const origen = data.sourceSlotId ? app.assembly.slot(data.sourceSlotId) : null;
    let slotDestino = null;
    if (tipo === 'portillas' && app.stats().casco) {
      // Portillas: babor/estribor según el lado del casco donde se suelta.
      const lado = puntoBajoPuntero(app, canvas, e.clientX, e.clientY, 'exterior');
      if (lado) slotDestino = app.assembly.slot(lado.x >= 0 ? 'portillas_estribor' : 'portillas');
    }
    const slot = slotDestino || (origen && origen.tipo === tipo && !slotLibre(tipo, slotSel, origen.id)
      ? origen
      : (app.assembly.slot(data.slotId || dragSlot) || slotLibre(tipo, slotSel, origen?.id)));
    if (!slot) return app.aviso(`No hay un punto de montaje compatible para ${TIPO_LABEL[tipo] || 'esta categoría'}. Selecciona un punto existente para sustituir la pieza o retira una.`, 'error');

    // Posición bajo el puntero: sobre el casco o, para lo que va dentro (baterías, pesos, timón…), dentro de él,
    // siempre sin atravesar otras piezas.
    let posRel = null;
    if (tipo !== 'casco' && app.stats().casco) {
      try {
        const calc = posRelDesdePuntero(app, canvas, e.clientX, e.clientY, part, slot, origen ? [origen.id] : []);
        if (calc?.sinHueco) return app.aviso('No hay espacio libre en ese punto: las piezas no pueden atravesarse. Prueba otra zona.', 'error');
        posRel = calc?.posRel ?? null;
      } catch (err) { console.warn('No se pudo calcular la posición libre; se usará el punto de montaje.', err); }
    }

    cambiar(() => {
      const resultado = app.assembly.place(slot.id, data.partId, undefined, posRel);
      if (resultado?.ok) {
        const d = { proyecto_id: app.proyecto_id, slotId: slot.id, partId: data.partId };
        app.bus.emit('objeto_colocado', d);
        app.bus.emit('object_colocado', d);
      }
      if (resultado?.ok && origen && origen.id !== slot.id) app.assembly.remove(origen.id);
      return resultado;
    });
  }

  let pruebaComparativa = null;
  function panelDiagnostico() {
    const st = app.stats();
    const d = diagnosticarEnsamblaje(st);
    const salida = h('div', { class: 'resultado-diagnostico' });
    const ejecutar = (fallas) => {
      try {
        const env = entornoDe({ temperaturaC: 15 }, app.settings);
        const resultado = ejecutarPruebaFisica(PhysicsModule, app.worldEfectivo(), env, app.stats(), { fallas, segundos: 20 });
        pruebaComparativa = { tipo: fallas ? 'Falla inducida' : 'Condición nominal', ...resultado };
        limpiar(salida).append(
          h('strong', { class: fallas ? 'texto-aviso' : 'texto-ok' }, `${pruebaComparativa.tipo} · ${fmt(resultado.segundos, 1)} s`),
          h('div', { class: 'fila-stat' }, h('span', {}, 'Masa final'), h('strong', {}, `${fmt(resultado.masaFinalKg, 1)} kg`)),
          h('div', { class: 'fila-stat' }, h('span', {}, 'Agua acumulada'), h('strong', {}, `${fmt(resultado.inundacionKg, 2)} kg`)),
          h('div', { class: 'fila-stat' }, h('span', {}, 'Balanceo / cabeceo'), h('strong', {}, `${fmt(resultado.rollDeg, 2)}° / ${fmt(resultado.pitchDeg, 2)}°`)),
          h('div', { class: 'fila-stat' }, h('span', {}, 'Profundidad final'), h('strong', {}, `${fmt(resultado.profundidadM, 2)} m`)),
          h('p', { class: 'tenue pequeno' }, resultado.colapsado ? 'Resultado: colapso detectado.' : `Eventos registrados: ${resultado.eventos.length}.`));
      } catch (e) { limpiar(salida).append(h('p', { class: 'texto-error' }, e.message)); }
    };
    return h('div', { class: 'tarjeta diagnostico-fisico' },
      h('h4', {}, 'Diagnóstico y simulación de seguridad'),
      h('p', { class: 'tenue pequeno' }, `${st.componentesFisicos?.length ?? 0} componentes con propiedades físicas registradas. Centro de gravedad: ${st.cgM.map(v => fmt(v, 3)).join(', ')} m.`),
      h('div', { class: 'fila-stat' }, h('span', {}, 'GM longitudinal'), h('strong', {}, `${fmt(st.gmLongM, 3)} m`)),
      h('div', { class: 'fila-stat' }, h('span', {}, 'GM transversal'), h('strong', {}, `${fmt(st.gmTransM, 3)} m`)),
      h('div', { class: 'fila-stat' }, h('span', {}, 'Evaluación'), h('strong', { class: d.seguro ? 'texto-ok' : 'texto-aviso' }, d.seguro ? 'Condición nominal aceptable' : 'Requiere revisión')),
      d.alertas.length ? h('ul', { class: 'advertencias' }, d.alertas.map(a => h('li', {}, a))) : h('p', { class: 'texto-ok pequeno' }, 'Sin alertas de montaje detectadas.'),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn secundario', onclick: () => ejecutar(true) }, 'Simular fuga y desbalance'),
        h('button', { class: 'btn primario', onclick: () => ejecutar(false) }, 'Probar condición nominal')),
      salida);
  }

  function pintar() {
    limpiar(cont);
    const st = app.stats();
    const cons = consecuencias(st).filter((c) => c.severidad !== 'aviso' || false);
    cont.append(...[ // la sección "faltan piezas" vale null si el diseño está completo
      h('h2', {}, t('ens.titulo', 'Armar submarino')),
      app.soloLectura
        ? h('div', { class: 'tarjeta aviso-profesor' },
            h('strong', {}, `Modo espejo docente (solo lectura) · Alumno: ${app.alumnoId}`),
            h('p', { class: 'tenue pequeno' }, 'Puedes inspeccionar cada punto de montaje, rotar la cámara 3D y ejecutar diagnósticos o pruebas, pero la edición y el guardado están bloqueados.'))
        : h('p', { class: 'tenue' }, 'Selecciona una categoría del menú original. Cada miniatura representa la pieza real que puedes arrastrar al submarino. * = obligatoria.'),
      listaSlots(), detalle(), estadisticas(), panelDiagnostico(),
      cons.length ? h('div', { class: 'tarjeta aviso-caja' }, h('h4', {}, icono('alerta', 18), ' ', t('ens.faltan', 'Faltan piezas (se puede probar igual)')), h('ul', {}, cons.map((c) => h('li', {}, c.mensaje)))) : null,
      h('div', { class: 'acciones' },
        h('button', { class: 'btn secundario', disabled: !!app.soloLectura, onclick: () => cambiar(() => { app.assembly.clear(); }) }, t('ens.limpiar', 'Empezar de cero')),
        h('button', { class: 'btn secundario', disabled: !!app.soloLectura, onclick: async () => { await app.cargarEjemplo(); pintar(); } }, t('ens.ejemplo', 'Cargar ejemplo')),
        h('button', { class: 'btn secundario', onclick: async () => { await app.cargar(); pintar(); } }, t('ens.restaurar', 'Restaurar guardado')),
        h('button', { class: 'btn secundario', disabled: !!app.soloLectura, onclick: () => app.guardarDiseno() }, icono('guardar', 16), ' ', t('ens.guardar', 'Guardar diseño')),
        h('label', { class: 'btn secundario archivo' + (app.soloLectura ? ' deshabilitado' : '') }, t('ens.cargar', 'Cargar diseño…'),
          h('input', { type: 'file', disabled: !!app.soloLectura, accept: 'application/json,.json', onchange: async (e) => { if (app.soloLectura) return; const f = e.target.files[0]; if (f) { await app.cargarDiseno(JSON.parse(await f.text())); pintar(); } } })),
        h('button', { class: 'btn primario', onclick: () => app.go('pruebas') }, t('comun.siguiente', 'Siguiente'), ' →'))].filter(Boolean));
  }

  return {
    async mount() {
      app.mostrarEscena(true, 'taller');
      cont = h('section', { class: 'pantalla compacta' });
      limpiar(app.panel).append(cont);
      canvas = app.view?.sm?.canvas || document.getElementById('render');
      if (canvas) {
        canvas.addEventListener('dragenter', permitirSoltar);
        canvas.addEventListener('dragover', permitirSoltar);
        canvas.addEventListener('drop', alSoltar);
      }
      await app.refrescarVista();
      app.view.setCascoAlpha(0.45);
      pintar();
    },
    unmount() {
      if (canvas) { canvas.removeEventListener('dragenter', permitirSoltar); canvas.removeEventListener('dragover', permitirSoltar); canvas.removeEventListener('drop', alSoltar); }
      app.view.setCascoAlpha(1);
    }
  };
}
function permitirSoltar(e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }
