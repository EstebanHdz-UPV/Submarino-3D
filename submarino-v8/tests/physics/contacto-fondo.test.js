import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverContacto } from '../../src/modules/physics/ContactoFondo.js';

// Cuerpo mínimo: ejes físicos (x adelante, y izquierda, z arriba), casco cilíndrico de 3 m × 0,6 m de radio.
const cuerpo = (pos, vel) => ({ s: { radioM: 0.6, largoM: 3 }, R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], pos, vel, omega: [0, 0, 0] });
const fondoPlano = { alturaFondo: () => -100, elipsoides: [], techoY: 0 };

test('el casco no atraviesa el fondo y el impacto se mide contra la superficie', () => {
  const c = cuerpo([0, 0, -99.7], [0, 0, -2]); // quilla (r = 0,6) ya 0,3 m dentro del fondo
  const r = resolverContacto(c, fondoPlano, 1 / 60);
  assert.ok(r, 'debe haber contacto');
  assert.ok(Math.abs(r.impacto - 2) < 1e-6, `impacto ${r.impacto}`);
  assert.ok(c.pos[2] >= -100 + 0.6 - 1e-6, 'el casco queda sobre el fondo');
  assert.ok(c.vel[2] > -0.5, 'se frena casi por completo');
});

test('sin contacto no cambia nada', () => {
  const c = cuerpo([0, 0, -50], [1, 0, 0]);
  assert.equal(resolverContacto(c, fondoPlano, 1 / 60), null);
  assert.deepEqual(c.pos, [0, 0, -50]);
});

test('una roca (elipsoide) detiene un avance frontal', () => {
  // Babylon: x derecha, y arriba, z adelante. Roca a 5 m por delante del origen físico.
  const mundo = { alturaFondo: () => -1000, elipsoides: [{ x: 0, y: -50, z: 5, ax: 1.5, ay: 1.5, az: 1.5, rot: 0 }], techoY: 0 };
  const c = cuerpo([0, 0, -50], [2, 0, 0]);
  let maximo = 0;
  for (let i = 0; i < 300; i++) { c.pos[0] += c.vel[0] / 60; const r = resolverContacto(c, mundo, 1 / 60); if (r) maximo = Math.max(maximo, r.impacto); }
  assert.ok(maximo > 1, `golpe fuerte (${maximo})`);
  assert.ok(c.pos[0] < 5 - 1.5, 'no atraviesa la roca');
});
