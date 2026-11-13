import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROYECTO_ID_DEFECTO,
  obtenerAlumnoId,
  esModoSoloLectura,
  normalizarSnapshot,
  guardar,
  cargar,
  enviarBeaconSnapshot,
  iniciarAutoguardado
} from '../../src/core/guardado.js';

function crearStorageMock() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    dump: () => Object.fromEntries(map.entries())
  };
}

test('C5: normalizarSnapshot incluye siempre proyecto_id', () => {
  const snap = normalizarSnapshot({ piezas: { casco: { partId: 'casco-cilindro-corto', materialId: 'acero-hy80' } } }, { proyecto_id: 'submarino-exploracion-3d' });
  assert.equal(snap.proyecto_id, 'submarino-exploracion-3d');
  assert.equal(snap.version, 1);
  assert.ok(snap.piezas.casco);
  assert.ok(typeof snap.ts === 'string');
});

test('C4: obtenerAlumnoId y esModoSoloLectura detectan ?alumno=ID en search y en hash', () => {
  assert.equal(obtenerAlumnoId({ search: '?alumno=2530451', hash: '#/ensamblaje' }), '2530451');
  assert.equal(esModoSoloLectura({ search: '?alumno=2530451', hash: '#/ensamblaje' }), true);
  assert.equal(obtenerAlumnoId({ search: '', hash: '#/ensamblaje?alumno=alum-01' }), 'alum-01');
  assert.equal(esModoSoloLectura({ search: '', hash: '#/ensamblaje' }), false);
});

test('C2 y C5: guardar() y cargar() persisten y restauran el diseño con proyecto_id', async () => {
  const storage = crearStorageMock();
  const enviados = [];
  const fetchMock = async (url, opts) => {
    if (opts?.method === 'POST') {
      const body = JSON.parse(opts.body);
      enviados.push({ url, body });
      return { ok: true, json: async () => ({ ok: true, file: 'data/guardado/submarino-exploracion-3d.json' }) };
    }
    return {
      ok: true,
      json: async () => ({
        ok: true,
        proyecto_id: PROYECTO_ID_DEFECTO,
        snapshot: enviados[0]?.body?.snapshot ?? null
      })
    };
  };

  const diseno = {
    nombre: 'mi-submarino',
    piezas: { casco: { partId: 'casco-cilindro-corto', materialId: 'acero-hy80' } }
  };

  const resGuardar = await guardar(diseno, {
    proyecto_id: 'submarino-exploracion-3d',
    soloLectura: false,
    storage,
    fetchImpl: fetchMock
  });
  assert.equal(resGuardar.ok, true);
  assert.equal(resGuardar.proyecto_id, 'submarino-exploracion-3d');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].body.proyecto_id, 'submarino-exploracion-3d');
  assert.equal(enviados[0].body.snapshot.proyecto_id, 'submarino-exploracion-3d');

  const resCargar = await cargar({
    proyecto_id: 'submarino-exploracion-3d',
    alumno_id: null,
    storage,
    fetchImpl: fetchMock
  });
  assert.equal(resCargar.ok, true);
  assert.equal(resCargar.proyecto_id, 'submarino-exploracion-3d');
  assert.deepEqual(resCargar.snapshot.piezas, diseno.piezas);
});

test('C3 y C5: enviarBeaconSnapshot usa navigator.sendBeacon con proyecto_id al cerrar pestaña', () => {
  const storage = crearStorageMock();
  const beacons = [];
  const navigatorMock = {
    sendBeacon(url, body) {
      beacons.push({ url, body });
      return true;
    }
  };
  const ok = enviarBeaconSnapshot(
    () => ({ nombre: 'cierre', piezas: { casco: { partId: 'casco-esfera', materialId: 'titanio-ti64' } } }),
    {
      proyecto_id: 'submarino-exploracion-3d',
      soloLectura: false,
      navigatorImpl: navigatorMock,
      storage
    }
  );
  assert.equal(ok, true);
  assert.equal(beacons.length, 1);
  assert.equal(beacons[0].url, '/api/guardado');
  const localGuardado = JSON.parse(storage.getItem('submarino.autoguardado.submarino-exploracion-3d'));
  assert.equal(localGuardado.proyecto_id, 'submarino-exploracion-3d');
  assert.equal(localGuardado.origen, 'sendBeacon');
});

test('C1 y C4: iniciarAutoguardado se desactiva en modo profesor (?alumno=ID) y funciona en modo alumno', async () => {
  const storage = crearStorageMock();
  let beaconCount = 0;
  const listeners = {};
  const windowMock = {
    location: { search: '?alumno=2530451', hash: '#/ensamblaje' },
    addEventListener(ev, fn) { listeners[ev] = fn; },
    removeEventListener(ev) { delete listeners[ev]; }
  };

  // Modo profesor: no debe activar timers ni permitir escrituras
  const ctrlProf = iniciarAutoguardado(() => ({ piezas: {} }), {
    proyecto_id: 'submarino-exploracion-3d',
    windowImpl: windowMock,
    storage
  });
  assert.equal(ctrlProf.activo, false);
  assert.equal(ctrlProf.soloLectura, true);
  assert.equal(ctrlProf.enviarBeacon(), false);

  // Modo alumno: activa autoguardado y registra eventos de cierre de pestaña
  const windowAlumno = {
    location: { search: '', hash: '#/ensamblaje' },
    addEventListener(ev, fn) { listeners[ev] = fn; },
    removeEventListener(ev) { delete listeners[ev]; }
  };
  const ctrlAlumno = iniciarAutoguardado(
    () => ({ piezas: { casco: { partId: 'casco-cilindro-corto', materialId: 'acero-hy80' } } }),
    {
      proyecto_id: 'submarino-exploracion-3d',
      windowImpl: windowAlumno,
      storage,
      fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true }) }),
      navigatorImpl: { sendBeacon: () => { beaconCount++; return true; } }
    }
  );
  assert.equal(ctrlAlumno.activo, true);
  assert.equal(ctrlAlumno.soloLectura, false);
  assert.ok(typeof listeners.pagehide === 'function');
  assert.ok(typeof listeners.beforeunload === 'function');

  const guardadoManual = await ctrlAlumno.guardarAhora(true);
  assert.equal(guardadoManual.ok, true);
  assert.equal(guardadoManual.proyecto_id, 'submarino-exploracion-3d');

  listeners.pagehide();
  assert.equal(beaconCount, 1);
  ctrlAlumno.detener();
});

