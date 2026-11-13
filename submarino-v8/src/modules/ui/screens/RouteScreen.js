// Ruta STEAM: cinco fases (Matemáticas, Ciencias, Ingeniería, Tecnología, Artes) con avance guardado (antes ruta-steam.html).
import { esc, num } from './steam.js';

const FASES = [['M', 'Matemáticas', 'Compuerta de cálculo'], ['S', 'Ciencias', 'Laboratorio de Arquímedes'], ['E', 'Ingeniería', 'Ensamblaje'], ['T', 'Tecnología', 'Programación por bloques'], ['A', 'Artes', 'Biomimética y entrega']];

export function RouteScreen(app) {
  let root = null;
  const proyecto_id = app.proyecto_id || app.datos?.manifest?.proyecto_id || 'submarino-exploracion-3d';
  let p = { proyecto_id, desbloqueada: 'M', completadas: [], datos: {}, eventos: { objetos_colocados: 0 } };
  const $ = (s) => root.querySelector(s);

  async function pedir(method = 'GET') {
    const qs = app.alumnoId ? `?alumno=${encodeURIComponent(app.alumnoId)}&proyecto_id=${encodeURIComponent(proyecto_id)}` : `?proyecto_id=${encodeURIComponent(proyecto_id)}`;
    const r = await fetch(`/api/avance-rutas${qs}`, { method, headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body: method === 'POST' ? JSON.stringify({ ...p, proyecto_id, soloLectura: !!app.soloLectura }) : undefined });
    if (!r.ok) throw new Error('API no disponible');
    return r.status === 204 ? null : r.json();
  }
  async function guardar() {
    if (app.soloLectura) {
      app.aviso?.('Modo solo lectura del profesor: el avance del alumno no puede modificarse.', 'error');
      return;
    }
    p.proyecto_id = proyecto_id;
    try { localStorage.setItem('avance_rutas', JSON.stringify(p)); } catch { /* sin almacenamiento */ }
    try { await pedir('POST'); } catch { /* sin servidor: queda el respaldo local */ }
    pintar();
  }
  async function cargar() {
    try { p = { ...p, ...(await pedir() || {}), proyecto_id }; }
    catch { try { p = { ...p, ...JSON.parse(localStorage.getItem('avance_rutas') || '{}'), proyecto_id }; } catch { /* nada guardado */ } }
    p.datos = p.datos || {}; p.eventos = p.eventos || { objetos_colocados: 0 };
    if (root) pintar();
  }
  function completar(id, datos = {}) {
    if (app.soloLectura) {
      app.aviso?.('Modo solo lectura del profesor: el avance del alumno no puede modificarse.', 'error');
      return;
    }
    if (!p.completadas.includes(id)) p.completadas.push(id);
    p.datos[id] = { proyecto_id, ...datos, completadaEn: new Date().toISOString() };
    p.desbloqueada = FASES[Math.min(4, FASES.findIndex((x) => x[0] === id) + 1)][0];
    guardar();
  }

  function pintar() {
    const n = p.desbloqueada || 'M';
    $('#st-estado').innerHTML = `Completadas: <b>${p.completadas.length}/5</b> · Objetos colocados: <b>${p.eventos.objetos_colocados || 0}</b><div class="st-bar"><span style="width:${p.completadas.length * 20}%"></span></div>`;
    $('#st-fases').innerHTML = FASES.map(([id, nombre, sub], i) => {
      const abierta = i <= FASES.findIndex((x) => x[0] === n) || p.completadas.includes(id), hecha = p.completadas.includes(id);
      return `<article class="st-fase ${abierta ? '' : 'st-bloqueada'}"><small>${hecha ? '✓ COMPLETADA' : abierta ? 'DESBLOQUEADA' : '🔒 BLOQUEADA'}</small><h2>Fase ${id} · ${nombre}</h2><b>${sub}</b><p><button type="button" class="btn primario" data-id="${id}" ${abierta ? '' : 'disabled'}>${hecha ? 'Revisar' : 'Abrir fase'}</button></p></article>`;
    }).join('');
    root.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.id)));
  }

  function mostrar(id) {
    if (app.telemetry?.setDimensionSTEAM) app.telemetry.setDimensionSTEAM(id);
    const e = $('#st-detalle');
    if (id === 'M') {
      e.innerHTML = `<h2>M · Compuerta de cálculo</h2><p>Calcula la presión hidrostática P = ρ·g·h y elige lastre antes de ensamblar.</p><div class="grid3"><label>ρ densidad (kg/m³)<input id="rho" type="number" value="1025" min="1"></label><label>g gravedad (m/s²)<input id="g" type="number" value="9.81" min="1" step=".01"></label><label>h profundidad (m)<input id="h" type="number" value="30" min="0"></label><label>Lastre<select id="ballast"><option>Vacío</option><option selected>Neutro</option><option>Lleno</option></select></label></div><div class="acciones"><button type="button" class="btn secundario" id="calc">Calcular</button></div><p id="out" class="tenue"></p><button type="button" class="btn primario" id="finish" disabled>Validar y desbloquear S</button>`;
      $('#calc').onclick = () => {
        const rho = +$('#rho').value, g = +$('#g').value, h = +$('#h').value, ok = rho > 0 && g > 0 && h >= 0;
        const presionPa = ok ? rho * g * h : null;
        $('#out').textContent = ok ? `P = ${num(presionPa)} Pa (${num(presionPa / 101325)} atm manométricas).` : 'Valores inválidos';
        $('#finish').disabled = !ok;
        $('#finish').dataset.p = presionPa;
        app.bus?.emit?.('matematicas_intento', {
          proyecto_id,
          fase: 'M',
          rho,
          g,
          h,
          presionPa,
          lastre: $('#ballast').value,
          valido: ok,
          exito: ok
        });
      };
      $('#finish').onclick = () => {
        const rho = +$('#rho').value, g = +$('#g').value, h = +$('#h').value, presionPa = +$('#finish').dataset.p, lastre = $('#ballast').value;
        app.bus?.emit?.('matematicas_intento', {
          proyecto_id,
          fase: 'M',
          rho,
          g,
          h,
          presionPa,
          lastre,
          valido: true,
          exito: true,
          completado: true
        });
        completar('M', { rho, g, h, presionPa, lastre });
      };
    }
    if (id === 'S') {
      e.innerHTML = `<h2>S · Laboratorio de flotabilidad / Arquímedes</h2><p>Ajusta las variables. Se valida flotabilidad neutra con una diferencia máxima del 5 % entre empuje y peso.</p><div class="grid3"><label>ρ fluido (kg/m³)<input id="rho" type="number" value="1025"></label><label>Volumen desplazado (m³)<input id="v" type="number" value="2.4" step=".01"></label><label>Masa total (kg)<input id="m" type="number" value="2200"></label><label>g (m/s²)<input id="g" type="number" value="9.81" step=".01"></label></div><div class="acciones"><button type="button" class="btn secundario" id="cal">Calibrar</button></div><p id="out"></p><button type="button" class="btn primario" id="finish" disabled>Validar y desbloquear E</button>`;
      $('#cal').onclick = () => {
        const r = +$('#rho').value, v = +$('#v').value, m = +$('#m').value, g = +$('#g').value, B = r * g * v, W = m * g, ok = r > 0 && v > 0 && m > 0 && g > 0;
        const delta = B - W;
        const neutro = ok && Math.abs(delta) / Math.max(B, W) <= 0.05;
        $('#out').textContent = `Empuje ${num(B)} N · Peso ${num(W)} N · Diferencia ${num(delta)} N · Masa neutra ${num(r * v)} kg`;
        $('#finish').disabled = !ok || !neutro;
        $('#finish').dataset.delta = delta;
        app.bus?.emit?.('ciencia_intento', {
          proyecto_id,
          fase: 'S',
          rho: r,
          volumenM3: v,
          masaKg: m,
          g,
          empujeN: B,
          pesoN: W,
          diferenciaN: delta,
          valido: ok,
          exito: neutro
        });
      };
      $('#finish').onclick = () => {
        app.bus?.emit?.('ciencia_intento', {
          proyecto_id,
          fase: 'S',
          rho: +$('#rho').value,
          volumenM3: +$('#v').value,
          masaKg: +$('#m').value,
          diferenciaN: +$('#finish').dataset.delta,
          valido: true,
          exito: true,
          completado: true
        });
        completar('S', { rho: +$('#rho').value, volumenM3: +$('#v').value, masaKg: +$('#m').value, diferenciaN: +$('#finish').dataset.delta });
      };
    }
    if (id === 'E') {
      e.innerHTML = `<h2>E · Ensamblaje existente</h2><p>Abre el constructor 3D y coloca al menos cinco componentes. Cada colocación correcta emite <code>objeto_colocado</code>.</p><p>Eventos registrados: <b>${p.eventos.objetos_colocados || 0}/5</b></p><div class="acciones"><a class="btn primario" href="#/ensamblaje">Abrir constructor 3D</a><button type="button" class="btn secundario" id="refresh">Actualizar</button><button type="button" class="btn primario" id="finish" ${(p.eventos.objetos_colocados || 0) >= 5 ? '' : 'disabled'}>Validar y desbloquear T</button></div>`;
      $('#refresh').onclick = async () => { await cargar(); mostrar('E'); };
      $('#finish').onclick = () => completar('E', { objetosColocados: p.eventos.objetos_colocados });
    }
    if (id === 'T') {
      const mover = '<button type="button" class="btn secundario" data-move="up" aria-label="Subir bloque">↑</button> <button type="button" class="btn secundario" data-move="down" aria-label="Bajar bloque">↓</button>';
      e.innerHTML = `<h2>T · Programación por bloques</h2><p>Programa un controlador de profundidad sin escribir código: leer → comparar → ajustar lastre.</p><p>Ordena los bloques con las flechas. El programa correcto es: leer → comparar → ajustar.</p><ol id="blocks" class="st-bloques"><li data-block="read"><span>Leer profundidad actual</span>${mover}</li><li data-block="compare"><span>Comparar con profundidad objetivo</span>${mover}</li><li data-block="ballast"><span>Ajustar lastre automáticamente</span>${mover}</li></ol><div class="grid3"><label>Objetivo (m)<input id="target" type="number" value="20"></label><label>Profundidad actual (m)<input id="current" type="number" value="5"></label></div><div class="acciones"><button type="button" class="btn secundario" id="run">Ejecutar programa</button></div><pre id="out" class="st-pre">Esperando ejecución…</pre><button type="button" class="btn primario" id="finish" disabled>Validar y desbloquear A</button>`;
      root.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
        const li = b.closest('li'), prev = li.previousElementSibling, next = li.nextElementSibling;
        if (b.dataset.move === 'up' && prev) li.parentNode.insertBefore(li, prev);
        if (b.dataset.move === 'down' && next) li.parentNode.insertBefore(next, li);
      }));
      $('#run').onclick = () => {
        const orden = [...root.querySelectorAll('#blocks li')].map((x) => x.dataset.block), ordenado = orden.join(',') === 'read,compare,ballast';
        const t = +$('#target').value, c = +$('#current').value, d = t - c;
        const exito = ordenado && Number.isFinite(t + c) && t >= 0 && c >= 0;
        app.bus?.emit?.('programa_ejecutado', {
          proyecto_id,
          fase: 'T',
          orden,
          bloques: orden,
          ordenado,
          objetivoM: t,
          profundidadInicialM: c,
          errorM: d,
          exito,
          valido: Number.isFinite(t + c) && t >= 0 && c >= 0
        });
        if (!ordenado) { $('#out').textContent = 'Error de secuencia: ordena Leer → Comparar → Ajustar lastre.'; $('#finish').disabled = true; return; }
        $('#out').textContent = `1. Leer profundidad: ${num(c)} m\n2. Comparar con objetivo: ${num(t)} m (error ${num(d)} m)\n3. Control: ${Math.abs(d) < 0.5 ? 'mantener profundidad' : d > 0 ? 'aumentar lastre para descender' : 'vaciar lastre para ascender'}`;
        $('#finish').disabled = !Number.isFinite(t + c) || t < 0 || c < 0;
      };
      $('#finish').onclick = () => {
        const orden = [...root.querySelectorAll('#blocks li')].map((x) => x.dataset.block);
        app.bus?.emit?.('programa_ejecutado', {
          proyecto_id,
          fase: 'T',
          orden,
          bloques: ['leer_profundidad', 'comparar_objetivo', 'ajustar_lastre'],
          objetivoM: +$('#target').value,
          profundidadInicialM: +$('#current').value,
          exito: true,
          valido: true,
          completado: true
        });
        completar('T', { objetivoM: +$('#target').value, profundidadInicialM: +$('#current').value, bloques: ['leer_profundidad', 'comparar_objetivo', 'ajustar_lastre'] });
      };
    }
    if (id === 'A') {
      e.innerHTML = `<h2>A · Biomimética, iluminación y entrega</h2><p>Relaciona el diseño con estrategias naturales y presenta una reflexión final.</p><label>Inspiración biomimética<select id="bio"><option value="delfin">Delfín · eficiencia hidrodinámica</option><option value="tiburon">Tiburón · dentículos y reducción de arrastre</option><option value="nautilus">Nautilus · cámaras de flotabilidad</option><option value="pulpo">Pulpo · maniobrabilidad y sensores</option></select></label><label>Iluminación submarina<select id="light"><option>Haz focal de exploración</option><option>Iluminación difusa de bajo impacto</option><option>Paleta inspirada en bioluminiscencia</option></select></label><label>Entrega / reflexión (mínimo 20 caracteres)<input id="delivery" class="st-texto" maxlength="500" placeholder="Explica cómo integraste STEAM"></label><button type="button" class="btn primario" id="finish">Entregar proyecto</button><p id="out"></p>`;
      $('#finish').onclick = () => {
        const d = $('#delivery').value.trim();
        if (d.length < 20) { $('#out').textContent = 'La reflexión debe tener al menos 20 caracteres.'; return; }
        app.bus?.emit?.('biomimetica_completada', { proyecto_id, fase: 'A', biomimetica: $('#bio').value, iluminacion: $('#light').value, caracteres: d.length, exito: true, completado: true });
        completar('A', { biomimetica: $('#bio').value, iluminacion: $('#light').value, entrega: d });
        $('#out').textContent = '¡Ruta STEAM completada!';
      };
    }
    e.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return {
    async mount() {
      app.mostrarEscena(false);
      app.panel.innerHTML = `<div class="st-pagina"><p class="st-intro">Completa las cinco fases en orden. Cada fase desbloquea la siguiente y conserva tu avance. Más teoría en la <a href="#/biblioteca">Biblioteca STEAM</a>.</p><div id="st-estado" class="tenue">Cargando avance…</div><div id="st-fases" class="st-phases"></div><section id="st-detalle" class="st-card st-panel">Selecciona una fase desbloqueada.</section></div>`;
      root = app.panel;
      await cargar();
    },
    unmount() { root = null; }
  };
}
