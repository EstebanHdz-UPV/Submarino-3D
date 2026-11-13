import test from 'node:test';
import assert from 'node:assert/strict';
import { Telemetry, EVENTOS_ESTANDARIZADOS } from '../../src/core/Telemetry.js';

test('telemetría limita el buffer y aplica intervalo de muestreo', () => {
  const t = new Telemetry({ intervalMs: 100, batchSize: 999, maxBuffer: 2 });
  assert.equal(t.record({ depthM: 1 }, 0), true);
  assert.equal(t.record({ depthM: 2 }, 50), false);
  assert.equal(t.record({ depthM: 3 }, 100), true);
  assert.equal(t.record({ depthM: 4 }, 200), true);
  assert.equal(t.buffer.length, 2);
  assert.equal(t.buffer[0].depthM, 3);
});

test('eventos importantes se registran aunque no haya pasado el intervalo', () => {
  const t = new Telemetry({ intervalMs: 1000, batchSize: 999 });
  assert.equal(t.event('prueba-finalizada', { aprobado: true }), true);
  assert.equal(t.buffer[0].evento, 'prueba-finalizada');
  assert.equal(t.buffer[0].aprobado, true);
});

test('un fallo de red conserva los datos pendientes para reintentar', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return { ok: true, status: 204 };
  };
  try {
    const t = new Telemetry({ intervalMs: 1, batchSize: 50 });
    t.record({ depthM: 4 }, 10);
    assert.equal(await t.flush(), false);
    assert.equal(t.pending.length, 1);
    assert.equal(await t.flush(), true);
    assert.equal(t.pending.length, 0);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('D1: emite eventos estandarizados matematicas_intento, ciencia_intento, objeto_colocado, programa_ejecutado', () => {
  const t = new Telemetry({ proyecto_id: 'submarino-prueba', intervalMs: 1000, batchSize: 50 });

  assert.equal(EVENTOS_ESTANDARIZADOS.MATEMATICAS_INTENTO, 'matematicas_intento');
  assert.equal(EVENTOS_ESTANDARIZADOS.CIENCIA_INTENTO, 'ciencia_intento');
  assert.equal(EVENTOS_ESTANDARIZADOS.OBJETO_COLOCADO, 'objeto_colocado');
  assert.equal(EVENTOS_ESTANDARIZADOS.PROGRAMA_EJECUTADO, 'programa_ejecutado');

  // matematicas_intento
  assert.equal(t.matematicasIntento({ rho: 1025, g: 9.81, h: 30, presionPa: 301657.5, exito: true }), true);
  const evMat = t.buffer.find((e) => e.evento === 'matematicas_intento');
  assert.ok(evMat);
  assert.equal(evMat.proyecto_id, 'submarino-prueba');
  assert.equal(evMat.rho, 1025);
  assert.equal(evMat.exito, true);
  assert.ok(typeof evMat.ts === 'string');

  // ciencia_intento
  assert.equal(t.cienciaIntento({ rho: 1025, volumenM3: 2.4, masaKg: 2460, empujeN: 24132.6, exito: true }), true);
  const evCiencia = t.buffer.find((e) => e.evento === 'ciencia_intento');
  assert.ok(evCiencia);
  assert.equal(evCiencia.proyecto_id, 'submarino-prueba');
  assert.equal(evCiencia.volumenM3, 2.4);
  assert.equal(evCiencia.exito, true);

  // objeto_colocado
  assert.equal(t.objetoColocado({ slotId: 'casco', partId: 'casco-cilindro-corto' }), true);
  const evObj = t.buffer.find((e) => e.evento === 'objeto_colocado');
  assert.ok(evObj);
  assert.equal(evObj.proyecto_id, 'submarino-prueba');
  assert.equal(evObj.slotId, 'casco');
  assert.equal(evObj.partId, 'casco-cilindro-corto');

  // programa_ejecutado
  assert.equal(t.programaEjecutado({ orden: ['read', 'compare', 'ballast'], ordenado: true, exito: true }), true);
  const evProg = t.buffer.find((e) => e.evento === 'programa_ejecutado');
  assert.ok(evProg);
  assert.equal(evProg.proyecto_id, 'submarino-prueba');
  assert.deepEqual(evProg.orden, ['read', 'compare', 'ballast']);
  assert.equal(evProg.exito, true);

  // También se pueden emitir con t.event(nombre, detalle)
  assert.equal(t.event('matematicas_intento', { pruebaDirecta: true }), true);
  assert.equal(t.event('ciencia_intento', { pruebaDirecta: true }), true);
  assert.equal(t.event('objeto_colocado', { pruebaDirecta: true }), true);
  assert.equal(t.event('programa_ejecutado', { pruebaDirecta: true }), true);
});

test('D2: añade proyecto_id y dimension_steam a cada muestra', () => {
  const t = new Telemetry({ proyecto_id: 'sub-d2-test', dimension_steam: 'M', intervalMs: 10 });
  assert.equal(t.record({ depthM: 10 }, 0), true);
  assert.equal(t.buffer.length, 1);
  assert.equal(t.buffer[0].proyecto_id, 'sub-d2-test');
  assert.equal(t.buffer[0].dimension_steam, 'M');

  // Cambiar dimensión dinámicamente
  t.setDimensionSTEAM('S');
  assert.equal(t.record({ depthM: 20 }, 20), true);
  assert.equal(t.buffer[1].dimension_steam, 'S');

  // Sobrescribir por muestra individual
  assert.equal(t.record({ depthM: 30, dimension_steam: 'E' }, 40), true);
  assert.equal(t.buffer[2].dimension_steam, 'E');
});

test('D3: registra aciertos/fallos, inactividad, coordenadas (X,Y,Z) y cámara', () => {
  const t = new Telemetry({ proyecto_id: 'sub-d3-test', intervalMs: 10, camara: 'proa' });
  t.registrarAcierto();
  t.registrarAcierto();
  t.registrarFallo();
  assert.equal(t.aciertos, 2);
  assert.equal(t.fallos, 1);

  // Muestra con coordenadas y cámara
  t.record({ depthM: 15, x: 12.5, y: -15, z: 45.2, camara: 'seguimiento', inactividadS: 2.5 }, 100);
  const m = t.buffer[t.buffer.length - 1];
  assert.equal(m.aciertos, 2);
  assert.equal(m.fallos, 1);
  assert.equal(m.x, 12.5);
  assert.equal(m.y, -15);
  assert.equal(m.z, 45.2);
  assert.deepEqual(m.coordenadas, { x: 12.5, y: -15, z: 45.2 });
  assert.equal(m.camara, 'seguimiento');
  assert.equal(m.inactividadS, 2.5);
  assert.equal(m.inactivo, false);

  // Verificar inactividad automática al superar umbral
  t.registrarActividad(1000);
  assert.equal(t.obtenerInactividadS(1000), 0);
  assert.equal(t.obtenerInactividadS(15000), 14); // 14 segundos después
});

test('D4: conecta con telemetria.js del Core para que evaluacion.js genere puntajes', async () => {
  const { Telemetria, Evaluacion, generarPuntajes } = await import('../../src/core/telemetria.js');
  assert.ok(Telemetria);
  assert.ok(Evaluacion);
  assert.ok(typeof generarPuntajes === 'function');

  const t = new Telemetria({ proyecto_id: 'sub-d4-test', intervalMs: 10 });
  // Registrar actividad STEAM
  t.matematicasIntento({ rho: 1025, g: 9.81, h: 30, presionPa: 301657.5, exito: true });
  t.cienciaIntento({ rho: 1025, volumenM3: 2.4, masaKg: 2460, exito: true });
  t.objetoColocado({ slotId: 'casco', partId: 'casco-cilindro' });
  t.objetoColocado({ slotId: 'propulsion', partId: 'motor-electrico' });
  t.objetoColocado({ slotId: 'lastre', partId: 'tanque-lastre' });
  t.objetoColocado({ slotId: 'bateria', partId: 'bat-ion' });
  t.objetoColocado({ slotId: 'controles', partId: 'timon-mando' });
  t.programaEjecutado({ orden: ['read', 'compare', 'ballast'], ordenado: true, exito: true });

  // Muestras de navegación con coordenadas y cámaras
  t.record({ x: 0, y: -5, z: 0, camara: 'taller', depthM: 5 }, 10);
  t.record({ x: 5, y: -15, z: 10, camara: 'proa', depthM: 15 }, 25);
  t.record({ x: 15, y: -30, z: 30, camara: 'seguimiento', depthM: 30 }, 40);

  // Generar evaluación
  const evaluacion = t.generarPuntajes();
  assert.ok(evaluacion);
  assert.equal(evaluacion.proyecto_id, 'sub-d4-test');
  assert.ok(typeof evaluacion.puntajeGlobal === 'number');
  assert.ok(evaluacion.puntajeGlobal >= 50, `El puntaje debería ser satisfactorio, obtenido ${evaluacion.puntajeGlobal}`);
  assert.ok(evaluacion.dimensiones.M.puntaje > 0);
  assert.ok(evaluacion.dimensiones.S.puntaje > 0);
  assert.ok(evaluacion.dimensiones.E.puntaje >= 80);
  assert.ok(evaluacion.dimensiones.T.puntaje > 0);
  assert.ok(evaluacion.dimensiones.A.puntaje > 0);
  assert.ok(evaluacion.estadisticas.distanciaRecorridaM > 0);
  assert.ok(evaluacion.estadisticas.camarasUsadas.includes('proa'));
  assert.ok(evaluacion.estadisticas.camarasUsadas.includes('seguimiento'));
  assert.ok(Array.isArray(evaluacion.recomendaciones));
});
