// Catálogo de proyectos (E2): pinta una tarjeta por cada proyecto activo de la tabla `proyectos`.
// Los datos llegan de GET /api/proyectos y las fases de GET /api/proyectos/:slug (tabla rutas_aprendizaje).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tarjetaProyecto(p, rutas = []) {
  const steam = Object.keys(p.mapeo_steam || {});
  return `<article class="tarjeta ${p.activo ? 'activa' : ''}" data-proyecto="${esc(p.id)}">
    ${p.portada ? `<img src="${esc(p.portada)}" alt="Portada: ${esc(p.nombre)}" loading="lazy">` : ''}
    <div class="cuerpo">
      <span class="estado">${p.activo ? 'ACTIVO' : 'INACTIVO'} · v${esc(p.version)}</span>
      <h2>${esc(p.nombre)}</h2>
      <p class="tenue">${esc(p.descripcion)}</p>
      <div class="chips">${steam.map((k) => `<span title="${esc(p.mapeo_steam[k])}">${esc(k)}</span>`).join('')}</div>
      ${rutas.length ? `<ol class="fases">${rutas.map((r) => `<li>${esc(r.titulo)}</li>`).join('')}</ol>` : ''}
      <p class="tenue">${(p.objetivos || []).length} objetivos evaluables · ${esc(p.modulos ?? '—')} módulos</p>
      <a class="btn" href="${esc(p.url)}">Abrir proyecto</a>
    </div>
  </article>`;
}

async function iniciar() {
  const cont = document.getElementById('catalogo');
  try {
    const r = await fetch('/api/proyectos');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { proyectos } = await r.json();
    if (!proyectos.length) { cont.innerHTML = '<p class="aviso">No hay proyectos activos. Ejecuta <code>npm run migrar</code>.</p>'; return; }
    const detalles = await Promise.all(proyectos.map((p) => fetch(`/api/proyectos/${encodeURIComponent(p.slug)}`).then((x) => (x.ok ? x.json() : p)).catch(() => p)));
    cont.innerHTML = detalles.map((p) => tarjetaProyecto(p, p.rutas)).join('');
    cont.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.remove()));
  } catch (e) {
    cont.innerHTML = `<p class="aviso">No se pudo leer el catálogo (${esc(e.message)}). Inicia el servidor con <code>node server.js</code>.</p>`;
  }
}

if (typeof document !== 'undefined') iniciar();
