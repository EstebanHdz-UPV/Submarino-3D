import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [parts, materials, rules, design] = await Promise.all([
  load('../../data/parts.json'), load('../../data/materials.json'), load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const catalog = new PartsCatalog(parts.piezas, materials.materiales, parts.tipos);
const nuevo = () => new Assembly(catalog, rules);

test('place rechaza punto de montaje o pieza desconocidos', () => {
  const a = nuevo();
  assert.equal(a.place('no-existe', 'casco-cilindro-corto').ok, false);
  assert.equal(a.place('casco', 'no-existe').ok, false);
  assert.deepEqual(a.piezas, {});
});

test('place rechaza una pieza de otro tipo', () => {
  const a = nuevo();
  const r = a.place('casco', design.piezas.bateria.partId);
  assert.equal(r.ok, false);
  assert.match(r.error, /tipo/);
  assert.equal(a.get('casco'), null);
});

test('el casco rechaza materiales no permitidos y usa el material por defecto', () => {
  const a = nuevo(), id = design.piezas.casco.partId, pieza = catalog.part(id);
  assert.equal(a.place('casco', id, 'material-inexistente').ok, false);
  assert.equal(a.place('casco', id).ok, true);
  assert.equal(a.get('casco').material.id, pieza.materialPorDefecto);
});

test('get devuelve pieza y material; remove y clear vacían', () => {
  const a = nuevo();
  assert.deepEqual(a.load(design), []);
  assert.equal(a.get('casco').part.id, design.piezas.casco.partId);
  a.remove('casco');
  assert.equal(a.get('casco'), null);
  a.clear();
  assert.deepEqual(a.piezas, {});
});

test('toJSON y load son inversos', () => {
  const a = nuevo(); a.load(design);
  const b = nuevo();
  assert.deepEqual(b.load(a.toJSON('copia')), []);
  assert.deepEqual(b.piezas, a.piezas);
  assert.equal(a.toJSON('x').version, 1);
});

test('load informa los errores y carga lo que sí es válido', () => {
  const a = nuevo();
  const errs = a.load({ piezas: { casco: design.piezas.casco, bateria: { partId: 'zzz' }, fantasma: { partId: 'x' } } });
  assert.equal(errs.length, 2);
  assert.ok(a.get('casco'));
  assert.equal(a.get('bateria'), null);
});

test('load con datos vacíos deja el ensamble vacío', () => {
  const a = nuevo(); a.load(design);
  assert.deepEqual(a.load({}), []);
  assert.deepEqual(a.piezas, {});
});

test('cada categoría del catálogo tiene al menos ocho variantes gráficas disponibles', () => {
  for (const tipo of parts.tipos) {
    assert.ok(catalog.byTipo(tipo).length >= 8, `${tipo} debe tener al menos 8 variantes`);
    for (const pieza of catalog.byTipo(tipo)) assert.ok(pieza.archivo, `${pieza.id} debe tener modelo 3D`);
  }
});

test('los límites de montaje impiden añadir cascos o motores ilimitados', () => {
  const a = nuevo();
  const maxCascos = a.slots.filter(s => s.tipo === 'casco').length;
  const maxMotores = a.slots.filter(s => s.tipo === 'propulsion').length;
  assert.equal(maxCascos, 1);
  assert.equal(maxMotores, 2);
  assert.equal(a.place('casco', 'casco-cilindro-corto').ok, true);
  assert.equal(a.place('propulsion', 'prop-pequeno').ok, true);
  assert.equal(a.place('propulsion_aux', 'prop-medio').ok, true);
  assert.equal(a.place('propulsion_aux', 'prop-grande').ok, true); // reemplaza el mismo punto, no crea un tercer motor
  assert.equal(Object.values(a.piezas).filter(x => catalog.part(x.partId).tipo === 'propulsion').length, 2);
});

test('el arrastre puede guardar una posición libre y conservarla al exportar/importar', () => {
  const a = nuevo();
  const posRel = { x: 0.35, y: 0.2, z: -0.4 };
  assert.equal(a.place('casco', 'casco-cilindro-corto').ok, true);
  assert.equal(a.place('propulsion', 'prop-pequeno', undefined, posRel).ok, true);
  assert.deepEqual(a.get('propulsion').posRel, posRel);
  const b = nuevo();
  assert.deepEqual(b.load(a.toJSON()), []);
  assert.deepEqual(b.get('propulsion').posRel, posRel);
});


test('las cuatro ampliaciones se pueden montar, exportar e importar sin alterar el diseño', () => {
  const a = nuevo();
  const nuevas = [
    ['controles', 'controles-navegacion'],
    ['periscopio', 'periscopio-optico'],
    ['portillas', 'portillas-reforzadas'],
    ['escotilla', 'escotilla-hermetica']
  ];
  for (const [slot, part] of nuevas) assert.equal(a.place(slot, part).ok, true, `${slot} debe aceptar su pieza`);
  const json = a.toJSON('ampliado');
  const b = nuevo();
  assert.deepEqual(b.load(json), []);
  for (const [slot, part] of nuevas) assert.equal(b.get(slot).part.id, part);
});
