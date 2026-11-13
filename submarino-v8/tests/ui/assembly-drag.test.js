import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('el catálogo de ensamblaje conserva 120 piezas en sus 15 categorías', async () => {
  const data = JSON.parse(await read('../../data/parts.json'));
  assert.equal(data.tipos.length, 15);
  assert.equal(data.piezas.length, 120);
  for (const tipo of data.tipos) assert.equal(data.piezas.filter(p => p.tipo === tipo).length, 8, tipo);
});

test('la pantalla conecta arrastre de catálogo, piezas instaladas y zona 3D', async () => {
  const screen = await read('../../src/modules/ui/screens/AssemblyScreen.js');
  assert.match(screen, /draggable:\s*true/);
  assert.match(screen, /ondragstart:\s*\(e\)\s*=>\s*iniciarArrastre/);
  assert.match(screen, /setDragImage\(img/);
  assert.match(screen, /sourceSlotId/);
  assert.match(screen, /addEventListener\('dragover',\s*permitirSoltar\)/);
  assert.match(screen, /addEventListener\('drop',\s*alSoltar\)/);
});

test('el helper serializa draggable como atributo enumerado true/false', async () => {
  const dom = await read('../../src/modules/ui/dom.js');
  assert.match(dom, /k === 'draggable'.*setAttribute\(k, v === true \|\| v === 'true' \? 'true' : 'false'\)/);
});
