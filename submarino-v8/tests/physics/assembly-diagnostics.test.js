import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { PhysicsModule } from '../../src/modules/physics/PhysicsModule.js';
import { diagnosticarEnsamblaje, ejecutarPruebaFisica } from '../../src/modules/submarine/AssemblyDiagnostics.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [world, parts, materials, rules, design] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const catalog = new PartsCatalog(parts.piezas, materials.materiales, parts.tipos);
const assembly = new Assembly(catalog, rules);
assert.deepEqual(assembly.load(design), []);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0 };

test('diagnóstico del ensamblaje devuelve estado y métricas interpretables', () => {
  const result = diagnosticarEnsamblaje(assembly.stats(world, env));
  assert.ok(['seguro', 'precaucion', 'peligro', 'bloqueado'].includes(result.nivel));
  assert.ok(Array.isArray(result.alertas));
  assert.ok(Number.isFinite(result.gmLongM) && Number.isFinite(result.gmTransM));
});

test('la prueba física nominal y la prueba con fuga son reproducibles y registran agua', () => {
  const stats = assembly.stats(world, env);
  const nominal = ejecutarPruebaFisica(PhysicsModule, world, env, stats, { fallas: false, segundos: 2 });
  const fallo = ejecutarPruebaFisica(PhysicsModule, world, env, stats, { fallas: true, segundos: 2 });
  assert.ok(Math.abs(nominal.segundos - 2) < 1e-9);
  assert.ok(Math.abs(fallo.segundos - 2) < 1e-9);
  assert.ok(fallo.inundacionKg > nominal.inundacionKg);
  assert.ok(Number.isFinite(fallo.rollDeg) && Number.isFinite(fallo.pitchDeg));
});


test('el catálogo declara propiedades físicas individuales en las 120 variantes', async () => {
  assert.equal(parts.piezas.length, 120);
  for (const part of parts.piezas) {
    assert.ok(part.propiedadesFisicas, part.id);
    assert.ok(Number.isFinite(part.propiedadesFisicas.volumenDesplazadoM3), part.id);
    assert.ok(Number.isFinite(part.propiedadesFisicas.masaSecaKg), part.id);
  }
});

test('un margen metacéntrico negativo genera alerta de pérdida de estabilidad', () => {
  const stats = assembly.stats(world, env);
  const diagnostic = diagnosticarEnsamblaje({ ...stats, gmTransM: -0.2 });
  assert.equal(diagnostic.nivel, 'peligro');
  assert.ok(diagnostic.alertas.some(x => /estabilidad/i.test(x)));
});
