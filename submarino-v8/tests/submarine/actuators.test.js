import test from 'node:test';
import assert from 'node:assert/strict';
import { Ballast } from '../../src/modules/submarine/Ballast.js';
import { Battery } from '../../src/modules/submarine/Battery.js';

test('el lastre limita el llenado entre 0 y 1', () => {
  const b = new Ballast(0.2, 0.1, 50);
  b.step(10, 1, true);
  assert.equal(b.fill, 1);
  b.step(10, -1, true);
  assert.equal(b.fill, 0);
});

test('el lastre ignora comandos y tiempos inválidos sin contaminar el estado', () => {
  const b = new Ballast(0.2, 0.1, 50);
  b.step(Number.NaN, 1, true);
  b.step(1, Number.NaN, true);
  assert.equal(b.fill, 0);
  assert.ok(Number.isFinite(b.fill));
});

test('soplar lastre de emergencia no requiere energía y solo vacía', () => {
  const b = new Ballast(1, 0.1, 50);
  b.fill = 0.8;
  assert.equal(b.step(1, 1, false, true), 0);
  assert.ok(b.fill < 0.8);
});

test('la batería se descarga con potencia positiva y no se carga con valores negativos', () => {
  const b = new Battery(100, 0, 20, true);
  b.drain(360, 10);
  assert.equal(b.energyWh, 99);
  b.drain(-3600, 60);
  assert.equal(b.energyWh, 99);
});

test('la batería nunca cae por debajo de cero ni acepta dt inválido', () => {
  const b = new Battery(1, 0, 20, true);
  b.drain(100000, 3600);
  assert.equal(b.energyWh, 0);
  b.drain(100, Number.NaN);
  assert.equal(b.energyWh, 0);
});
