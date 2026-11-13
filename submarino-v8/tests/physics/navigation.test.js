import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { PhysicsModule } from '../../src/modules/physics/PhysicsModule.js';
import { mantenerProfundidad, mantenerRumbo, mantenerVelocidad, pilotoDe } from '../../src/modules/trials/Scenarios.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [worldData, partsData, materialsData, rules, example] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const world = { ...worldData, pasoFijoS: 1 / 60, dtMaxS: 0.1 };
const catalog = new PartsCatalog(partsData.piezas, materialsData.materiales, partsData.tipos);
const assembly = new Assembly(catalog, rules);
assert.deepEqual(assembly.load(example), []);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0, corrienteDirRad: Math.PI };
const stats = assembly.stats(world, env);

function makePhys(startDepthM = 8) {
  return new PhysicsModule(world, env, stats, { startDepthM, fill: 0 });
}

test('controladores de navegación producen órdenes finitas y acotadas', () => {
  const phys = makePhys();
  for (const input of [
    mantenerProfundidad(phys, 10), mantenerRumbo(phys, Math.PI / 2), mantenerVelocidad(phys, 1.5),
    pilotoDe('maniobra', { profundidadM: 10, velocidadNudos: 2 })(phys, 0),
    pilotoDe('corriente', { profundidadM: 10 })(phys, 0)
  ]) {
    for (const value of Object.values(input)) assert.ok(Number.isFinite(value), `orden no finita: ${JSON.stringify(input)}`);
    for (const key of ['throttle', 'rudder', 'ballastCmd', 'ballastTarget']) {
      if (key in input) assert.ok(input[key] >= (key === 'ballastTarget' ? 0 : -1) && input[key] <= 1, `${key} fuera de rango`);
    }
  }
});

test('simulación de navegación mantiene estado finito durante 60 segundos', () => {
  const phys = makePhys(8);
  const pilot = pilotoDe('autonomia', { profundidadM: 8, velocidadNudos: 1.5 });
  for (let i = 0; i < 3600; i++) {
    const state = phys.step(1 / 60, pilot(phys, phys.t));
    for (const key of ['depthM', 'speedMs', 'forwardMs', 'headingDeg', 'pitchDeg', 'rollDeg', 'pressureAtm', 'powerW', 'massKg', 'soc']) {
      assert.ok(Number.isFinite(state[key]), `${key} dejó de ser finito en t=${state.t}`);
    }
    assert.ok(state.ballastFill >= 0 && state.ballastFill <= 1);
    assert.ok(state.soc >= 0 && state.soc <= 1);
    if (state.colapsado) break;
  }
  assert.ok(phys.t > 0);
});

test('la orden de timón y el acelerador afectan al estado sin romper límites', () => {
  const phys = makePhys(5);
  for (let i = 0; i < 300; i++) phys.step(1 / 60, { throttle: 0.7, rudder: 0.8, ballastTarget: 0.2 });
  const state = phys.snapshot();
  assert.ok(state.speedMs > 0, 'el acelerador debe generar movimiento');
  assert.ok(Number.isFinite(state.headingDeg));
  assert.ok(Math.abs(state.headingDeg) > 5, 'el timón debe producir un cambio observable de rumbo');
  assert.ok(state.ballastFill >= 0 && state.ballastFill <= 1);
  assert.ok(phys.omega.every(Number.isFinite));
});

test('la maniobra de emergencia libera pesos una sola vez y registra el evento', () => {
  const phys = makePhys(8);
  phys.releaseWeights();
  phys.releaseWeights();
  assert.equal(phys.pesosSoltados, true);
  assert.equal(phys.events.filter((event) => event.tipo === 'pesos-soltados').length, 1);
});
