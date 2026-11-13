import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/modules/ui/screens/TrialsScreen.js', import.meta.url), 'utf8');

test('la pantalla de pruebas usa un laboratorio unificado con parámetros compartidos', () => {
  assert.match(source, /Laboratorio de pruebas/);
  assert.match(source, /Parámetros de simulación/);
  assert.match(source, /Velocidad de corriente/);
  assert.match(source, /Duración/);
  assert.match(source, /class: 'selector-prueba'/);
  assert.doesNotMatch(source, /class: 'escenarios'/);
});
