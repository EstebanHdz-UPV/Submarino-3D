import test from 'node:test';
import assert from 'node:assert/strict';
import { geometria, semiextensiones, limitarAZona, resolverPosicion, seSolapan, relAMetros, metrosARel } from '../../src/modules/submarine/Placement.js';

const casco = { id: 'c', forma: 'cilindro', radioM: 0.6, largoM: 3 };
const part = { tipo: 'bateria', dimensiones: { largoM: 0.5, anchoM: 0.4, altoM: 0.3 } };

test('relAMetros y metrosARel son inversas', () => {
  const rel = { x: 0.3, y: -0.2, z: 0.5 };
  const m = relAMetros(rel, casco), back = metrosARel(m, casco);
  assert.ok(Math.abs(back.x - rel.x) < 1e-9 && Math.abs(back.y - rel.y) < 1e-9 && Math.abs(back.z - rel.z) < 1e-9);
});

test('una pieza interior queda dentro del casco', () => {
  const half = { x: 0.2, y: 0.15, z: 0.25 };
  const p = limitarAZona({ x: 5, y: 5, z: 50 }, half, casco, 'interior');
  assert.ok(Math.hypot(p.x, p.y) < geometria(casco).r);
  assert.ok(Math.abs(p.z) < geometria(casco).halfL);
});

test('resolverPosicion no deja piezas solapadas', () => {
  const half = { x: 0.2, y: 0.15, z: 0.25 };
  const otros = [{ pos: { x: 0, y: 0, z: 0 }, half }];
  const r = resolverPosicion({ x: 0, y: 0, z: 0 }, half, otros, casco, 'interior');
  assert.equal(r.ok, true);
  assert.equal(seSolapan(r.pos, half, otros[0].pos, half, 0), false);
});

test('semiextensiones devuelve valores positivos', () => {
  const h = semiextensiones({ tipo: 'bateria' , dimensiones: part.dimensiones }, casco);
  assert.ok(h.x > 0 && h.y > 0 && h.z > 0);
});
