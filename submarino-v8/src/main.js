// Punto de entrada: carga datos JSON, crea la escena 3D, el ensamble y las pantallas.
import { SLog } from './core/SLog.js';
import { loadAll } from './core/Config.js';
import { Telemetry } from './core/Telemetry.js';
import { Evaluacion, generarPuntajes, pesosDesdeRubrica } from './core/evaluacion.js';
import { Loop } from './core/Loop.js';
import { EventBus } from './core/EventBus.js';
import { iniciarAutoguardado, cargar, guardar, enviarBeaconSnapshot, obtenerAlumnoId, esModoSoloLectura } from './core/guardado.js';
import { SceneModule } from './modules/scene/SceneModule.js';
import { ModelLoader } from './modules/scene/ModelLoader.js';
import { CameraModule } from './modules/scene/CameraModule.js';
import { AssemblyView, aBabylon } from './modules/scene/AssemblyView.js';
import { OceanModule } from './modules/environment/OceanModule.js';
import { Seabed } from './modules/environment/Seabed.js';
import { Particles } from './modules/environment/Particles.js';
import { DamageFx } from './modules/environment/DamageFx.js';
import { Visuals } from './modules/environment/Visuals.js';
import { Plants } from './modules/environment/Plants.js';
import { Fauna } from './modules/environment/Fauna.js';
import { Implosion } from './modules/environment/Implosion.js';
import { PartsCatalog } from './modules/submarine/PartsCatalog.js';
import { Assembly } from './modules/submarine/Assembly.js';
import { PhysicsModule } from './modules/physics/PhysicsModule.js';
import { entornoDe, caladoEquilibrio } from './modules/trials/TrialRunner.js';
import { resolverContacto } from './modules/physics/ContactoFondo.js';
import { ControlsModule } from './modules/controls/ControlsModule.js';
import { Hud } from './modules/ui/Hud.js';
import { Router } from './modules/ui/Router.js';
import { h, limpiar } from './modules/ui/dom.js';
import { precargar } from './modules/ui/Icons.js';
import { iconoNav } from './modules/ui/NavIcons.js';
import { HomeScreen } from './modules/ui/screens/HomeScreen.js';
import { AssemblyScreen } from './modules/ui/screens/AssemblyScreen.js';
import { TrialsScreen } from './modules/ui/screens/TrialsScreen.js';
import { StressScreen } from './modules/ui/screens/StressScreen.js';
import { ResultsScreen } from './modules/ui/screens/ResultsScreen.js';
import { BooksScreen } from './modules/ui/screens/BooksScreen.js';
import { LibraryScreen } from './modules/ui/screens/LibraryScreen.js';
import { RouteScreen } from './modules/ui/screens/RouteScreen.js';
import { ProjectScreen } from './modules/ui/screens/ProjectScreen.js';
import { SettingsScreen, CLIMAS } from './modules/ui/screens/SettingsScreen.js';
import { TECLAS } from './modules/controls/ControlsModule.js';

const AJUSTES_BASE = { tipoAgua: 'mar', gravedad: 9.81, clima: 'tranquilo', mostrarMalla: false, mostrarDatos: true, modoSimplificado: false };
// Menú lateral (NAUTILUS): [grupo, [[ruta, texto por defecto], ...]]. Los textos se pueden cambiar en data/i18n/es.json (nav.<ruta>).
const NAV = [
  ['NAVEGACIÓN', [['inicio', 'Inicio']]],
  ['SIMULADOR', [['ensamblaje', 'Ensamblaje 3D'], ['pruebas', 'Pruebas y simulación'], ['resultados', 'Resultados'], ['libros', 'Libros']]],
  ['APRENDIZAJE', [['biblioteca', 'Biblioteca STEAM'], ['ruta', 'Ruta STEAM'], ['proyecto', 'Proyecto STEAM']]],
  ['SISTEMA', [['configuracion', 'Configuración']]]
];
// Encabezado de cada pantalla: [texto superior, título]
const TITULOS = {
  inicio: ['CENTRO DE EXPLORACIÓN', 'Panel de misión'], ensamblaje: ['SIMULADOR', 'Ensamblaje 3D'], pruebas: ['SIMULADOR', 'Pruebas y simulación'], estres: ['SIMULADOR', 'Estrés estructural'],
  resultados: ['SIMULADOR', 'Resultados'], libros: ['REFERENCIA', 'Libros de piezas y materiales'], configuracion: ['SISTEMA', 'Configuración'],
  biblioteca: ['APRENDIZAJE', 'Biblioteca STEAM'], ruta: ['APRENDIZAJE', 'Ruta STEAM'], proyecto: ['APRENDIZAJE', 'Proyecto STEAM']
};
const PASO = { ensamblaje: 1, pruebas: 2, estres: 2, resultados: 3 };

async function boot() {
  const cargando = document.getElementById('cargando');
  const datos = await loadAll();
  const major = parseInt(String(BABYLON.Engine.Version), 10);
  if (!(major >= datos.manifest.engine.minMajor)) throw new Error(`Se requiere Babylon.js ${datos.manifest.engine.minVersion} o superior (encontrada ${BABYLON.Engine.Version})`);
  SLog.info('Main', `Proyecto ${datos.manifest.name} v${datos.manifest.version}`);

  const bus = new EventBus();
  const t = (k, d) => datos.i18n[k] ?? d ?? k;
  let settings = { ...AJUSTES_BASE };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('submarino.ajustes') ?? '{}')); } catch { /* sin almacenamiento */ }

  const canvas = document.getElementById('render'), hudCanvas = document.getElementById('hud');
  const sm = new SceneModule(canvas);
  const loader = new ModelLoader(sm.scene);
  const view = new AssemblyView(sm, loader);
  const cam = new CameraModule(sm);
  const ocean = new OceanModule(sm);
  const seabed = await new Seabed(sm, loader, 250).build();
  const particles = new Particles(sm); particles.seguir(view.root);
  const visuals = new Visuals(sm);
  const plants = new Plants(sm, seabed);
  const fauna = new Fauna(sm, seabed);
  for (const m of [ocean.cielo.domo, ocean.cielo.sol]) visuals.glow?.addExcludedMesh(m); // el cielo no debe 'brillar' sobre toda la imagen
  visuals.onNivel = () => fauna.setEnabled(false); // equipo lento: sin fauna para recuperar fluidez
  const implosion = new Implosion(view, sm);
  // Casco transparente (botón arriba a la derecha o tecla X) para ver el interior durante el pilotaje.
  const btnCasco = document.createElement('button');
  btnCasco.id = 'btn-casco'; btnCasco.type = 'button'; btnCasco.hidden = true;
  const escenaVisible = () => document.getElementById('main')?.classList.contains('con-escena');
  document.getElementById('stage')?.append(btnCasco);
  const pintarBtnCasco = () => { const t = view.hullAlpha < 0.95; btnCasco.textContent = t ? 'Casco: transparente' : 'Casco: opaco'; btnCasco.setAttribute('aria-pressed', String(t)); btnCasco.title = 'Alterna casco transparente (X)'; };
  const alternarCasco = () => { view.setCascoAlpha(view.hullAlpha < 0.95 ? 1 : 0.22); pintarBtnCasco(); };
  btnCasco.addEventListener('click', () => { alternarCasco(); btnCasco.blur(); });
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyX' || e.repeat || !escenaVisible() || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName ?? '')) return;
    alternarCasco();
  });
  // El botón vive mientras haya escena (montaje o pilotaje); su texto sigue el estado real del casco.
  setInterval(() => { const v = !!escenaVisible(); if (btnCasco.hidden === v) btnCasco.hidden = !v; if (v) pintarBtnCasco(); }, 250);
  let manualPrevio = false, dentroPrevio = false;

  // Primera persona en la cabina: arrastrar el ratón para mirar y F para caminar por dentro del casco.
  const btnCaminar = document.createElement('button');
  btnCaminar.id = 'btn-caminar'; btnCaminar.type = 'button'; btnCaminar.hidden = true;
  const pintarCaminar = () => { const c = view.caminando; btnCaminar.textContent = c ? 'Caminando: WASD · flechas (F)' : 'Caminar por dentro (F)'; btnCaminar.setAttribute('aria-pressed', String(c)); btnCaminar.title = 'Caminar por la cabina / volver a pilotar (F)'; };
  const alternarCaminar = () => { if (!app.manual || !view.dentro) return; view.setCaminar(!view.caminando); controls.caminando = view.caminando; pintarCaminar(); };
  btnCaminar.addEventListener('click', () => { alternarCaminar(); btnCaminar.blur(); });
  document.getElementById('stage')?.append(btnCaminar);
  addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !e.repeat && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName ?? '')) alternarCaminar(); });
  { // mirar alrededor arrastrando (ratón o dedo) sobre la escena
    const stage = document.getElementById('stage'); let ult = null;
    stage?.addEventListener('pointerdown', (e) => { if (!view.dentro || e.target.closest('button, #mando-cabina, #btn-casco, #btn-caminar')) return; ult = { x: e.clientX, y: e.clientY }; try { stage.setPointerCapture(e.pointerId); } catch { /* sin captura */ } });
    stage?.addEventListener('pointermove', (e) => { if (!ult || !view.dentro) return; view.girar((e.clientX - ult.x) * 0.0045, -(e.clientY - ult.y) * 0.0045); ult = { x: e.clientX, y: e.clientY }; });
    const fin = () => { ult = null; };
    stage?.addEventListener('pointerup', fin); stage?.addEventListener('pointercancel', fin);
  }

  // Mando de cabina: solo en primera persona (cámara de proa) y con el timón/controles instalados.
  const mando = document.createElement('div');
  mando.id = 'mando-cabina'; mando.hidden = true; mando.setAttribute('role', 'group'); mando.setAttribute('aria-label', 'Mando de cabina');
  const mantener = (txt, code, titulo) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.title = titulo;
    const dn = (e) => { e.preventDefault(); controls.presionar(code); b.classList.add('activo'); try { b.setPointerCapture(e.pointerId); } catch { /* sin captura */ } };
    const up = () => { controls.soltar(code); b.classList.remove('activo'); };
    b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    return b;
  };
  const fila = (...bs) => { const f = document.createElement('div'); f.className = 'fila'; f.append(...bs); return f; };
  const btnLuces = document.createElement('button'); btnLuces.type = 'button'; btnLuces.id = 'btn-luces';
  let lucesOn = true;
  const pintarLuces = () => { btnLuces.textContent = lucesOn ? 'Luces: encendidas (L)' : 'Luces: apagadas (L)'; btnLuces.setAttribute('aria-pressed', String(lucesOn)); };
  const alternarLuces = () => { lucesOn = !lucesOn; view.setLuces(lucesOn); pintarLuces(); };
  btnLuces.addEventListener('click', () => { alternarLuces(); btnLuces.blur(); });
  const titulo = document.createElement('strong'); titulo.textContent = 'Mando de cabina';
  mando.append(titulo, fila(mantener('▲ Acelerar', 'KeyW', 'Aumenta el empuje (W)'), mantener('▼ Frenar', 'KeyS', 'Reduce el empuje (S)')),
    fila(mantener('◀ Timón', 'KeyA', 'Timón a la izquierda (A)'), mantener('Timón ▶', 'KeyD', 'Timón a la derecha (D)')),
    fila(mantener('Subir', 'KeyQ', 'Vaciar lastre (Q)'), mantener('Bajar', 'KeyE', 'Llenar lastre (E)')), btnLuces);
  pintarLuces();
  document.getElementById('stage')?.append(mando);
  const tieneTimon = () => !!assembly.get('controles');
  addEventListener('keydown', (e) => { if (e.code === 'KeyL' && !e.repeat && !mando.hidden && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName ?? '')) alternarLuces(); });
  const sincronizarCabina = (depthM) => {
    const manual = !!app.manual;
    if (manual && !manualPrevio) view.setCascoAlpha(1); // el pilotaje arranca con casco sólido
    manualPrevio = manual;
    const dentro = manual && cam.modo === 'proa';
    view.setDentro(dentro);
    if (dentro !== dentroPrevio) { dentroPrevio = dentro; if (dentro) app.aviso('Primera persona: arrastra el ratón para mirar · F para caminar por dentro'); }
    if (!dentro) controls.caminando = false;
    const verCaminar = dentro; if (btnCaminar.hidden === verCaminar) { btnCaminar.hidden = !verCaminar; } if (verCaminar) pintarCaminar();
    const mandoVisible = dentro && tieneTimon();
    if (mando.hidden === mandoVisible) { mando.hidden = !mandoVisible; if (!mandoVisible) { for (const c of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE']) controls.soltar(c); } }
    view.interior?.actualizarMar(Math.exp(-Math.max(0, depthM) / 35));
  };
  // Sobre el agua el fondo (a 250 m) no debe verse como una 'isla' pálida a través de la superficie.
  const actualizarAgua = (profM) => { ocean.update(profM); seabed.setEnabled(profM > 3); };
  const fx = new DamageFx(sm);
  const hud = new Hud(hudCanvas);
  const controls = new ControlsModule(bus);
  const proyecto_id = datos.manifest.proyecto_id || 'submarino-exploracion-3d';
  const alumnoId = obtenerAlumnoId();
  const soloLectura = esModoSoloLectura();
  const catalog = new PartsCatalog(datos.parts, datos.materials, datos.partTypes);
  const assembly = new Assembly(catalog, datos.rules, proyecto_id);
  const telemetry = new Telemetry({ ...datos.manifest.telemetry, proyecto_id, camara: cam.modo });
  const evaluacion = new Evaluacion(telemetry, { proyecto_id, manifest: datos.manifest, pesos: pesosDesdeRubrica(datos.rubrica) }); // E3 objetivos del manifest · F3 pesos de la rúbrica oficial
  precargar(['alerta', 'bateria', 'velocidad', 'profundidad', 'presion', 'motor']);

  const el = { main: document.getElementById('main'), panel: document.getElementById('panel'), stage: document.getElementById('stage'), controlStatus: document.getElementById('control-status'), nav: document.getElementById('nav'),
    pasos: document.getElementById('pasos'), toasts: document.getElementById('toasts'), ayuda: document.getElementById('ayuda') };

  if (soloLectura) {
    document.getElementById('app')?.classList.add('modo-solo-lectura');
    const banner = h('div', { id: 'banner-profesor', class: 'banner-profesor', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'banner-profesor-badge' }, 'ESPEJO DOCENTE · SOLO LECTURA'),
      h('span', {}, `Inspeccionando el diseño del alumno: `),
      h('strong', {}, alumnoId),
      h('span', { class: 'tenue pequeno' }, ` · Proyecto: ${proyecto_id} · Las modificaciones y el guardado están deshabilitados.`));
    document.getElementById('contenido')?.prepend(banner);
    const foot = document.querySelector('.nx-sidebar-foot');
    if (foot) foot.innerHTML = `<span class="nx-online"></span> MODO PROFESOR · ALUMNO ${alumnoId}`;
  }

  const obtenerSnapshot = () => ({
    ...assembly.toJSON('autoguardado', proyecto_id),
    proyecto_id,
    ...(alumnoId ? { alumno_id: alumnoId } : {}),
    ajustes: { proyecto_id, ...settings },
    estado: { escenarioId: app.estado.escenarioId, cond: app.estado.cond },
    ts: new Date().toISOString()
  });

  const app = {
    datos, proyecto_id, proyectoId: proyecto_id, alumnoId, soloLectura, modoProfesor: soloLectura,
    bus, t, sm, loader, view, cam, ocean, seabed, particles, fx, visuals, plants, fauna, implosion, hud, controls, catalog, assembly, telemetry, evaluacion,
    generarPuntajes: (opts) => evaluacion.generarPuntajes(opts),
    slog: SLog,
    panel: el.panel, settings, estado: { escenarioId: 'inmersion', cond: {} }, resultado: null, manual: null, modo: null, router: null, autoguardado: null,
    obtenerSnapshot,
    worldEfectivo: () => ({ ...datos.physics, gravedad: settings.gravedad, modoSimplificado: settings.modoSimplificado }),
    stats() { return assembly.stats(app.worldEfectivo(), entornoDe({ temperaturaC: 15 }, settings)); },
    go: (id) => app.router.ir(id),
    aviso(msg, tipo = 'info') { const n = h('div', { class: `toast ${tipo}` }, msg); el.toasts.append(n); setTimeout(() => n.remove(), 3800); },
    async refrescarVista() { implosion.reset(); await view.actualizar(assembly, app.stats()); for (const n of view.nodos.values()) n.meshes.forEach((m) => visuals.agregarSombra(m)); },
    guardarAjustes(b) {
      settings = b ? { ...AJUSTES_BASE, ...b } : { ...AJUSTES_BASE }; app.settings = settings;
      if (!app.soloLectura) {
        try { localStorage.setItem('submarino.ajustes', JSON.stringify({ proyecto_id, ...settings })); } catch { /* ignorar */ }
        app.autoguardado?.notificarCambio?.();
      }
      sm.scene.forceWireframe = settings.mostrarMalla;
    },
    mostrarEscena(visible, modo) {
      el.main.classList.toggle('con-escena', visible);
      if (visible) { app.modoEscena(modo ?? 'taller'); requestAnimationFrame(() => { sm.resize(); hud.resize(); }); }
    },
    modoEscena(modo) {
      app.modo = modo;
      const agua = modo === 'agua';
      ocean.superficie.setEnabled(agua); seabed.setEnabled(agua); plants.setEnabled(agua); fauna.setEnabled(agua && visuals.nivel < 3);
      if (agua) particles.iniciar(); else particles.detener();
      if (!agua) {
        sm.scene.fogDensity = 0; sm.scene.clearColor.set(0.03, 0.09, 0.16, 1); sm.ambient.intensity = 0.9; sm.sun.intensity = 0.9;
        view.ponerEn(0); if (!app.manual) cam.setModo('taller');
      }
    },
    vistaPrevia(profundidadM) {
      view.ponerEn(profundidadM); cam.setModo('orbita');
      sm.arc.target.set(0, -profundidadM, 0); cam.targetSuave = sm.arc.target.clone(); sm.arc.radius = 10; sm.arc.alpha = -Math.PI / 3; sm.arc.beta = 1.3;
    },
    async cargarEjemplo() {
      const r = await fetch(datos.manifest.data.exampleDesign);
      await app.cargarDiseno(await r.json());
    },
    async cargarDiseno(json, { silencioso = false } = {}) {
      const errs = assembly.load(json);
      if (errs.length) app.aviso(errs.join(' '), 'error');
      else if (!silencioso) app.aviso(t('app.cargado', 'Diseño cargado'));
      await app.refrescarVista();
      if (!app.soloLectura) app.autoguardado?.notificarCambio?.();
    },
    async cargar(opciones = {}) {
      const res = await cargar({ proyecto_id, alumno_id: opciones.alumno_id ?? alumnoId, ...opciones });
      if (res.ok && res.snapshot?.piezas && Object.keys(res.snapshot.piezas).length > 0) {
        await app.cargarDiseno(res.snapshot, { silencioso: Boolean(opciones.silencioso) });
        if (res.soloLectura && !opciones.silencioso) {
          app.aviso(`Diseño del alumno ${res.alumno_id} cargado en modo solo lectura`);
        }
        return res;
      }
      if (app.soloLectura) {
        const r = await fetch(datos.manifest.data.exampleDesign);
        const ej = await r.json();
        await app.cargarDiseno({ ...ej, proyecto_id, alumno_id: alumnoId }, { silencioso: true });
      }
      return res;
    },
    async _enviar(kind, nombre, data) {
      if (app.soloLectura && kind === 'diseno') {
        app.aviso('Modo solo lectura del profesor: no se puede sobrescribir el diseño del alumno.', 'error');
        return { ok: false, bloqueado: true, proyecto_id };
      }
      const dataConProyecto = { proyecto_id, ...(alumnoId ? { alumno_id: alumnoId } : {}), ...data };
      const blob = new Blob([JSON.stringify(dataConProyecto, null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `${kind}-${nombre}.json` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      try {
        const r = await fetch('/api/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proyecto_id, alumno_id: alumnoId, soloLectura: app.soloLectura, kind, name: nombre, data: dataConProyecto })
        });
        const j = await r.json();
        if (kind === 'diseno' && !app.soloLectura) {
          await guardar(dataConProyecto, { proyecto_id, alumno_id: alumnoId, soloLectura: app.soloLectura, origen: 'manual' });
        }
        app.aviso(`Guardado en ${j.file}`);
        return j;
      } catch (e) {
        SLog.warn('Main', 'No se pudo guardar en el servidor local', e.message);
        return { ok: false, proyecto_id };
      }
    },
    guardarDiseno() {
      const n = `submarino-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
      return app._enviar('diseno', n, assembly.toJSON(n, proyecto_id));
    },
    guardarReporte(r) {
      const n = `${r.escenario.id}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
      return app._enviar('reporte', n, { proyecto_id, escenario: r.escenario.id, condiciones: r.cond, resumen: r.resumen, dictamen: r.dictamen, eventos: r.eventos, diseno: assembly.toJSON(n, proyecto_id), estadisticas: { masaSecaKg: r.stats.masaSecaKg, profundidadDisenoM: r.stats.profundidadDisenoM, profundidadColapsoM: r.stats.profundidadColapsoM } });
    },
    iniciarManual(cond) {
      const clima = CLIMAS.find((c) => c[0] === settings.clima)?.[2] ?? 0;
      const env = entornoDe({ ...cond, corrienteMs: clima }, settings);
      const world = app.worldEfectivo(), stats = assembly.stats(world, env);
      app.manual = { phys: new PhysicsModule(world, env, stats, { startDepthM: caladoEquilibrio(stats), fill: 0 }), stats, cond, world, env, danos: new Set(), golpeT: -99 };
      app.manual.phys.puntosContacto = view.puntosContacto(); // silueta completa para chocar con el fondo
      view.setFocosDanados(false); app.manual.phys.extZ = view.extensionZ();
      controls.attach(); el.controlStatus.classList.remove('oculto'); app.modoEscena('agua'); cam.setModo('seguimiento'); cam.targetSuave = view.root.position.clone();
      telemetry.event('piloto-manual-inicio', { temperaturaC: env.temperaturaC });
      hud.resize();
    },
    detenerManual() { if (!app.manual) return; implosion.reset(); view.setCascoAlpha(1); view.setDentro(false); lucesOn = true; view.setLuces(true); pintarLuces(); mando.hidden = true; controls.detach(); app.manual = null; el.controlStatus.classList.add('oculto'); hud.limpiar(); telemetry.event('piloto-manual-fin'); telemetry.flush(); if (app.modo === 'agua') app.vistaPrevia(app.estado.cond[app.estado.escenarioId]?.profundidadM ?? 0); }
  };
  app.guardarAjustes(settings);

  // D1-D4: Eventos estandarizados de telemetría y evaluación
  const registrarEventoEstandarizado = (evento, detail) => {
    // event() ya suma aciertos/fallos según exito/acierto. Antes se llamaba a registrarAcierto(detail) sin `evento`:
    // el intento correcto no quedaba en el buffer (evaluacion.js no lo veía) y el contador subía dos veces.
    telemetry.event(evento, { proyecto_id, ...detail });

    if (app.soloLectura) return;
    fetch('/api/avance-rutas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id, evento, ...detail })
    }).catch((e) => SLog.warn('STEAM', `No se pudo persistir el evento ${evento}`, e.message));
  };

  bus.on('objeto_colocado', (detail) => registrarEventoEstandarizado('objeto_colocado', detail));
  bus.on('object_colocado', (detail) => registrarEventoEstandarizado('objeto_colocado', detail));
  bus.on('matematicas_intento', (detail) => registrarEventoEstandarizado('matematicas_intento', detail));
  bus.on('ciencia_intento', (detail) => registrarEventoEstandarizado('ciencia_intento', detail));
  bus.on('programa_ejecutado', (detail) => registrarEventoEstandarizado('programa_ejecutado', detail));
  bus.on('biomimetica_completada', (detail) => registrarEventoEstandarizado('biomimetica_completada', detail));
  bus.on('camara-siguiente', () => {
    if (app.manual) {
      const c = cam.siguiente();
      telemetry.setCamara(c);
      app.aviso(`Cámara: ${c}`);
    }
  });
  const notificarActividad = () => telemetry.registrarActividad();
  addEventListener('pointerdown', notificarActividad, { passive: true });
  addEventListener('keydown', notificarActividad, { passive: true });
  addEventListener('wheel', notificarActividad, { passive: true });
  bus.on('reiniciar', () => { if (app.manual) { const { cond } = app.manual; app.detenerManual(); app.iniciarManual(cond); app.aviso('Exploración reiniciada'); } });
  bus.on('soltar-pesos', () => app.manual?.phys.releaseWeights());
  bus.on('ayuda', () => el.ayuda.classList.toggle('oculto'));
  limpiar(el.ayuda).append(h('strong', {}, t('ayuda.titulo', 'Controles')), ...TECLAS.map(([k, d]) => h('div', {}, h('kbd', {}, k), ' ', d)));

  // --- navegación y pasos ---
  for (const [grupo, items] of NAV) {
    el.nav.append(h('div', { class: 'nx-nav-label' }, grupo));
    for (const [id, nombre] of items) {
      const texto = t(`nav.${id}`, nombre);
      const a = h('a', { href: `#/${id}`, dataset: { ruta: id }, title: texto, 'aria-label': texto }, h('span', {}, texto));
      a.insertAdjacentHTML('afterbegin', iconoNav(id));
      el.nav.append(a);
    }
  }
  [[1, 'Ensamblaje'], [2, 'Pruebas'], [3, 'Resultados']].forEach(([n, nombre]) => el.pasos.append(h('div', { class: 'paso', dataset: { n } }, h('span', { class: 'paso-num' }, n), h('span', {}, t(`paso.${n}`, nombre)))));

  app.router = new Router({
    inicio: HomeScreen(app), ensamblaje: AssemblyScreen(app), pruebas: TrialsScreen(app), estres: StressScreen(app), resultados: ResultsScreen(app), libros: BooksScreen(app), configuracion: SettingsScreen(app),
    biblioteca: LibraryScreen(app), ruta: RouteScreen(app), proyecto: ProjectScreen(app)
  }, {
    alCambiar(id) {
      el.nav.querySelectorAll('a').forEach((a) => {
        const activo = a.dataset.ruta === id || (id === 'estres' && a.dataset.ruta === 'pruebas');
        a.classList.toggle('active', activo); if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      const [sup, titulo] = TITULOS[id] ?? TITULOS.inicio;
      document.getElementById('app').dataset.ruta = id;
      document.getElementById('barra-sup').textContent = sup; document.getElementById('barra-titulo').textContent = titulo;
      document.title = `${titulo} · NAUTILUS`;
      el.panel.scrollTop = 0;
      const n = PASO[id] ?? 0;
      el.pasos.classList.toggle('oculto', n === 0);
      el.pasos.querySelectorAll('.paso').forEach((p) => { const k = Number(p.dataset.n); p.classList.toggle('activo', k === n); p.classList.toggle('hecho', k < n); });
      if (id === 'ensamblaje') telemetry.setDimensionSTEAM('E');
      else if (id === 'pruebas' || id === 'estres') telemetry.setDimensionSTEAM('T');
      else if (id === 'libros') telemetry.setDimensionSTEAM('S');
      else if (id === 'biblioteca') telemetry.setDimensionSTEAM('INTRO');
      else if (id === 'ruta') telemetry.setDimensionSTEAM('M');
    }
  });

  // --- choques contra el lecho y las rocas ---
  const mundoFondo = { alturaFondo: (x, z) => seabed.alturaColision(x, z), elipsoides: seabed.colisiones, techoY: -seabed.fondoM + 110 };
  const UMBRAL_FUERTE = 1.0; // m/s: a partir de aquí el golpe daña un componente
  const DANIABLES = [['propulsion', 'el propulsor'], ['aletas', 'las aletas'], ['sonar', 'el sonar'], ['focos', 'los focos'], ['lastre', 'la bomba de lastre']];
  const dañar = (m, tipo) => {
    const s = m.stats;
    if (tipo === 'propulsion') s.empujeMaxN *= 0.5;
    else if (tipo === 'aletas') s.areaAletasM2 *= 0.4;
    else if (tipo === 'sonar') s.alcanceSonarM *= 0.35;
    else if (tipo === 'focos') view.setFocosDanados(true);
    else if (tipo === 'lastre') m.phys.ballast.bombaM3s *= 0.5;
    m.danos.add(tipo);
  };
  const alChocar = (m, v) => {
    if (m.phys.t - m.golpeT < 2.5) return; // un mismo golpe no cuenta varias veces
    m.golpeT = m.phys.t;
    const stage = document.getElementById('stage'); stage?.classList.remove('choque'); void stage?.offsetWidth; stage?.classList.add('choque');
    if (v < UMBRAL_FUERTE) { app.aviso(`Roce con el fondo (${v.toFixed(1)} m/s)`); return; }
    const candidatos = DANIABLES.filter(([t]) => assembly.get(t) && !m.danos.has(t));
    const [tipo, nombre] = candidatos.length ? candidatos[Math.floor(Math.random() * candidatos.length)] : [null, null];
    if (tipo) dañar(m, tipo);
    view.parpadear(5);
    app.aviso(tipo ? `¡Choque a ${v.toFixed(1)} m/s! Daño en ${nombre}` : `¡Choque a ${v.toFixed(1)} m/s!`, 'error');
    telemetry.registrarFallo({ evento: 'choque', velocidadMs: +v.toFixed(2), danio: tipo });
  };

  // --- bucle de simulación (paso fijo) ---
  const loop = new Loop({
    fixedStep: datos.physics.pasoFijoS, maxDt: datos.physics.dtMaxS,
    step(dt) {
      const m = app.manual; if (!m) return;
      const snap = m.phys.step(dt, controls.read(dt));
      const golpe = resolverContacto(m.phys, mundoFondo, dt); if (golpe?.impacto > 0.5) alChocar(m, golpe.impacto);
      const pos = m.phys.pos || { x: 0, y: 0, z: 0 };
      telemetry.record({
        t: +snap.t.toFixed(2),
        depthM: +snap.depthM.toFixed(2),
        speedMs: +snap.speedMs.toFixed(3),
        headingDeg: +snap.headingDeg.toFixed(1),
        pitchDeg: +snap.pitchDeg.toFixed(2),
        rollDeg: +snap.rollDeg.toFixed(2),
        thrustN: +snap.thrustN.toFixed(0),
        ballastFill: +snap.ballastFill.toFixed(3),
        pressureAtm: +snap.pressureAtm.toFixed(2),
        soc: +snap.soc.toFixed(4),
        powerW: +snap.powerW.toFixed(0),
        x: Number((pos.x ?? 0).toFixed(2)),
        y: Number((pos.y ?? -snap.depthM).toFixed(2)),
        z: Number((pos.z ?? 0).toFixed(2)),
        camara: cam.modo || 'taller',
        dimension_steam: 'T'
      });
      for (const ev of m.phys.events.splice(0)) {
        if (ev.tipo === 'colapso' || ev.tipo === 'energia-agotada') telemetry.registrarFallo(ev);
        else telemetry.event(ev.tipo, ev);
      }
      if (m.phys.colapsado) implosion.play();
    },
    update(dtReal) {
      const m = app.manual;
      if (m) {
        view.aplicarPose(m.phys.pos, m.phys.R);
        const snap = m.phys.snapshot(), cs = controls.estado();
        el.controlStatus.innerHTML = `<div class="cs-title"><span>PILOTO MANUAL · WASD</span><span>${snap.powered ? 'ENERGÍA OK' : 'SIN ENERGÍA'}</span></div><div class="cs-grid"><div>Velocidad<br><span class="cs-value">${snap.speedMs.toFixed(2)} m/s</span></div><div>Profundidad<br><span class="cs-value">${snap.depthM.toFixed(1)} m</span></div><div>Empuje<br><span class="cs-value">${Math.round(snap.throttle * 100)}%</span></div><div>Rumbo<br><span class="cs-value">${Math.round(snap.headingDeg)}°</span></div><div>Batería<br><span class="cs-value">${Math.round(snap.soc * 100)}%</span></div><div>Timón<br><span class="cs-value">${cs.rudder < 0 ? 'IZQ.' : cs.rudder > 0 ? 'DER.' : 'CENTRO'}</span></div></div><div class="cs-keys">Teclas activas: ${cs.teclas.length ? cs.teclas.map(k => `<kbd>${k}</kbd>`).join(' ') : 'ninguna'} · W acelera, S reduce empuje</div>`;
        if (view.dentro) { // en la cabina: caminar y girar con el teclado (la persona no pilota mientras camina)
          const k = controls.keys, g = (...c) => c.some((x) => k.has(x)), dt = Math.min(dtReal, 0.1);
          if (view.caminando) {
            const f = (g('KeyW') ? 1 : 0) - (g('KeyS') ? 1 : 0), l = (g('KeyD') ? 1 : 0) - (g('KeyA') ? 1 : 0);
            if (f || l) view.mover(f, l, dt);
            view.girar(((g('ArrowRight') ? 1 : 0) - (g('ArrowLeft') ? 1 : 0)) * 1.8 * dt, ((g('ArrowUp') ? 1 : 0) - (g('ArrowDown') ? 1 : 0)) * 1.4 * dt);
          }
        }
        view.actualizarLuces(Math.min(dtReal, 0.5));
        cam.update(dtReal, view.root.position, view.dentro ? view.direccionMirada() : view.adelante, view.arriba, view.posCabina());
        actualizarAgua(-sm.scene.activeCamera.globalPosition.y); visuals.actualizar(-sm.scene.activeCamera.globalPosition.y, dtReal); plants.update(dtReal); fauna.update(dtReal, sm.scene.activeCamera.globalPosition); implosion.update(dtReal); sincronizarCabina(-sm.scene.activeCamera.globalPosition.y);
        hud.dibujar(m.phys.snapshot(), m.stats, { mostrarDatos: settings.mostrarDatos, sonar: { posB: view.root.position, headingRad: Math.atan2(view.adelante.x, view.adelante.z), fondoY: view.root.position.y, alturaFondo: (x, z) => seabed.heightAt(x, z) } });
      } else if (app.modo === 'agua') { actualizarAgua(-sm.scene.activeCamera.globalPosition.y); visuals.actualizar(-sm.scene.activeCamera.globalPosition.y, dtReal); plants.update(dtReal); fauna.update(dtReal, sm.scene.activeCamera.globalPosition); }
      else visuals.actualizar(0, dtReal, false);
    }
  });
  sm.run((dt) => loop.tick(dt));

  new ResizeObserver(() => { sm.resize(); hud.resize(); }).observe(el.stage);
  addEventListener('resize', () => { sm.resize(); hud.resize(); });

  // C1, C2, C3, C4, C5: Persistencia automática, restauración inicial, sendBeacon al cerrar y espejo docente (?alumno=ID).
  await app.cargar({ silencioso: true });
  app.autoguardado = iniciarAutoguardado(obtenerSnapshot, { proyecto_id, alumno_id: alumnoId, soloLectura, bus });

  const alCerrarPestana = () => {
    if (!app.soloLectura) {
      enviarBeaconSnapshot(obtenerSnapshot, { proyecto_id, alumno_id: alumnoId, soloLectura });
    }
    telemetry.flushBeacon();
  };
  addEventListener('pagehide', alCerrarPestana);
  addEventListener('beforeunload', alCerrarPestana);
  setInterval(() => telemetry.flush(), 5000);

  globalThis.__submarino = app; // para depuración desde la consola
  await app.router.resolver();
  cargando.classList.add('oculto');
  SLog.info('Main', 'Aplicación lista');
}

boot().catch((e) => {
  SLog.error('Main', 'Fallo de arranque', e.message);
  const c = document.getElementById('cargando');
  if (c) { c.classList.remove('oculto'); c.classList.add('error'); c.textContent = `No se pudo iniciar: ${e.message}`; }
});
