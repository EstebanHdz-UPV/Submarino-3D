import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PartsCatalog } from '../../src/modules/submarine/PartsCatalog.js';
import { Assembly } from '../../src/modules/submarine/Assembly.js';
import { crearStatsVacias } from '../../src/modules/submarine/Stats.js';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [world, parts, materials, rules, design] = await Promise.all([
  load('../../data/physics.json'), load('../../data/parts.json'), load('../../data/materials.json'),
  load('../../data/assembly-rules.json'), load('../../data/designs/ejemplo.json')
]);
const catalog = new PartsCatalog(parts.piezas, materials.materiales, parts.tipos);
const env = { tipoAgua: 'mar', temperaturaC: 15, corrienteMs: 0 };
const nuevo = (quitar = []) => {
  const a = new Assembly(catalog, rules);
  assert.deepEqual(a.load(design), []);
  quitar.forEach((id) => a.remove(id));
  return a;
};

test('el diseño de ejemplo produce stats completos y finitos', () => {
  const s = nuevo().stats(world, env);
  assert.equal(s.completo, true);
  assert.ok(s.casco);
  for (const k of ['masaSecaKg', 'volumenEnvolventeM3', 'costoUsd', 'profundidadColapsoM', 'profundidadDisenoM', 'cdaF', 'rhoSuperficie']) {
    assert.ok(Number.isFinite(s[k]) && s[k] > 0, `${k} debe ser un número positivo, es ${s[k]}`);
  }
  for (const v of ['cgM', 'cbM', 'momentoSecoM', 'tanquePosM']) assert.ok(s[v].every(Number.isFinite), v);
  assert.ok(s.inercia.roll > 0 && s.inercia.pitch > 0 && s.inercia.yaw > 0);
});

test('el contrato: computeStats no añade ni omite campos respecto a crearStatsVacias', () => {
  const vacio = Object.keys(crearStatsVacias(world)).sort();
  assert.deepEqual(Object.keys(nuevo().stats(world, env)).sort(), vacio);
  assert.deepEqual(Object.keys(nuevo(['casco']).stats(world, env)).sort(), vacio);
});

test('sin casco no se calcula el resto y se avisa', () => {
  const s = nuevo(['casco']).stats(world, env);
  assert.equal(s.casco, null);
  assert.equal(s.efectos.sinCasco, true);
  assert.equal(s.completo, false);
  assert.match(s.advertencias[0], /casco/i);
});

test('cada pieza faltante activa su efecto y la lista de faltantes', () => {
  const casos = { propulsion: 'sinEmpuje', lastre: 'sinLastre', bateria: 'sinEnergia', cabina: 'inundacion', aletas: 'sinAletas' };
  for (const [slot, efecto] of Object.entries(casos)) {
    const s = nuevo([slot]).stats(world, env);
    assert.equal(s.efectos[efecto], true, `${slot} → ${efecto}`);
    assert.ok(s.faltantes.some((f) => f.slot === slot));
  }
  assert.equal(nuevo().stats(world, env).efectos.inundacion, false);
});

test('sin lastre el tanque queda en el fondo del casco y sin volumen', () => {
  const s = nuevo(['lastre']).stats(world, env);
  assert.equal(s.tanqueM3, 0);
  assert.deepEqual(s.tanquePosM, [0, 0, -s.radioM]);
  assert.equal(s.llenadoNeutro, null);
});

test('flotabilidad: neta = ρ·V − m y llenado neutro la anula', () => {
  const s = nuevo().stats(world, env);
  assert.ok(Math.abs(s.flotabilidadNetaKg - (s.rhoSuperficie * s.volumenEnvolventeM3 - s.masaSecaKg)) < 1e-9);
  if (s.llenadoNeutro !== null) {
    const masaConAgua = s.masaSecaKg + s.llenadoNeutro * s.tanqueM3 * s.rhoSuperficie;
    assert.ok(Math.abs(masaConAgua - s.rhoSuperficie * s.volumenEnvolventeM3) < 1e-6);
  }
});

test('la pieza limitante define la profundidad de colapso', () => {
  const s = nuevo().stats(world, env);
  const min = Math.min(...s.limites.map((l) => l.colapsoM));
  assert.equal(s.profundidadColapsoM, min);
  assert.equal(s.limites.find((l) => l.colapsoM === min).nombre, s.limitante);
  assert.equal(s.profundidadDisenoM, Math.min(...s.limites.map((l) => l.disenoM)));
});

test('quitar una pieza con masa reduce la masa seca y el costo', () => {
  const base = nuevo().stats(world, env), sin = nuevo(['bateria']).stats(world, env);
  assert.ok(sin.masaSecaKg < base.masaSecaKg);
  assert.ok(sin.costoUsd < base.costoUsd);
  assert.equal(sin.capacidadWh, 0);
  assert.equal(sin.autonomiaCrucero, null);
});

test('el umbral de alerta de profundidad sale de physics.json', () => {
  assert.equal(nuevo().stats(world, env).alertaProfundidadFrac, world.modelo.alertaProfundidadFrac);
});


test('cada componente expone propiedades físicas y métricas de estabilidad longitudinal/transversal', () => {
  const s = nuevo().stats(world, env);
  assert.ok(s.componentesFisicos.length >= 10);
  for (const p of s.componentesFisicos) {
    assert.ok(Number.isFinite(p.masaKg) && p.masaKg >= 0, p.id);
    assert.ok(Number.isFinite(p.volumenM3) && p.volumenM3 >= 0, p.id);
    assert.ok(Array.isArray(p.posicionM) && p.posicionM.every(Number.isFinite), p.id);
  }
  assert.ok(Number.isFinite(s.gmLongM));
  assert.ok(Number.isFinite(s.gmTransM));
});
