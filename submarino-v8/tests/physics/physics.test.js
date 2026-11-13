import test from 'node:test';
import assert from 'node:assert/strict';
import { peso, empuje, fraccionSumergida, llenadoNeutro } from '../../src/modules/physics/Buoyancy.js';
import { arrastre } from '../../src/modules/physics/Drag.js';
import { presionManometricaPa, presionAbsolutaPa, densidadAgua } from '../../src/modules/physics/Pressure.js';
import { readFile } from 'node:fs/promises';

const world = JSON.parse(await readFile(new URL('../../data/physics.json', import.meta.url), 'utf8'));
const env = { tipoAgua: 'mar', temperaturaC: 20 };

test('peso y empuje usan unidades SI', () => {
  assert.ok(Math.abs(peso(10, 9.81) - 98.1) < 1e-9);
  assert.equal(empuje(1000, 10, 2, 0.5), 10000);
});

test('fracción sumergida está limitada y maneja altura inválida', () => {
  assert.equal(fraccionSumergida(-2, 1), 0);
  assert.equal(fraccionSumergida(0, 1), 0.5);
  assert.equal(fraccionSumergida(2, 1), 1);
  assert.equal(fraccionSumergida(1, 0), 1);
  assert.equal(fraccionSumergida(-1, 0), 0);
});

test('el arrastre se opone al sentido de la velocidad', () => {
  assert.ok(arrastre(1025, 1.2, 3) < 0);
  assert.ok(arrastre(1025, 1.2, -3) > 0);
  assert.ok(Math.abs(arrastre(1025, 1.2, 0)) < 1e-12);
});

test('presión manométrica es cero en superficie y aumenta con profundidad', () => {
  assert.equal(presionManometricaPa(world, env, 0), 0);
  const p10 = presionManometricaPa(world, env, 10);
  assert.ok(p10 > 100000 && p10 < 105000, `presión a 10 m fuera de rango: ${p10}`);
  assert.ok(presionManometricaPa(world, env, 100) > p10);
  assert.ok(presionAbsolutaPa(world, env, 10) > p10);
});

test('densidad del agua y llenado neutro devuelven resultados finitos cuando son calculables', () => {
  assert.ok(Number.isFinite(densidadAgua(world, env, 50)));
  assert.ok(densidadAgua(world, env, 50) > 900);
  assert.equal(llenadoNeutro({ rho: 1000, volumenEnvolventeM3: 1, masaTotalSinLastreKg: 900, tanqueM3: 0.2 }), 0.5);
  assert.equal(llenadoNeutro({ rho: 1000, volumenEnvolventeM3: 1, masaTotalSinLastreKg: 900, tanqueM3: 0 }), null);
});

test('presión inversa recupera la profundidad de referencia', async () => {
  const { profundidadDesdePresion } = await import('../../src/modules/physics/Pressure.js');
  for (const depth of [1, 10, 100, 500]) {
    const pressure = presionManometricaPa(world, env, depth);
    assert.ok(Math.abs(profundidadDesdePresion(world, env, pressure) - depth) < 1e-5);
  }
  assert.equal(profundidadDesdePresion(world, env, NaN), 0);
});

test('presión y densidad manejan profundidad no finita de forma segura', () => {
  assert.equal(presionManometricaPa(world, env, NaN), 0);
  assert.equal(presionManometricaPa(world, env, Infinity), 0);
  assert.ok(Number.isFinite(densidadAgua(world, env, NaN)));
});

test('la presión crítica rechaza geometría o material inválidos', async () => {
  const { presionesCriticasPa } = await import('../../src/modules/physics/HullStress.js');
  assert.throws(() => presionesCriticasPa({ forma: 'cilindro', radioM: 0, espesorM: 0.02, largoM: 2 }, { moduloGPa: 200, poisson: 0.3, limiteElasticoMPa: 500 }, world), RangeError);
  assert.throws(() => presionesCriticasPa({ forma: 'cilindro', radioM: 0.5, espesorM: 0.02, largoM: 2 }, { moduloGPa: 200, poisson: 0.8, limiteElasticoMPa: 500 }, world), RangeError);
});

test('la masa efectiva siempre es positiva para parámetros físicos válidos', async () => {
  const { masaEfectiva } = await import('../../src/modules/physics/AddedMass.js');
  const result = masaEfectiva(100, 1025, 0.5, world.masaAnadida);
  assert.ok(result.avance >= 100 && result.lateral >= result.avance && result.vertical >= result.avance);
  assert.throws(() => masaEfectiva(-1, 1025, 0.5, world.masaAnadida), RangeError);
});
