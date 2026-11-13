// E3: calcularObjetivos() debe leer los objetivos de manifest.json (no de data/objectives.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Telemetria } from '../../src/core/telemetria.js';
import { calcularObjetivos, generarPuntajes, Evaluacion, DIMENSIONES_STEAM } from '../../src/core/evaluacion.js';

const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));
const informeCon = (p) => ({ dimensiones: Object.fromEntries(DIMENSIONES_STEAM.map((d) => [d, { puntaje: p[d] ?? 0 }])) });

test('E3: el manifest declara objetivos evaluables con dimensiones STEAM válidas', () => {
  assert.ok(Array.isArray(manifest.objetivos_evaluables) && manifest.objetivos_evaluables.length >= 5);
  const cubiertas = new Set();
  for (const o of manifest.objetivos_evaluables) {
    assert.match(o.id, /^OE-\d{2}$/);
    assert.ok(o.objetivo && o.indicador && o.evidencia, `${o.id} incompleto`);
    assert.ok(o.dimensiones.every((d) => DIMENSIONES_STEAM.includes(d)), `${o.id} con dimensión desconocida`);
    o.dimensiones.forEach((d) => cubiertas.add(d));
  }
  assert.deepEqual([...cubiertas].sort(), [...DIMENSIONES_STEAM].sort(), 'cada dimensión debe tener al menos un objetivo');
});

test('E3: calcularObjetivos devuelve un resultado por cada objetivo del manifest, en el mismo orden', () => {
  const r = calcularObjetivos(manifest, informeCon({ M: 90, S: 80, E: 100, T: 60, A: 75 }));
  assert.deepEqual(r.map((o) => o.id), manifest.objetivos_evaluables.map((o) => o.id));
  assert.equal(r[0].objetivo, manifest.objetivos_evaluables[0].objetivo); // el texto viene del manifest
});

test('E3: aplica la regla de cada objetivo (mínimo para OE-01, promedio para los demás) y el umbral', () => {
  const r = Object.fromEntries(calcularObjetivos(manifest, informeCon({ M: 90, S: 80, E: 100, T: 60, A: 75 })).map((o) => [o.id, o]));
  assert.equal(r['OE-01'].puntaje, 60);          // mínimo de las cinco dimensiones
  assert.equal(r['OE-01'].logrado, false);
  assert.deepEqual(r['OE-01'].faltan, ['T']);
  assert.equal(r['OE-02'].puntaje, 85);          // promedio de M y S
  assert.equal(r['OE-02'].logrado, true);
  assert.equal(r['OE-04'].estado, 'en_proceso'); // 60: entre 50 y 70
  assert.equal(r['OE-05'].nivel, 'Bueno');
});

test('E3: si el manifest cambia, cambian los objetivos (no hay lista fija en el código)', () => {
  const propio = { objetivos_evaluables: [{ id: 'OE-99', objetivo: 'Prueba', indicador: 'x', evidencia: 'y', dimensiones: ['A'], umbral: 40 }] };
  const [o] = calcularObjetivos(propio, informeCon({ A: 45 }));
  assert.equal(o.id, 'OE-99');
  assert.equal(o.logrado, true);
  assert.deepEqual(calcularObjetivos({}, informeCon({})), []);
  assert.deepEqual(calcularObjetivos(null, null), []);
});

test('E3: la fase completada en avance_rutas se reporta como evidencia', () => {
  const r = calcularObjetivos(manifest, informeCon({ M: 80, S: 80 }), { avance: { completadas: ['M'] } });
  assert.deepEqual(r.find((o) => o.id === 'OE-02').fasesCompletadas, ['M']);
});

test('E3: generarPuntajes incluye los objetivos cuando recibe el manifest (conexión con telemetría)', () => {
  const t = new Telemetria({ proyecto_id: manifest.proyecto_id, intervalMs: 10 });
  t.matematicasIntento({ presionPa: 301725, exito: true });
  t.cienciaIntento({ exito: true });
  ['casco', 'propulsion', 'lastre', 'bateria', 'controles'].forEach((slotId) => t.objetoColocado({ slotId }));
  const informe = generarPuntajes(t, { manifest });
  assert.equal(informe.objetivos.length, manifest.objetivos_evaluables.length);
  assert.equal(informe.objetivos.find((o) => o.id === 'OE-03').puntaje, informe.dimensiones.E.puntaje);
  const ev = new Evaluacion(t, { manifest });
  assert.equal(ev.calcularObjetivos().length, manifest.objetivos_evaluables.length);
});
