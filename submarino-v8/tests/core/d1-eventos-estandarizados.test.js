import test from 'node:test';
import assert from 'node:assert/strict';
import { Telemetry, EVENTOS_ESTANDARIZADOS } from '../../src/core/Telemetry.js';
import { EventBus } from '../../src/core/EventBus.js';

test('D1: constantes de eventos estandarizados existen y coinciden con la especificación', () => {
  assert.equal(EVENTOS_ESTANDARIZADOS.MATEMATICAS_INTENTO, 'matematicas_intento');
  assert.equal(EVENTOS_ESTANDARIZADOS.CIENCIA_INTENTO, 'ciencia_intento');
  assert.equal(EVENTOS_ESTANDARIZADOS.OBJETO_COLOCADO, 'objeto_colocado');
  assert.equal(EVENTOS_ESTANDARIZADOS.PROGRAMA_EJECUTADO, 'programa_ejecutado');
});

test('D1: Telemetry emite y almacena los cuatro eventos estandarizados con metadatos completos', () => {
  const telemetry = new Telemetry({ proyecto_id: 'submarino-d1-test', intervalMs: 1000, batchSize: 50 });

  // 1. matematicas_intento
  assert.equal(telemetry.matematicasIntento({
    fase: 'M',
    rho: 1025,
    g: 9.81,
    h: 40,
    presionPa: 402210,
    valido: true,
    exito: true
  }), true);

  // 2. ciencia_intento
  assert.equal(telemetry.cienciaIntento({
    fase: 'S',
    rho: 1025,
    volumenM3: 2.4,
    masaKg: 2460,
    empujeN: 24132.6,
    pesoN: 24132.6,
    diferenciaN: 0,
    valido: true,
    exito: true
  }), true);

  // 3. objeto_colocado
  assert.equal(telemetry.objetoColocado({
    slotId: 'propulsion',
    partId: 'motor-electrico-50kw'
  }), true);

  // 4. programa_ejecutado
  assert.equal(telemetry.programaEjecutado({
    fase: 'T',
    bloques: ['read', 'compare', 'ballast'],
    ordenado: true,
    objetivoM: 25,
    profundidadInicialM: 10,
    errorM: 15,
    exito: true
  }), true);

  const eventos = telemetry.buffer.map((e) => e.evento);
  assert.deepEqual(eventos, [
    'matematicas_intento',
    'ciencia_intento',
    'objeto_colocado',
    'programa_ejecutado'
  ]);

  for (const item of telemetry.buffer) {
    assert.equal(item.proyecto_id, 'submarino-d1-test');
    assert.ok(typeof item.ts === 'string');
    assert.ok(Number.isFinite(Date.parse(item.ts)));
  }
});

test('D1: EventBus comunica los cuatro eventos estandarizados hacia la telemetría y persistencia', () => {
  const bus = new EventBus();
  const telemetry = new Telemetry({ proyecto_id: 'submarino-bus-test' });
  const registrados = [];

  const registrar = (evento, detail) => {
    telemetry.event(evento, { proyecto_id: 'submarino-bus-test', ...detail });
    registrados.push({ evento, detail });
  };

  bus.on('matematicas_intento', (d) => registrar('matematicas_intento', d));
  bus.on('ciencia_intento', (d) => registrar('ciencia_intento', d));
  bus.on('objeto_colocado', (d) => registrar('objeto_colocado', d));
  bus.on('object_colocado', (d) => registrar('objeto_colocado', d)); // retrocompatibilidad
  bus.on('programa_ejecutado', (d) => registrar('programa_ejecutado', d));

  bus.emit('matematicas_intento', { rho: 1025, h: 50, exito: true });
  bus.emit('ciencia_intento', { rho: 1025, volumenM3: 3, exito: true });
  bus.emit('objeto_colocado', { slotId: 'bateria', partId: 'bat-ion-litio' });
  bus.emit('object_colocado', { slotId: 'sonar', partId: 'sonar-activo' });
  bus.emit('programa_ejecutado', { ordenado: true, exito: true });

  assert.equal(registrados.length, 5);
  assert.equal(registrados[0].evento, 'matematicas_intento');
  assert.equal(registrados[1].evento, 'ciencia_intento');
  assert.equal(registrados[2].evento, 'objeto_colocado');
  assert.equal(registrados[3].evento, 'objeto_colocado');
  assert.equal(registrados[4].evento, 'programa_ejecutado');

  assert.equal(telemetry.buffer.length, 5);
  assert.equal(telemetry.buffer[0].evento, 'matematicas_intento');
  assert.equal(telemetry.buffer[1].evento, 'ciencia_intento');
  assert.equal(telemetry.buffer[2].evento, 'objeto_colocado');
  assert.equal(telemetry.buffer[3].evento, 'objeto_colocado');
  assert.equal(telemetry.buffer[4].evento, 'programa_ejecutado');
});
