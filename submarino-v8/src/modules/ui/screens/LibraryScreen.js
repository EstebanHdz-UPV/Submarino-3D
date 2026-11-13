// Biblioteca STEAM: módulos de aprendizaje y cuestionarios (antes learn.html).
import { esc } from './steam.js';

export function LibraryScreen(app) {
  let root = null, modulos = [];

  function mostrar(i) {
    const m = modulos[i], det = root.querySelector('#st-detalle');
    det.innerHTML = `<article class="st-card st-quiz"><p class="st-tag">${esc(m.area)} · ${esc(m.id)}</p><h2>${esc(m.titulo)}</h2><p>${esc(m.objetivo)}</p>
      <h3>Objetivos evaluables</h3><ul>${m.objetivos_evaluables.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Contenidos</h3><ul>${m.contenidos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Actividad</h3><p>${esc(m.actividad)}</p>
      <h3>Comprueba lo aprendido</h3>
      <form id="st-quizform">${m.preguntas.map((q, j) => `<div class="st-pregunta"><strong>${j + 1}. ${esc(q.pregunta)}</strong>${q.opciones.map((o, k) => `<label class="st-opcion"><input type="radio" name="q${j}" value="${k}"> ${esc(o)}</label>`).join('')}<p id="st-fb${j}" class="tenue"></p></div>`).join('')}
        <button type="submit" class="btn primario">Evaluar respuestas</button><p id="st-score" aria-live="polite"></p></form></article>`;
    det.scrollIntoView({ behavior: 'smooth' });
    root.querySelector('#st-quizform').addEventListener('submit', (e) => {
      e.preventDefault();
      let puntos = 0;
      m.preguntas.forEach((q, j) => {
        const sel = root.querySelector(`input[name="q${j}"]:checked`);
        const ok = !!sel && Number(sel.value) === q.respuesta;
        if (ok) puntos++;
        const fb = root.querySelector(`#st-fb${j}`);
        fb.textContent = (ok ? '✓ Correcto. ' : '✗ Revisa. ') + q.explicacion;
        fb.className = ok ? 'st-ok' : 'tenue';
      });
      root.querySelector('#st-score').textContent = `Resultado: ${puntos} de ${m.preguntas.length} (${Math.round((puntos / m.preguntas.length) * 100)}%).`;
      const quizDetalle = {
        proyecto_id: app.proyecto_id,
        moduloId: m.id,
        area: m.area,
        titulo: m.titulo,
        puntos,
        total: m.preguntas.length,
        porcentaje: Math.round((puntos / m.preguntas.length) * 100),
        exito: puntos === m.preguntas.length,
        valido: true
      };
      if (m.id === 'M' || m.area === 'M' || String(m.titulo).toLowerCase().includes('matemática')) {
        app.bus?.emit?.('matematicas_intento', quizDetalle);
      } else if (m.id === 'S' || m.area === 'S' || String(m.titulo).toLowerCase().includes('ciencia')) {
        app.bus?.emit?.('ciencia_intento', quizDetalle);
      }
    });
  }

  return {
    async mount() {
      app.mostrarEscena(false);
      app.panel.innerHTML = `<div class="st-pagina"><p class="st-intro">Módulos para comprender y desarrollar el simulador. Cuando quieras practicar, abre la <a href="#/ruta">Ruta STEAM de 5 fases →</a></p><div id="st-modulos" class="st-grid">Cargando módulos…</div><section id="st-detalle"></section></div>`;
      root = app.panel;
      try {
        const r = await fetch('data/lessons.json');
        if (!r.ok) throw new Error('No se pudo cargar data/lessons.json');
        modulos = (await r.json()).modulos;
        root.querySelector('#st-modulos').innerHTML = modulos.map((m, i) => `<article class="st-card"><div class="st-tag">${esc(m.area)}</div><h2>${esc(m.titulo)}</h2><p>${esc(m.descripcion)}</p><p class="tenue">${m.preguntas.length} preguntas · ${m.objetivos_evaluables.length} objetivos evaluables</p><button type="button" class="btn primario" data-index="${i}">Estudiar módulo</button></article>`).join('');
        root.querySelectorAll('[data-index]').forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.index))));
      } catch (e) { root.querySelector('#st-modulos').textContent = e.message; }
    },
    unmount() { root = null; }
  };
}
