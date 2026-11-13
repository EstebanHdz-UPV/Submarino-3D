// Pantalla de inicio: panel de misión del diseño NAUTILUS (Figma), integrada en el simulador.
// El marcado es estático (sin datos del usuario), por eso se inserta con innerHTML.
const PLANTILLA = `<div class="nx-home"><header class="nx-top"><div><span class="nx-eyebrow">CENTRO DE EXPLORACIÓN</span><h1>Panel de misión</h1><p>Diseña, construye y explora las profundidades.</p></div><a class="nx-pill" href="#/ruta">✦ Continuar ruta STEAM</a></header>
<section class="nx-hero"><div class="nx-hero-copy"><span class="nx-tag"><i></i> SIMULACIÓN NAVAL EDUCATIVA</span><h2>Diseña. Construye.<br><em>Sumérgete.</em></h2><p>Experimenta con ingeniería naval en un entorno seguro. Ensambla tu submarino, ponlo a prueba y descubre hasta dónde puede llegar.</p><div class="nx-actions"><a class="nx-btn nx-primary" href="#/ensamblaje">Abrir simulador 3D <b>→</b></a><a class="nx-btn nx-secondary" href="#/biblioteca">Explorar aprendizaje</a></div><div class="nx-quick"><button type="button" class="nx-link" data-accion="ejemplo">Cargar submarino de ejemplo</button><a class="nx-link" href="#/libros">Ver los libros de piezas y materiales</a></div><div class="nx-trust"><span>✓ Física en tiempo real</span><span>✓ Experiencia sin conexión</span></div></div>
<div class="nx-visual"><div class="nx-depth nx-d1">50 m</div><div class="nx-depth nx-d2">100 m</div><div class="nx-ring nx-r1"></div><div class="nx-ring nx-r2"></div><svg viewBox="0 0 740 310" role="img" aria-label="Ilustración de un submarino de exploración"><defs><linearGradient id="h" x2=".8" y2="1"><stop stop-color="#49a5bf"/><stop offset="1" stop-color="#123649"/></linearGradient><linearGradient id="g"><stop stop-color="#b9efff"/><stop offset="1" stop-color="#0d648c"/></linearGradient></defs><g opacity=".22" stroke="#8ad9e9" stroke-dasharray="4 10"><path d="M40 70H700M40 250H700M90 30V280M650 30V280"/></g><ellipse cx="370" cy="190" rx="290" ry="82" fill="#051522" opacity=".35"/><path d="M75 166Q95 91 215 91H535Q646 91 675 165Q646 239 535 239H215Q95 239 75 166Z" fill="url(#h)" stroke="#75c5d9" stroke-width="4"/><path d="M310 94V57h112v37M335 57V37h64v20" fill="#1d536d" stroke="#76c7db" stroke-width="4"/><path d="M350 38h34" stroke="#b8efff" stroke-width="5"/><path d="M675 166l42-39v78Z" fill="#1d536d" stroke="#76c7db" stroke-width="3"/><path d="M125 165h510" stroke="#9bd8e7" opacity=".45" stroke-width="3"/><circle cx="260" cy="163" r="31" fill="url(#g)" stroke="#c4f4ff" stroke-width="5"/><circle cx="350" cy="163" r="31" fill="url(#g)" stroke="#c4f4ff" stroke-width="5"/><circle cx="440" cy="163" r="31" fill="url(#g)" stroke="#c4f4ff" stroke-width="5"/><path d="M205 229v23h85v-23M500 229v23h85v-23" fill="#17455c" stroke="#65b5cd" stroke-width="3"/><path d="M110 166H65m610 0h35" stroke="#8ee0ef" stroke-width="4"/><g fill="#9de8f4" opacity=".8"><circle cx="148" cy="65" r="4"/><circle cx="580" cy="55" r="3"/><circle cx="620" cy="260" r="5"/><circle cx="170" cy="270" r="3"/></g></svg><div class="nx-float-card"><small>ESTADO DEL SISTEMA</small><b><i></i> Todos los sistemas operativos</b></div></div></section>
<section class="nx-overview"><div class="nx-section-title"><div><span class="nx-eyebrow">TU MISIÓN</span><h2>De la idea a las profundidades</h2><p>Avanza por las etapas de diseño y aprendizaje.</p></div><span class="nx-counter" id="nx-progress">0 / 5 fases</span></div><div class="nx-cards"><a class="nx-card" href="#/ruta"><span class="nx-number">01</span><span class="nx-ico nx-cyan">∑</span><h3>Ruta STEAM</h3><p>Desbloquea las cinco fases: Matemáticas, Ciencias, Ingeniería, Tecnología y Artes.</p><b>Continuar ruta <span>→</span></b></a><a class="nx-card" href="#/ensamblaje"><span class="nx-number">02</span><span class="nx-ico nx-blue">⚒</span><h3>Construye tu submarino</h3><p>Configura el casco, los sistemas y el equipamiento de tu vehículo.</p><b>Abrir constructor <span>→</span></b></a><a class="nx-card" href="#/biblioteca"><span class="nx-number">03</span><span class="nx-ico nx-green">▤</span><h3>Biblioteca de aprendizaje</h3><p>Consulta los módulos, objetivos y evaluaciones del proyecto.</p><b>Explorar módulos <span>→</span></b></a></div></section>
<footer>NAUTILUS · SIMULADOR DE SUBMARINOS 3D <span>Diseño UX/UI integrado · Ejecución local</span></footer></div>`;

export function HomeScreen(app) {
  // Avance de la Ruta STEAM: servidor local si responde; si no, el último avance guardado en el navegador.
  async function leerAvance() {
    try { const r = await fetch('/api/avance-rutas'); if (r.ok) return await r.json(); } catch { /* sin servidor */ }
    try { return JSON.parse(localStorage.getItem('avance_rutas') ?? 'null'); } catch { return null; }
  }
  return {
    async mount() {
      app.mostrarEscena(false);
      app.panel.innerHTML = PLANTILLA;
      app.panel.scrollTop = 0;
      app.panel.querySelector('[data-accion="ejemplo"]')?.addEventListener('click', async () => { await app.cargarEjemplo(); app.go('ensamblaje'); });
      const av = await leerAvance();
      const contador = app.panel.querySelector('#nx-progress');
      if (contador) contador.textContent = av ? `${(av.completadas ?? []).length} / 5 fases completadas` : '0 / 5 fases';
    },
    unmount() {}
  };
}
