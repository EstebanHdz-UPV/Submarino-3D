import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const base = new URL('../../src/modules/environment/', import.meta.url);
const tex = new URL('../../assets/textures/', import.meta.url);

test('el lecho y las rocas usan materiales PBR con texturas locales', async () => {
  const source = await readFile(new URL('Seabed.js', base), 'utf8');
  assert.match(source, /new B\.PBRMaterial/);
  assert.match(source, /'arena'/);
  assert.match(source, /'roca'/);
  for (const f of ['arena', 'roca']) for (const s of ['albedo', 'normal', 'orm']) await access(new URL(`${f}_${s}.png`, tex));
});

test('la superficie del agua usa un mapa de normales local, sin recursos externos', async () => {
  const source = await readFile(new URL('OceanModule.js', base), 'utf8');
  assert.match(source, /agua_normal\.png/);
  assert.match(source, /PBRMaterial/);
  assert.doesNotMatch(source, /https?:\/\//);
  await access(new URL('agua_normal.png', tex));
});

test('plantas, entorno e implosión existen y usan recursos locales', async () => {
  for (const f of ['Plants.js', 'Visuals.js', 'Implosion.js']) {
    const src = await readFile(new URL(f, base), 'utf8');
    assert.doesNotMatch(src, /https?:\/\//, f);
  }
  for (const f of ['alga_albedo', 'alga_normal', 'coral_albedo', 'coral_normal', 'coral_orm', 'entorno_agua', 'rayos_luz']) await access(new URL(`${f}.png`, tex));
  const imp = await readFile(new URL('Implosion.js', base), 'utf8');
  assert.match(imp, /MorphTarget/);
});
