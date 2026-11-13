import { h, limpiar, fmt } from '../dom.js';
import { icono } from '../Icons.js';
import { seccionesEsfuerzo, esfuerzoMembranaPa } from '../../physics/HullStress.js';
import { presionManometricaPa } from '../../physics/Pressure.js';
import { entornoDe } from '../../trials/TrialRunner.js';

export function StressScreen(app) {
  const { t } = app;
  let cont;
  return {
    async mount() {
      app.mostrarEscena(true, 'taller');
      const r = app.resultado;
      const world = app.worldEfectivo();
      const env = r ? r.env : entornoDe({ temperaturaC: 15 }, app.settings);
      const st = app.assembly.stats(world, env);
      cont = h('section', { class: 'pantalla compacta' });
      limpiar(app.panel).append(cont);
      await app.refrescarVista();
      app.view.setCascoAlpha(1);
      if (!st.casco) { cont.append(h('h2', {}, t('est.titulo', 'Estrés estructural')), h('p', { class: 'tenue' }, t('ens.sincasco', 'Coloca un casco para ver las estadísticas.'))); return; }
      const maxD = Math.ceil(st.profundidadColapsoM * 1.3 / 10) * 10;
      let depth = Math.min(maxD, Math.max(0, Math.round(r ? r.resumen.profundidadMaxM : st.profundidadDisenoM * 0.5)));
      const info = h('div', { class: 'tarjeta' }), msg = h('div', { class: 'mensaje-est' });
      const slider = h('input', { type: 'range', min: 0, max: maxD, step: 5, value: depth, oninput: (e) => { depth = Number(e.target.value); actualizar(); } });
      function actualizar() {
        const razones = seccionesEsfuerzo(st.casco, st.casco.colapso, world, env, depth, 12);
        app.fx.mostrarMapa(st.casco, razones, app.view.root);
        const rmax = Math.max(...razones);
        const dP = presionManometricaPa(world, env, depth);
        const sf = dP > 0 ? st.casco.colapso / dP : Infinity;
        limpiar(info).append(h('h4', {}, `${t('est.profundidad', 'Profundidad analizada')}: ${depth} m`), slider,
          h('div', { class: 'fila-stat' }, h('span', {}, t('est.presion', 'Presión manométrica')), h('strong', {}, `${fmt(dP / 101325, 1)} atm`)),
          h('div', { class: 'fila-stat' }, h('span', {}, t('est.esfuerzo', 'Esfuerzo de membrana')), h('strong', {}, `${fmt(esfuerzoMembranaPa(st.casco, world, env, depth) / 1e6, 0)} MPa`)),
          h('div', { class: 'fila-stat' }, h('span', {}, t('est.razon', 'Esfuerzo máximo / colapso')), h('strong', {}, `${fmt(rmax * 100, 0)} %`)),
          h('div', { class: 'fila-stat' }, h('span', {}, t('est.sf', 'Factor de seguridad (casco)')), h('strong', {}, Number.isFinite(sf) ? fmt(sf, 2) : '—')),
          h('div', { class: 'fila-stat' }, h('span', {}, t('est.modo', 'Modo de falla')), h('strong', {}, st.casco.modo === 'pandeo' ? 'pandeo elástico' : 'fluencia')));
        const falla = rmax >= 1, aviso = !falla && sf < st.factorSeguridad;
        limpiar(msg).append(icono(falla || aviso ? 'alerta' : 'ok', 26), h('div', {},
          h('strong', { class: falla ? 'texto-error' : aviso ? 'texto-aviso' : 'texto-ok' }, falla ? t('est.falla', 'Falla detectada') : aviso ? t('est.limite', 'Por debajo del factor de seguridad') : t('est.sinfallas', 'Sin fallas detectadas')),
          h('p', { class: 'tenue pequeno' }, falla ? t('est.falla.txt', 'El casco colapsaría a esta profundidad.') : aviso ? t('est.limite.txt', 'El casco resiste, pero con poco margen.') : t('est.sinfallas.txt', 'El casco soporta las cargas aplicadas.'))));
      }
      cont.append(h('h2', {}, t('est.titulo', 'Estrés estructural')),
        h('p', { class: 'tenue' }, t('est.sub', 'Se aplican cargas para verificar la resistencia del casco.')),
        h('div', { class: 'leyenda' }, h('span', {}, t('est.bajo', 'Bajo')), h('div', { class: 'gradiente' }), h('span', {}, t('est.alto', 'Alto'))),
        info, msg,
        h('p', { class: 'tenue pequeno' }, t('est.nota', 'Modelo simplificado por secciones (fluencia y pandeo), no es un análisis de elementos finitos.')),
        h('div', { class: 'acciones' },
          h('button', { class: 'btn secundario', onclick: () => app.go('pruebas') }, '← ', t('comun.atras', 'Atrás')),
          h('button', { class: 'btn primario', onclick: () => app.go('resultados') }, t('comun.siguiente', 'Siguiente'), ' →')));
      actualizar();
    },
    unmount() { app.fx.limpiar(); }
  };
}
