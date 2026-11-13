// F3: data/rubrics.json es la rúbrica oficial y evaluacion.js califica con ella.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pesosDesdeRubrica, NIVELES_DESEMPENO, PESOS_STEAM_DEFECTO, DIMENSIONES_STEAM, evaluarTelemetria } from '../../src/core/evaluacion.js';

const rubrica = JSON.parse(readFileSync(new URL('../../data/rubrics.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));

test('F3: la rúbrica ya no es la plantilla y cubre las cinco dimensiones con pesos que suman 100', () => {
  assert.equal(rubrica.estado, 'oficial');
  assert.ok(!('_nota' in rubrica) && !/sustituir por la rúbrica oficial/i.test(JSON.stringify(rubrica)), 'ya no lleva la nota de plantilla');
  assert.deepEqual(rubrica.criterios.map((c) => c.dimension).sort(), [...DIMENSIONES_STEAM].sort());
  assert.equal(rubrica.criterios.reduce((a, c) => a + c.peso, 0), 100);
});

test('F3: cada criterio tiene descriptor para los cuatro niveles, evidencia y objetivos que existen en el manifest', () => {
  const ids = new Set(manifest.objetivos_evaluables.map((o) => o.id));
  for (const c of rubrica.criterios) {
    for (const n of ['1', '2', '3', '4']) assert.ok(c.descriptores[n]?.length > 10, `${c.id} nivel ${n}`);
    assert.ok(c.evidencia, c.id);
    assert.ok(c.objetivos.length && c.objetivos.every((o) => ids.has(o)), `${c.id}: objetivos ${c.objetivos}`);
  }
});

test('F3: los umbrales de la rúbrica son los mismos que usa determinarNivel', () => {
  const porNombre = Object.fromEntries(rubrica.niveles.map((n) => [n.nombre, n.minimo]));
  for (const n of Object.values(NIVELES_DESEMPENO)) assert.equal(porNombre[n.nombre], n.minimo, n.nombre);
});

test('F3: pesosDesdeRubrica toma los pesos del JSON y cambia la calificación si el JSON cambia', () => {
  assert.deepEqual(pesosDesdeRubrica(rubrica), { M: 0.2, S: 0.2, E: 0.25, T: 0.2, A: 0.15 });
  const buffer = [{ evento: 'objeto_colocado', slotId: 'a' }, { evento: 'objeto_colocado', slotId: 'b' }, { evento: 'objeto_colocado', slotId: 'c' },
    { evento: 'objeto_colocado', slotId: 'd' }, { evento: 'objeto_colocado', slotId: 'e' }];
  const soloIngenieria = { criterios: DIMENSIONES_STEAM.map((d) => ({ dimension: d, peso: d === 'E' ? 100 : 0 })) };
  assert.equal(evaluarTelemetria(buffer, { pesos: pesosDesdeRubrica(soloIngenieria) }).puntajeGlobal, 100);
  assert.notEqual(evaluarTelemetria(buffer, { pesos: pesosDesdeRubrica(rubrica) }).puntajeGlobal, 100);
});

test('F3: una rúbrica incompleta o mal sumada no rompe la evaluación (usa los pesos por defecto)', () => {
  assert.deepEqual(pesosDesdeRubrica(null), { ...PESOS_STEAM_DEFECTO });
  assert.deepEqual(pesosDesdeRubrica({ criterios: [{ dimension: 'M', peso: 50 }] }), { ...PESOS_STEAM_DEFECTO });
});
