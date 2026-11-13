// E1/E2: migraciones del Core (tablas proyectos y rutas_aprendizaje) y tarjeta del catálogo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ejecutarMigraciones, MIGRACIONES, RAIZ_PROYECTO, AlmacenJSON } from '../../server/migraciones.js';
import { tarjetaProyecto } from '../../src/proyectos.js';

const conTmp = async (fn) => {
  const dir = await mkdtemp(join(tmpdir(), 'catalogo-'));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
};

test('E1: las migraciones crean proyectos y rutas_aprendizaje y registran el submarino', () => conTmp(async (dir) => {
  const r = await ejecutarMigraciones({ dir });
  assert.deepEqual(r.aplicadas, MIGRACIONES.map((m) => m.id));
  const db = new AlmacenJSON(dir);
  const [p] = await db.seleccionar('proyectos');
  assert.equal(p.id, 'submarino-exploracion-3d');
  assert.equal(p.activo, true);
  assert.ok(existsSync(join(RAIZ_PROYECTO, p.portada)), 'la portada declarada debe existir');
  assert.equal(p.objetivos.length, 5);
  const rutas = (await db.seleccionar('rutas_aprendizaje')).sort((a, b) => a.orden - b.orden);
  assert.deepEqual(rutas.map((x) => x.fase), ['M', 'S', 'E', 'T', 'A']);
  assert.deepEqual(rutas.map((x) => x.requisito), [null, 'M', 'S', 'E', 'T']);
  assert.deepEqual(rutas.map((x) => x.evento_validacion), ['matematicas_intento', 'ciencia_intento', 'objeto_colocado', 'programa_ejecutado', 'biomimetica_completada']);
  assert.ok(rutas.every((x) => x.proyecto_id === p.id));
}));

test('E1: volver a ejecutar no repite migraciones ni duplica filas', () => conTmp(async (dir) => {
  await ejecutarMigraciones({ dir });
  const r2 = await ejecutarMigraciones({ dir });
  assert.equal(r2.aplicadas.length, 0);
  const db = new AlmacenJSON(dir);
  assert.equal((await db.seleccionar('proyectos')).length, 1);
  assert.equal((await db.seleccionar('rutas_aprendizaje')).length, 5);
  const registro = JSON.parse(await readFile(join(dir, '_migraciones.json'), 'utf8'));
  assert.equal(registro.aplicadas.length, MIGRACIONES.length);
}));

test('E1: cada migración trae su SQL y la tabla rechaza columnas no declaradas', () => conTmp(async (dir) => {
  for (const m of MIGRACIONES) assert.ok(m.sql && m.descripcion, m.id);
  assert.match(MIGRACIONES[0].sql, /CREATE TABLE IF NOT EXISTS proyectos/);
  assert.match(MIGRACIONES[1].sql, /CREATE TABLE IF NOT EXISTS rutas_aprendizaje/);
  await ejecutarMigraciones({ dir });
  await assert.rejects(new AlmacenJSON(dir).upsert('proyectos', { id: 'x', columna_inventada: 1 }), /Columnas desconocidas/);
}));

test('E2: la tarjeta del catálogo se marca activa, enlaza al proyecto y escapa el texto', () => {
  const html = tarjetaProyecto({ id: 'p', slug: 'p', nombre: '<b>Sub</b>', version: '1', activo: true, url: 'index.html#/proyecto', portada: 'a.png', mapeo_steam: { M: 'x', S: 'y' }, objetivos: [1, 2], modulos: 6 },
    [{ titulo: 'Fase M' }]);
  assert.match(html, /class="tarjeta activa"/);
  assert.match(html, /href="index.html#\/proyecto"/);
  assert.match(html, /&lt;b&gt;Sub&lt;\/b&gt;/);
  assert.match(html, /<li>Fase M<\/li>/);
});
