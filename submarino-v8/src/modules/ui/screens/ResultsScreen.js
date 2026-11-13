import { h, limpiar, fmt } from '../dom.js';
import { icono } from '../Icons.js';
import { graficar } from '../Charts.js';
import { consecuencias } from '../../submarine/MissingParts.js';

export function ResultsScreen(app) {
  const { t } = app;
  return {
    async mount() {
      app.mostrarEscena(false);
      const r = app.resultado;
      const cont = h('section', { class: 'pantalla' });
      limpiar(app.panel).append(cont);
      if (!r) {
        cont.append(h('h2', {}, t('res.titulo', 'Resultados de la prueba')), h('p', { class: 'tenue' }, t('res.vacio', 'Todavía no hay resultados. Ejecuta una prueba primero.')),
          h('button', { class: 'btn primario', onclick: () => app.go('pruebas') }, t('res.ir', 'Ir a las pruebas')));
        return;
      }
      const s = r.resumen, d = r.dictamen;
      const tile = (ic, k, v) => h('div', { class: 'tile' }, icono(ic, 22), h('span', { class: 'tenue' }, k), h('strong', {}, v));
      const c1 = h('canvas', { class: 'grafica' }), c2 = h('canvas', { class: 'grafica' });
      cont.append(...[ // las secciones opcionales valen null: se filtran para que el DOM no escriba "null"
        h('h2', {}, t('res.titulo', 'Resultados de la prueba')),
        h('p', { class: 'tenue' }, `${r.escenario.nombre} · ${t('res.resumen', 'Resumen del rendimiento del submarino.')}`),
        h('div', { class: 'veredicto ' + (d.aprobado ? 'aprobado' : 'fallo') }, icono(d.aprobado ? 'ok' : 'alerta', 34),
          h('div', {}, h('small', { class: 'tenue' }, t('res.estado', 'Estado general')), h('h3', {}, d.aprobado ? t('res.aprobado', 'Aprobado') : t('res.noaprobado', 'No aprobado')),
            h('p', {}, d.aprobado ? t('res.cumple', 'El submarino cumple con los requisitos de la prueba.') : t('res.nocumple', 'El submarino no cumple todos los criterios.')))),
        h('div', { class: 'tarjeta' }, h('h4', {}, t('res.criterios', 'Criterios')), h('ul', { class: 'checks' }, d.checks.map((c) => h('li', { class: c.ok ? 'ok' : 'no' }, h('span', { class: 'marca' }, c.ok ? '✓' : '✗'), h('div', {}, h('strong', {}, c.texto), h('div', { class: 'tenue pequeno' }, c.detalle)))))),
        (!d.aprobado && (consecuencias(r.stats).length || r.stats.advertencias.length)) ? h('div', { class: 'tarjeta aviso-caja' }, h('h4', {}, icono('alerta', 18), ' ', t('res.causas', 'Causas probables')),
          h('ul', {}, [...consecuencias(r.stats).map((c) => c.mensaje), ...r.stats.advertencias].map((m) => h('li', {}, m)))) : null,
        h('div', { class: 'tiles' },
          tile('profundidad', t('res.profmax', 'Profundidad máxima'), `${fmt(s.profundidadMaxM, 1)} m`),
          tile('velocidad', t('res.velmax', 'Velocidad máxima'), `${fmt(s.velocidadMaxNudos, 1)} nudos`),
          tile('termometro', t('res.temp', 'Temperatura del agua'), `${fmt(s.temperaturaC, 0)} °C`),
          tile('presion', t('res.presion', 'Presión a profundidad máx.'), `${fmt(s.presionMaxAtm, 1)} atm (abs.)`),
          tile('bateria', t('res.energia', 'Energía usada'), `${fmt(s.energiaUsadaWh / 1000, 2)} kWh`),
          tile('brujula', t('res.dist', 'Distancia recorrida'), `${fmt(s.distanciaM, 0)} m`)),
        h('div', { class: 'graficas' }, h('div', { class: 'tarjeta' }, h('h4', {}, t('res.g.prof', 'Profundidad en el tiempo')), c1), h('div', { class: 'tarjeta' }, h('h4', {}, t('res.g.energia', 'Batería en el tiempo')), c2)),
        r.eventos.length ? h('div', { class: 'tarjeta' }, h('h4', {}, t('res.eventos', 'Eventos')), h('ul', {}, r.eventos.map((e) => h('li', {}, `${fmt(e.t, 0)} s · ${e.tipo}${e.depthM ? ` (${fmt(e.depthM, 0)} m)` : ''}`)))) : null,
        (() => {
          const ev = app.generarPuntajes?.() || app.telemetry?.generarPuntajes?.();
          if (!ev) return null;
          const dm = ev.dimensiones;
          return h('div', { class: 'tarjeta evaluacion-steam' },
            h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' },
              h('h4', { style: 'margin:0;' }, 'Evaluación y Puntajes STEAM (Core evaluacion.js)'),
              h('strong', { class: ev.aprobado ? 'texto-ok' : 'texto-aviso' }, `Global: ${ev.puntajeGlobal}/100 · ${ev.nivel}`)
            ),
            h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-top:8px;' },
              h('div', { class: 'tile' }, h('strong', {}, 'M · Matemáticas'), h('span', { class: 'tenue' }, `${dm.M.puntaje} pts`), h('small', {}, dm.M.nivel)),
              h('div', { class: 'tile' }, h('strong', {}, 'S · Ciencias'), h('span', { class: 'tenue' }, `${dm.S.puntaje} pts`), h('small', {}, dm.S.nivel)),
              h('div', { class: 'tile' }, h('strong', {}, 'E · Ingeniería'), h('span', { class: 'tenue' }, `${dm.E.puntaje} pts`), h('small', {}, dm.E.nivel)),
              h('div', { class: 'tile' }, h('strong', {}, 'T · Tecnología'), h('span', { class: 'tenue' }, `${dm.T.puntaje} pts`), h('small', {}, dm.T.nivel)),
              h('div', { class: 'tile' }, h('strong', {}, 'A · Artes'), h('span', { class: 'tenue' }, `${dm.A.puntaje} pts`), h('small', {}, dm.A.nivel))
            ),
            h('div', { class: 'tenue micro', style: 'margin-top:8px;' },
              `Aciertos: ${ev.estadisticas.aciertos} · Fallos: ${ev.estadisticas.fallos} · Cámaras: ${ev.estadisticas.camarasUsadas.join(', ') || 'taller'} · Distancia: ${ev.estadisticas.distanciaRecorridaM} m`
            ),
            ev.recomendaciones.length ? h('p', { class: 'tenue pequeno', style: 'margin-top:6px; font-style:italic;' }, `💡 ${ev.recomendaciones[0]}`) : null,
            // E3: logro de los objetivos evaluables del manifest (calcularObjetivos)
            ev.objetivos?.length ? h('div', { style: 'margin-top:10px;' }, h('h4', { style: 'margin:0 0 6px;' }, 'Objetivos evaluables'),
              h('ul', { class: 'checks' }, ev.objetivos.map((o) => h('li', { class: o.logrado ? 'ok' : 'no' },
                h('span', { class: 'marca' }, o.logrado ? '✓' : '✗'),
                h('div', {}, h('strong', {}, `${o.id} · ${o.puntaje}/100 · ${o.nivel}`),
                  h('div', { class: 'tenue pequeno' }, `${o.objetivo} (${o.dimensiones.join(', ')}${o.faltan.length ? ` · reforzar: ${o.faltan.join(', ')}` : ''})`)))))) : null
          );
        })(),
        h('div', { class: 'acciones' },
          h('button', { class: 'btn primario', onclick: () => app.guardarReporte(r) }, icono('guardar', 16), ' ', t('res.guardar', 'Guardar reporte')),
          h('button', { class: 'btn secundario', onclick: () => app.go('pruebas') }, t('res.otra', 'Otra prueba')),
          h('button', { class: 'btn secundario', onclick: () => app.go('ensamblaje') }, t('res.modificar', 'Modificar el diseño')))].filter(Boolean));
      requestAnimationFrame(() => {
        graficar(c1, { x: r.serie.t, series: [{ y: r.serie.profundidadM, color: '#4da3ff' }], xEtiqueta: 's', yEtiqueta: 'Profundidad (m)', invertirY: true, yMin: 0 });
        graficar(c2, { x: r.serie.t, series: [{ y: r.serie.energiaPct, color: '#3ddc84' }], xEtiqueta: 's', yEtiqueta: 'Batería (%)', yMin: 0, yMax: 100 });
      });
    },
    unmount() {}
  };
}
