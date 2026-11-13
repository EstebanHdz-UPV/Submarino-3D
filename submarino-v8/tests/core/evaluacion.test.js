import test from 'node:test';
import assert from 'node:assert/strict';
import { Telemetria } from '../../src/core/telemetria.js';
import { Evaluacion, generarPuntajes, evaluarTelemetria, determinarNivel, NIVELES_DESEMPENO } from '../../src/core/evaluacion.js';

test('D4: determinarNivel mapea correctamente rangos numéricos a niveles cualitativos', () => {
  assert.equal(determinarNivel(100), 'Excelente');
  assert.equal(determinarNivel(85), 'Excelente');
  assert.equal(determinarNivel(84), 'Bueno');
  assert.equal(determinarNivel(70), 'Bueno');
  assert.equal(determinarNivel(69), 'Suficiente');
  assert.equal(determinarNivel(50), 'Suficiente');
  assert.equal(determinarNivel(49), 'Insuficiente');
  assert.equal(determinarNivel(0), 'Insuficiente');
});

test('D4: evaluacion.js calcula puntajes por cada dimensión STEAM y genera informe consolidado', () => {
  const telemetria = new Telemetria({ proyecto_id: 'sub-steam-eval', intervalMs: 10 });

  // M: intento matemático exitoso
  telemetria.matematicasIntento({ rho: 1025, g: 9.81, h: 50, presionPa: 502762.5, exito: true });

  // S: calibración de flotabilidad exitosa
  telemetria.cienciaIntento({ rho: 1025, volumenM3: 2.4, masaKg: 2460, exito: true });

  // E: ensamblaje de 5 piezas
  ['casco', 'propulsion', 'lastre', 'bateria', 'controles'].forEach((slotId, i) => {
    telemetria.objetoColocado({ slotId, partId: `pieza-${i}` });
  });

  // T: programa de bloques correcto
  telemetria.programaEjecutado({ orden: ['read', 'compare', 'ballast'], ordenado: true, exito: true });

  // Muestras de simulación física con coordenadas, cámaras y baja inactividad
  telemetria.record({ x: 0, y: 0, z: 0, depthM: 0, speedMs: 1.2, inactividadS: 0.5, camara: 'taller', dimension_steam: 'T' }, 0);
  telemetria.record({ x: 10, y: -20, z: 20, depthM: 20, speedMs: 2.5, inactividadS: 0.5, camara: 'proa', dimension_steam: 'T' }, 200);
  telemetria.record({ x: 25, y: -50, z: 60, depthM: 50, speedMs: 3.1, inactividadS: 0.5, camara: 'seguimiento', dimension_steam: 'T' }, 400);

  const informe = generarPuntajes(telemetria);

  assert.equal(informe.proyecto_id, 'sub-steam-eval');
  assert.ok(informe.aprobado);
  assert.ok(informe.puntajeGlobal >= 70);

  // Verificar dimensiones
  assert.ok(informe.dimensiones.M.puntaje >= 80);
  assert.ok(informe.dimensiones.S.puntaje >= 70);
  assert.equal(informe.dimensiones.E.puntaje, 100);
  assert.ok(informe.dimensiones.T.puntaje >= 70);
  assert.ok(informe.dimensiones.A.puntaje >= 70);

  // Verificar estadísticas acumuladas
  assert.ok(informe.estadisticas.distanciaRecorridaM > 40);
  assert.equal(informe.estadisticas.profundidadMaximaM, 50);
  assert.ok(informe.estadisticas.camarasUsadas.length >= 3);
  assert.ok(informe.estadisticas.aciertos >= 4);
  assert.equal(informe.estadisticas.fallos, 0);
  assert.equal(informe.estadisticas.tasaAciertosPct, 100);
  assert.ok(Array.isArray(informe.recomendaciones));
});

test('D4: evaluacion penaliza colisiones y fallos, reflejándolos en recomendaciones y puntajes', () => {
  const telemetria = new Telemetria({ proyecto_id: 'sub-fallos-eval' });

  // Registrar fallos
  telemetria.registrarFallo({ evento: 'choque', velocidadMs: 3.2 });
  telemetria.registrarFallo({ evento: 'choque', velocidadMs: 4.1 });
  telemetria.registrarFallo({ evento: 'colapso', profundidadM: 500 });
  telemetria.matematicasIntento({ exito: false, valido: false });

  const ev = new Evaluacion(telemetria);
  const informe = ev.generarPuntajes();

  assert.ok(informe.estadisticas.fallos >= 4);
  assert.ok(informe.dimensiones.S.puntaje < 60);
  assert.ok(informe.dimensiones.M.puntaje < 60);
  assert.ok(informe.recomendaciones.some((r) => r.toLowerCase().includes('choque') || r.toLowerCase().includes('fondo')));
});
