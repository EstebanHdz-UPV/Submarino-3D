import test from 'node:test';
import assert from 'node:assert/strict';
import { generarInformeMision, informeComoCSV, informeComoJSON } from '../../src/modules/trials/MissionReport.js';

const date = '2026-10-28T12:00:00Z';

test('informe de misión resume pruebas aprobadas y mantiene una advertencia física', () => {
  const report = generarInformeMision([{ ok: true, escenario: { nombre: 'Inmersión', tipo: 'profundidad' }, dictamen: { aprobado: true, checks: [{ id: 'mantiene', texto: 'Mantiene profundidad', ok: true, detalle: '10 m' }] }, resumen: { profundidadFinalM: 10 } }], { nombre: 'Misión A', fecha: date });
  assert.equal(report.estado, 'aprobada_segun_criterios');
  assert.deepEqual(report.totales, { pruebas: 1, completadas: 1, aprobadas: 1, fallidas: 0, criteriosFallidos: 0, erroresEjecucion: 0 });
  assert.match(report.nota, /no constituye certificación/);
  assert.equal(JSON.parse(informeComoJSON(report)).nombre, 'Misión A');
});

test('informe marca criterios fallidos y pruebas incompletas', () => {
  const report = generarInformeMision([
    { ok: true, escenario: { tipo: 'giro' }, dictamen: { aprobado: false, checks: [{ id: 'gira', texto: 'Giro suficiente', ok: false, detalle: 'Giro 4°' }] } },
    { ok: false, error: 'Sin casco', escenario: { tipo: 'profundidad' } }
  ], { fecha: date });
  assert.equal(report.estado, 'requiere_revision');
  assert.equal(report.totales.criteriosFallidos, 1);
  assert.equal(report.totales.erroresEjecucion, 1);
  assert.ok(report.recomendaciones.length >= 2);
});

test('CSV escapa comillas y saltos de línea y valida entradas', () => {
  const report = generarInformeMision([{ ok: false, error: 'Error "A"\nB', escenario: { nombre: 'Prueba, uno' } }], { fecha: date });
  const csv = informeComoCSV(report);
  assert.match(csv, /"Prueba, uno"/);
  assert.match(csv, /"Error ""A"" B"/);
  assert.throws(() => generarInformeMision(null), TypeError);
  assert.throws(() => generarInformeMision([], { fecha: 'fecha-invalida' }), RangeError);
});
