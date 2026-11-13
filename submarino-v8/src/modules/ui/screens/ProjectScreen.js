// Proyecto STEAM: ficha del proyecto, mapeo STEAM y objetivos evaluables (la tarjeta del catálogo vive en proyectos.html).
import { esc } from './steam.js';

export function ProjectScreen(app) {
  return {
    async mount() {
      app.mostrarEscena(false);
      app.panel.innerHTML = '<div class="st-pagina" id="st-proyecto">Cargando proyecto…</div>';
      const cont = app.panel.querySelector('#st-proyecto');
      try {
        const m = app.datos.manifest;
        const steam = Object.keys(m.mapeoSTEAM || {});
        // E3: estado de cada objetivo según la evaluación actual (calcularObjetivos lee manifest.objetivos_evaluables)
        let logro = {};
        try { logro = Object.fromEntries((app.evaluacion?.calcularObjetivos?.(m) || []).map((o) => [o.id, o])); } catch { /* sin telemetría todavía */ }
        const etiqueta = (o) => logro[o.id] ? ` <span class="tenue">· ${logro[o.id].puntaje}/100 (${esc(logro[o.id].nivel)})${logro[o.id].logrado ? ' ✓' : ''}</span>` : '';
        cont.innerHTML = `<article class="st-card st-proyecto"><img src="${esc(m.portada)}" alt="Ilustración del submarino de exploración"><div class="st-cuerpo"><p class="st-tag">PROYECTO · ${esc(m.proyecto_id)}</p><h2>${esc(m.name)}</h2><p>${esc(m.descripcion)}</p><div class="st-chips">${steam.map((k) => `<span>${esc(k)}</span>`).join('')}</div><h3>Objetivos evaluables</h3><ul>${(m.objetivos_evaluables || []).map((o) => `<li><strong>${esc(o.id)} · ${esc(o.objetivo)}</strong>${etiqueta(o)}<br>${esc(o.indicador)}</li>`).join('')}</ul><div class="acciones"><a class="btn primario" href="#/biblioteca">Explorar módulos STEAM</a><a class="btn secundario" href="#/ensamblaje">Abrir simulador</a><a class="btn secundario" href="proyectos.html">Catálogo de proyectos</a></div></div></article>`;
        cont.querySelector('img')?.addEventListener('error', (e) => { e.target.closest('article').classList.add('st-sin-portada'); e.target.remove(); }); // sin portada: la ficha ocupa todo el ancho
      } catch (e) { cont.textContent = e.message; }
    },
    unmount() {}
  };
}
