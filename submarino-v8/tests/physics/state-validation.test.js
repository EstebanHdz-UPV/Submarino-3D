import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { PhysicsModule } from '../../src/modules/physics/PhysicsModule.js';
import { validarEstadoFisico } from '../../src/modules/trials/StateValidation.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [world, parts, materials, rules, design] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const catalog = new PartsCatalog(parts.piezas, materials.materiales, parts.tipos);
const assembly = new Assembly(catalog, rules);
assert.deepEqual(assembly.load(design), []);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0, corrienteDirRad: Math.PI };
const stats = assembly.stats(world, env);

test('snapshot inicial y estados de navegación cumplen invariantes físicos básicos', () => {
  const sim = new PhysicsModule({ ...world, pasoFijoS: 1 / 60 }, env, stats, { startDepthM: 8 });
  for (let i = 0; i < 1800; i++) {
    const state = sim.step(1 / 60, { throttle: 0.45, rudder: i > 600 ? 0.3 : 0, ballastTarget: 0.15 });
    const result = validarEstadoFisico(state);
    assert.equal(result.ok, true, `t=${state.t}: ${result.errors.join('; ')}`);
  }
});

test('diagnóstico acumula campos no finitos y límites excedidos', () => {
  const result = validarEstadoFisico({
    t: 1, depthM: 20, speedMs: 4, forwardMs: 1, headingDeg: 0, pitchDeg: 35, rollDeg: 0,
    pressureAtm: 2, powerW: 100, energyWh: 50, soc: 0.5, massKg: 10, ballastFill: 0.4,
    ballastKg: 2, floodKg: 0, pos: [0, 0, 1]
  }, { maxDepthM: 10, maxSpeedMs: 3, maxPitchDeg: 20 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('profundidad')));
  assert.ok(result.errors.some((e) => e.includes('velocidad')));
  assert.ok(result.errors.some((e) => e.includes('cabeceo')));
});

test('diagnóstico rechaza snapshots ausentes o con energía fuera de rango', () => {
  assert.equal(validarEstadoFisico(null).ok, false);
  const result = validarEstadoFisico({ t: 0, depthM: 0, speedMs: 0, forwardMs: 0, headingDeg: 0, pitchDeg: 0, rollDeg: 0, pressureAtm: 1, powerW: 0, energyWh: 0, soc: 1.2, massKg: 1, ballastFill: 0, ballastKg: 0, floodKg: 0, pos: [0, 0, 0] });
  assert.ok(result.errors.some((e) => e.includes('carga')));
});
