import { h, limpiar } from '../dom.js';
import { densidadAgua } from '../../physics/Pressure.js';

const CLIMAS = [['tranquilo', 'Tranquilo', 0], ['suave', 'Corriente suave', 0.3], ['fuerte', 'Corriente fuerte', 0.8]];
const GRAVEDADES = [[9.81, '9,81 m/s² (estándar)'], [9.78, '9,78 m/s² (ecuador)'], [9.83, '9,83 m/s² (polos)']];

export function SettingsScreen(app) {
  const { t } = app;
  let borrador;
  const sel = (opciones, valor, onchange) => h('select', { onchange: (e) => onchange(e.target.value) },
    opciones.map(([v, txt]) => h('option', { value: v, selected: String(v) === String(valor) }, txt)));
  const toggle = (etiqueta, clave) => h('label', { class: 'toggle' }, h('span', {}, etiqueta),
    h('input', { type: 'checkbox', checked: borrador[clave], onchange: (e) => { borrador[clave] = e.target.checked; } }));

  return {
    async mount() {
      app.mostrarEscena(false);
      borrador = { ...app.settings };
      const rho = densidadAgua({ ...app.datos.physics, modoSimplificado: true }, { tipoAgua: borrador.tipoAgua }, 0);
      const dens = h('strong', {}, `${rho.toFixed(0)} kg/m³`);
      limpiar(app.panel).append(h('section', { class: 'pantalla' },
        h('h2', {}, t('config.titulo', 'Configuración de la simulación')),
        h('p', { class: 'tenue' }, t('config.sub', 'Ajusta los parámetros generales del entorno.')),
        h('div', { class: 'grid3' },
          h('div', { class: 'tarjeta' }, h('h4', {}, t('config.entorno', 'Entorno')),
            h('label', {}, t('config.agua', 'Tipo de agua'),
              sel(Object.entries(app.datos.physics.agua).map(([k, a]) => [k, a.nombre]), borrador.tipoAgua, (v) => { borrador.tipoAgua = v; dens.textContent = `${densidadAgua({ ...app.datos.physics, modoSimplificado: true }, { tipoAgua: v }, 0).toFixed(0)} kg/m³`; })),
            h('label', {}, t('config.clima', 'Clima'), sel(CLIMAS.map(([k, n]) => [k, n]), borrador.clima, (v) => { borrador.clima = v; }))),
          h('div', { class: 'tarjeta' }, h('h4', {}, t('config.fisicos', 'Parámetros físicos')),
            h('label', {}, t('config.gravedad', 'Gravedad'), sel(GRAVEDADES, borrador.gravedad, (v) => { borrador.gravedad = Number(v); })),
            h('p', { class: 'tenue' }, t('config.densidad', 'Densidad del agua (superficie):'), ' ', dens)),
          h('div', { class: 'tarjeta' }, h('h4', {}, t('config.opciones', 'Opciones')),
            toggle(t('config.malla', 'Mostrar malla'), 'mostrarMalla'),
            toggle(t('config.datos', 'Mostrar datos (HUD)'), 'mostrarDatos'),
            toggle(t('config.simplificado', 'Modo simplificado'), 'modoSimplificado'),
            h('p', { class: 'tenue pequeno' }, t('config.simpl.ayuda', 'El modo simplificado usa densidad constante y sin variación con la profundidad.')))),
        h('div', { class: 'acciones' },
          h('button', { class: 'btn primario', disabled: !!app.soloLectura, onclick: () => { app.guardarAjustes(borrador); app.aviso(t('config.guardado', 'Cambios guardados')); } }, t('config.guardar', 'Guardar cambios')),
          h('button', { class: 'btn secundario', disabled: !!app.soloLectura, onclick: () => { app.guardarAjustes(null); this.mount(); } }, t('config.restablecer', 'Restablecer')),
          h('button', { class: 'btn secundario', onclick: () => app.slog.exportJSON() }, t('config.exportar.slog', 'Exportar SLog')),
          h('button', { class: 'btn secundario', onclick: () => app.telemetry.exportJSONL() }, t('config.exportar.tel', 'Exportar telemetría')))));
    },
    unmount() {}
  };
}
export { CLIMAS };
