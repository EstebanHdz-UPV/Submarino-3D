// F2: validación de la física contra un submarino real publicado: HOV Alvin (WHOI), versión de 6500 m.
// Datos de referencia (ver docs/FISICA.md, sección "Validación con un submarino real"):
//   - Esfera de titanio Ti-6Al-4V, paredes de 3 in (76,2 mm), volumen interior 4,8 m³.
//   - Profundidad de operación 6500 m; la esfera se probó a presión equivalente a 8000 m.
//   - A 6500 m la esfera soporta "casi 10 000 psi" (≈ 68,9 MPa).
//   - Velocidad máxima de avance 1,5 nudos; seis propulsores de 113 N; manga 2,6 m y alto 3,68 m.
// Densidad del agua de mar en profundidad: tabla de Encyclopaedia Britannica (35 psu, 0 °C).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { presionManometricaPa, densidadAgua } from '../../src/modules/physics/Pressure.js';
import { profundidadesCasco } from '../../src/modules/physics/HullStress.js';

const leer = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const world = leer('../../data/physics.json');
const titanio = leer('../../data/materials.json').materiales.find((m) => m.id === 'titanio-6al4v');
const env = { tipoAgua: 'mar' };
const PSI = 6894.757;
const NUDO = 0.514444;

// Esfera del Alvin: radio interior a partir del volumen de 4,8 m³; el modelo usa el radio medio de la pared.
const ESPESOR = 3 * 0.0254;
const R_INT = Math.cbrt((3 * 4.8) / (4 * Math.PI));
const esferaAlvin = { forma: 'esfera', radioM: R_INT + ESPESOR / 2, espesorM: ESPESOR, largoM: 2 * (R_INT + ESPESOR) };

/** Presión de referencia integrando la tabla de densidad de Britannica (trapecios). */
function presionReferenciaPa(h) {
  const z = [0, 1000, 2000, 4000, 6000, 8000, 10000], rho = [1028.13, 1032.85, 1037.47, 1046.40, 1054.95, 1063.15, 1071.04];
  let p = 0;
  for (let i = 1; i < z.length && z[i - 1] < h; i++) {
    const z1 = Math.min(h, z[i]), r1 = rho[i - 1] + (rho[i] - rho[i - 1]) * (z1 - z[i - 1]) / (z[i] - z[i - 1]);
    p += 0.5 * (rho[i - 1] + r1) * world.gravedad * (z1 - z[i - 1]);
  }
  return p;
}

test('F2: la presión a 6500 m coincide con "casi 10 000 psi" del Alvin (±5 %)', () => {
  const p = presionManometricaPa(world, env, 6500);
  assert.ok(p < 10000 * PSI, `${(p / PSI).toFixed(0)} psi debe quedar por debajo de 10 000`);
  assert.ok(p > 0.95 * 10000 * PSI, `${(p / PSI).toFixed(0)} psi`);
});

test('F2: la presión del modelo difiere < 1 % de integrar la densidad real de Britannica (1000–10 000 m)', () => {
  for (const h of [1000, 4000, 6500, 8000, 10000]) {
    const sim = presionManometricaPa(world, env, h), ref = presionReferenciaPa(h);
    assert.ok(Math.abs(sim - ref) / ref < 0.01, `${h} m: ${(sim / 1e6).toFixed(2)} vs ${(ref / 1e6).toFixed(2)} MPa`);
  }
});

test('F2: la densidad aumenta con la profundidad como en la tabla de Britannica (±0,3 %)', () => {
  const ref = { 4000: 1046.40, 6000: 1054.95, 8000: 1063.15, 10000: 1071.04 };
  for (const [h, r] of Object.entries(ref)) {
    const d = densidadAgua(world, env, +h);
    assert.ok(Math.abs(d - r) / r < 0.003, `${h} m: ${d.toFixed(1)} vs ${r}`);
  }
});

test('F2: la esfera de titanio del Alvin resiste la prueba de 8000 m y su profundidad de diseño queda cerca de 6500 m', () => {
  const p = profundidadesCasco(esferaAlvin, titanio, world, env);
  assert.equal(p.modo, 'fluencia', 'una esfera gruesa de titanio falla por fluencia, no por pandeo');
  assert.ok(p.colapsoM > 8000, `colapso calculado ${p.colapsoM.toFixed(0)} m: la esfera real se probó a 8000 m sin fallar`);
  const error = (p.disenoM - 6500) / 6500;
  assert.ok(Math.abs(error) < 0.25, `diseño ${p.disenoM.toFixed(0)} m vs 6500 m reales (${(error * 100).toFixed(0)} %)`);
});

test('F2: con el Cd de avance del modelo, seis propulsores de 113 N dan una velocidad cercana a 1,5 nudos (±25 %)', () => {
  const area = (Math.PI / 4) * 2.6 * 3.68;               // sección frontal elíptica del Alvin
  const cd = world.cdCuerpo.cilindro.avance;
  const v = Math.sqrt((2 * 6 * 113) / (world.agua.mar.densidadSuperficieKgM3 * cd * area));
  const nudos = v / NUDO;
  assert.ok(Math.abs(nudos - 1.5) / 1.5 < 0.25, `${nudos.toFixed(2)} nudos vs 1,5`);
});

test('F2: cada material del simulador declara su fuente', () => {
  for (const m of leer('../../data/materials.json').materiales) assert.ok(typeof m.fuente === 'string' && m.fuente.length > 20, m.id);
});
