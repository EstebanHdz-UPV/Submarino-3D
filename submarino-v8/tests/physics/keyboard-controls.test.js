import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlsModule } from '../../src/modules/controls/ControlsModule.js';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { PhysicsModule } from '../../src/modules/physics/PhysicsModule.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [worldData, partsData, materialsData, rules, example] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const world = { ...worldData, pasoFijoS: 1 / 60, dtMaxS: 0.1 };
const catalog = new PartsCatalog(partsData.piezas, materialsData.materiales, partsData.tipos);
const assembly = new Assembly(catalog, rules);
assert.deepEqual(assembly.load(example), []);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0, corrienteDirRad: 0 };
const stats = assembly.stats(world, env);

test('W aumenta el empuje y el indicador de estado identifica las teclas activas', () => {
  const controls = new ControlsModule({ emit() {} });
  controls.keys.add('KeyW');
  const first = controls.read(1 / 60);
  assert.ok(first.throttle > 0);
  assert.deepEqual(controls.estado().teclas, ['W']);
  controls.keys.add('KeyD');
  assert.equal(controls.read(1 / 60).rudder, 1);
  assert.deepEqual(controls.estado().teclas, ['W', 'D']);
  controls.keys.clear();
  assert.deepEqual(controls.estado().teclas, []);
});

test('W produce desplazamiento observable en la simulación física en 8 segundos', () => {
  const controls = new ControlsModule({ emit() {} });
  const phys = new PhysicsModule(world, env, stats, { startDepthM: 5, fill: 0 });
  controls.keys.add('KeyW');
  for (let i = 0; i < 480; i++) phys.step(1 / 60, controls.read(1 / 60));
  assert.ok(phys.distanceM > 0.5, `desplazamiento demasiado pequeño: ${phys.distanceM} m`);
  assert.ok(phys.snapshot().speedMs > 0.1, `velocidad demasiado pequeña: ${phys.snapshot().speedMs} m/s`);
});

test('A y D generan órdenes de timón opuestas y S reduce el empuje', () => {
  const controls = new ControlsModule({ emit() {} });
  controls.prop.lever = 0.5;
  controls.keys.add('KeyA');
  assert.equal(controls.read(1 / 60).rudder, -1);
  controls.keys.delete('KeyA'); controls.keys.add('KeyD');
  assert.equal(controls.read(1 / 60).rudder, 1);
  controls.keys.delete('KeyD'); controls.keys.add('KeyS');
  assert.ok(controls.read(0.5).throttle < 0.5);
});
