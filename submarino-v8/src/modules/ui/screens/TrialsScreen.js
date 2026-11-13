import { h, limpiar } from '../dom.js';
import { icono } from '../Icons.js';
import { consecuencias } from '../../submarine/MissingParts.js';
import { ejecutarPrueba } from '../../trials/TrialRunner.js';
import { TECLAS } from '../../controls/ControlsModule.js';

const CAMPOS = [
  ['profundidadM', 'Profundidad objetivo', 'm', 0, 6000, 5, 'agua'],
  ['velocidadNudos', 'Velocidad objetivo', 'nudos', 0, 8, 0.5, 'velocidad'],
  ['temperaturaC', 'Temperatura del agua', '°C', -2, 35, 1, 'termometro'],
  ['corrienteMs', 'Velocidad de corriente', 'm/s', 0, 2, 0.1, 'agua']
];
const DESCRIPCIONES = {
  manual: 'Controla el submarino directamente con el teclado.',
  flotabilidad: 'Comprueba si el diseño flota y permanece nivelado en superficie.',
  profundidad: 'Desciende a la profundidad objetivo e intenta mantenerla.',
  maniobra: 'Navega a la velocidad elegida y realiza un giro.',
  autonomia: 'Mantiene velocidad y rumbo para estimar consumo y autonomía.',
  corriente: 'Evalúa la capacidad de mantener posición frente a una corriente.',
  emergencia: 'Simula una pérdida de energía y la activación del ascenso de emergencia.'
};

export function TrialsScreen(app) {
  const { t } = app;
  let cont, esc, cond, duracionS;

  function elegir(id) {
    esc = app.datos.scenarios.find((e) => e.id === id) ?? app.datos.scenarios[0];
    app.estado.escenarioId = esc.id;
    cond = app.estado.cond[esc.id] ??= { ...esc.condiciones };
    duracionS = app.estado.duraciones?.[esc.id] ?? esc.duracionS ?? 300;
  }

  function campo([k, nombre, unidad, min, max, paso, ic]) {
    const input = h('input', { type: 'number', min, max, step: paso, value: cond[k] ?? 0, 'aria-label': nombre,
      onchange: (e) => { const n = Number(e.target.value); cond[k] = Math.min(max, Math.max(min, Number.isFinite(n) ? n : min)); e.target.value = cond[k]; } });
    return h('label', { class: 'campo-cond' }, icono(ic, 20), h('span', { class: 'cond-nombre' }, nombre), input, h('span', { class: 'tenue' }, unidad));
  }

  function panelManual() {
    return h('div', { class: 'tarjeta' }, h('h4', {}, 'Piloto manual activo'),
      h('p', { class: 'tenue' }, 'Usa W/S para el empuje, A/D para girar y los controles de profundidad disponibles en el HUD.'),
      h('div', { class: 'teclas' }, TECLAS.map(([k, d]) => h('div', { class: 'tecla' }, h('kbd', {}, k), h('span', {}, d)))),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn secundario', onclick: () => app.bus.emit('camara-siguiente') }, 'Cambiar cámara (V)'),
        h('button', { class: 'btn secundario', onclick: () => app.bus.emit('reiniciar') }, 'Reiniciar (R)'),
        h('button', { class: 'btn peligro', onclick: () => { app.detenerManual(); pintar(); } }, 'Terminar piloto manual')));
  }

  async function iniciar(barra, boton) {
    const st = app.stats();
    if (st.efectos.sinCasco) { app.aviso(t('pru.sincasco', 'Sin casco no se puede probar.'), 'error'); return; }
    if (esc.tipo === 'manual') { app.iniciarManual({ ...cond }); pintar(); return; }
    const escenario = { ...esc, duracionS: Math.max(30, Math.min(7200, Number(duracionS) || 300)) };
    boton.disabled = true;
    const progreso = barra.parentElement;
    progreso.classList.remove('oculto'); barra.style.width = '0%';
    try {
      const r = await ejecutarPrueba({ assembly: app.assembly, world: app.worldEfectivo(), escenario, cond: { ...cond }, ajustes: app.settings,
        onProgress: (p) => { barra.style.width = `${Math.round(p * 100)}%`; } });
      if (!r.ok) { app.aviso(r.error, 'error'); return; }
      app.resultado = r;
      app.telemetry.event('prueba-finalizada', { escenario: esc.id, aprobado: r.dictamen.aprobado, profundidadMaxM: r.resumen.profundidadMaxM });
      app.go('estres');
    } catch (error) {
      console.error(error); app.aviso(`No se pudo completar la simulación: ${error.message}`, 'error');
    } finally { boton.disabled = false; }
  }

  function pintar() {
    limpiar(cont);
    const st = app.stats();
    const cons = consecuencias(st);
    const barra = h('div', { class: 'barra-progreso-fill' });
    const boton = h('button', { class: 'btn primario grande', onclick: () => iniciar(barra, boton) }, icono('play', 16), ' Ejecutar simulación');
    if (app.manual) { cont.append(h('h2', {}, 'Laboratorio de pruebas'), panelManual()); return; }

    const selector = h('select', { class: 'selector-prueba', 'aria-label': 'Tipo de prueba', onchange: (e) => { elegir(e.target.value); pintar(); } },
      app.datos.scenarios.map((e) => h('option', { value: e.id, selected: e.id === esc.id }, e.nombre)));
    const duracion = h('input', { type: 'number', min: 30, max: 7200, step: 30, value: duracionS, 'aria-label': 'Duración de simulación en segundos', onchange: (e) => {
      duracionS = Math.max(30, Math.min(7200, Number(e.target.value) || 30)); e.target.value = duracionS;
      app.estado.duraciones ??= {}; app.estado.duraciones[esc.id] = duracionS;
    }});
    const tipo = esc.tipo === 'manual' ? 'manual' : esc.tipo;
    cont.append(
      h('div', { class: 'laboratorio-cabecera' }, h('div', {}, h('h2', {}, 'Laboratorio de pruebas'), h('p', { class: 'tenue' }, 'Configura las condiciones una sola vez y ejecuta la simulación desde este panel.')),
        h('span', { class: 'lab-indicador' }, icono('agua', 16), ' SIMULACIÓN 3D')),
      h('div', { class: 'tarjeta lab-config' },
        h('div', { class: 'lab-seccion-titulo' }, h('span', { class: 'lab-numero' }, '01'), h('div', {}, h('h3', {}, 'Tipo de ensayo'), h('p', { class: 'tenue pequeno' }, 'Selecciona qué comportamiento quieres evaluar.'))),
        h('label', { class: 'campo-selector' }, h('span', {}, 'Prueba'), selector),
        h('p', { class: 'lab-descripcion' }, DESCRIPCIONES[tipo] ?? esc.descripcion)),
      h('div', { class: 'tarjeta lab-config' },
        h('div', { class: 'lab-seccion-titulo' }, h('span', { class: 'lab-numero' }, '02'), h('div', {}, h('h3', {}, 'Parámetros de simulación'), h('p', { class: 'tenue pequeno' }, 'Todos los valores están disponibles; los que no apliquen al ensayo seleccionado se ignorarán.'))),
        h('div', { class: 'lab-campos' }, CAMPOS.map(campo), h('label', { class: 'campo-cond' }, icono('reloj', 20), h('span', { class: 'cond-nombre' }, 'Duración'), duracion, h('span', { class: 'tenue' }, 'segundos')))),
      h('div', { class: 'tarjeta lab-config' },
        h('div', { class: 'lab-seccion-titulo' }, h('span', { class: 'lab-numero' }, '03'), h('div', {}, h('h3', {}, 'Estado del diseño'), h('p', { class: 'tenue pequeno' }, 'La prueba utiliza el ensamblaje actual del submarino.'))),
        h('div', { class: 'lab-resumen' },
          h('div', {}, h('span', {}, 'Masa total'), h('strong', {}, `${Math.round(st.masaTotalKg ?? st.masaSecaKg ?? 0).toLocaleString('es-MX')} kg`)),
          h('div', {}, h('span', {}, 'Profundidad de diseño'), h('strong', {}, `${Math.round(st.profundidadDisenoM ?? 0).toLocaleString('es-MX')} m`)),
          h('div', {}, h('span', {}, 'Estado'), h('strong', { class: st.efectos.sinCasco ? 'texto-error' : 'texto-ok' }, st.efectos.sinCasco ? 'Incompleto' : 'Listo para probar'))),
        esc.criterios.length ? h('details', { class: 'lab-criterios' }, h('summary', {}, 'Criterios de evaluación'), h('ul', { class: 'criterios' }, esc.criterios.map((c) => h('li', {}, c.texto)))) : null),
      cons.length ? h('div', { class: 'tarjeta aviso-caja' }, h('h4', {}, icono('alerta', 18), ' Advertencias del diseño actual'), h('ul', {}, cons.map((c) => h('li', {}, c.mensaje)))) : null,
      st.advertencias.length ? h('ul', { class: 'advertencias' }, st.advertencias.map((a) => h('li', {}, a))) : null,
      h('div', { class: 'lab-ejecutar' }, boton, h('span', { class: 'tenue pequeno' }, 'La ejecución puede tardar más con duraciones elevadas.')),
      h('div', { class: 'barra-progreso oculto' }, barra),
      h('div', { class: 'acciones' }, h('button', { class: 'btn secundario', onclick: () => app.go('ensamblaje') }, '← Volver al ensamblaje')));
  }

  return {
    async mount() {
      app.mostrarEscena(true, 'agua'); elegir(app.estado.escenarioId ?? 'inmersion');
      cont = h('section', { class: 'pantalla compacta laboratorio-pruebas' });
      limpiar(app.panel).append(cont); await app.refrescarVista();
      if (!app.manual) app.vistaPrevia(cond.profundidadM ?? 0);
      pintar();
    },
    unmount() { app.detenerManual(); }
  };
}
