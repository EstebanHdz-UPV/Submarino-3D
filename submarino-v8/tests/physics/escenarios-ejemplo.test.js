// F4: regresión de extremo a extremo. El diseño de ejemplo debe aprobar los siete escenarios automáticos
// (docs/FISICA.md, "Verificación realizada con el diseño de ejemplo") también después de ajustar constantes (F2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { ejecutarPrueba } from '../../src/modules/trials/TrialRunner.js';

const L = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const parts = L('../../data/parts.json'), world = L('../../data/physics.json');
const assembly = new Assembly(new PartsCatalog(parts.piezas, L('../../data/materials.json').materiales, parts.tipos), L('../../data/assembly-rules.json'));
assert.deepEqual(assembly.load(L('../../data/designs/ejemplo.json')), []);

const AUTOMATICOS = ['flotabilidad', 'inmersion', 'profundidad', 'maniobra', 'autonomia', 'corriente', 'emergencia'];

for (const id of AUTOMATICOS) {
  test(`F4: el diseño de ejemplo aprueba el escenario "${id}"`, async () => {
    const escenario = L('../../data/scenarios.json').escenarios.find((e) => e.id === id);
    assert.ok(escenario, `falta el escenario ${id}`);
    const r = await ejecutarPrueba({ assembly, world, escenario, cond: { ...(escenario.condiciones ?? {}) } });
    const fallidos = r.dictamen?.checks.filter((c) => !c.ok).map((c) => `${c.texto}: ${c.detalle}`) ?? [r.error];
    assert.equal(r.dictamen?.aprobado, true, fallidos.join(' | '));
  });
}
