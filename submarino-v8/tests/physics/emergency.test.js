import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { PhysicsModule } from '../../src/modules/physics/PhysicsModule.js';
import { pilotoDe, programarEventos } from '../../src/modules/trials/Scenarios.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [worldData, partsData, materialsData, rules, example, scenarios] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json'), load('../../data/scenarios.json')
]);
const escenario = scenarios.escenarios.find((e) => e.id === 'emergencia');
const world = { ...worldData, pasoFijoS: 1 / 60, dtMaxS: 0.1 };
const catalog = new PartsCatalog(partsData.piezas, materialsData.materiales, partsData.tipos);
const assembly = new Assembly(catalog, rules);
assert.deepEqual(assembly.load(example), []);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0, corrienteDirRad: Math.PI };
const stats = assembly.stats(world, env);

function makePhys() {
  const phys = new PhysicsModule(world, env, stats, { startDepthM: 8 });
  phys.ballast.fill = Math.min(1, Math.max(0, phys.neutralFill() ?? 0));
  return phys;
}

/** Igual que TrialRunner: eventos programados primero, luego el piloto, luego el paso físico. */
function simular(segundos) {
  const phys = makePhys();
  const pilot = pilotoDe('emergencia', { profundidadM: 8 });
  const aplicarEventos = programarEventos(escenario.eventos);
  for (let i = 0; i < segundos * 60; i++) { aplicarEventos(phys); phys.step(1 / 60, pilot(phys, phys.t)); }
  return phys;
}

test('el escenario de emergencia define sus eventos en los datos', () => {
  assert.deepEqual(escenario.eventos.map((e) => e.accion), ['falla-energia', 'soltar-pesos']);
});

test('la emergencia no se dispara antes del tiempo programado', () => {
  const phys = simular(29);
  assert.equal(phys.events.some((e) => e.tipo === 'falla-energia'), false);
  assert.equal(phys.pesosSoltados, false);
  assert.equal(phys.fallaEnergia, false);
});

test('la falla de energía ocurre una sola vez y libera pesos', () => {
  const phys = simular(32);
  assert.equal(phys.events.filter((e) => e.tipo === 'falla-energia').length, 1);
  assert.equal(phys.events.filter((e) => e.tipo === 'pesos-soltados').length, 1);
  assert.equal(phys.pesosSoltados, true);
  assert.ok(phys.events.some((e) => e.tipo === 'energia-agotada'));
  const state = phys.snapshot();
  for (const key of ['depthM', 'speedMs', 'pressureAtm', 'massKg', 'soc']) assert.ok(Number.isFinite(state[key]), `${key} debe ser finito`);
});

test('el piloto solo devuelve órdenes: no modifica la física', () => {
  const phys = makePhys();
  phys.inject('falla-energia');
  const antes = JSON.stringify({ e: phys.battery.energyWh, ev: phys.events, p: phys.pesosSoltados });
  const inp = pilotoDe('emergencia', { profundidadM: 8 })(phys, 100);
  assert.equal(inp.blow, true);
  assert.equal(JSON.stringify({ e: phys.battery.energyWh, ev: phys.events, p: phys.pesosSoltados }), antes);
});

test('inject rechaza acciones desconocidas y programarEventos aplica cada evento una vez', () => {
  const phys = makePhys();
  assert.throws(() => phys.inject('explotar'), RangeError);
  const aplicar = programarEventos([{ t: 0, accion: 'soltar-pesos' }]);
  aplicar(phys); aplicar(phys);
  assert.equal(phys.events.filter((e) => e.tipo === 'pesos-soltados').length, 1);
});
