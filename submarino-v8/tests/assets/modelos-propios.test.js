// F1: ningún .glb de assets/models/ es un marcador; el lecho coincide con el relieve que usa el choque del casco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Seabed } from '../../src/modules/environment/Seabed.js';

const dir = new URL('../../assets/models/', import.meta.url);

function leerGlb(bytes) {
  let off = 12, json, bin;
  while (off < bytes.length) {
    const len = bytes.readUInt32LE(off), tipo = bytes.readUInt32LE(off + 4), chunk = bytes.subarray(off + 8, off + 8 + len);
    if (tipo === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trim());
    if (tipo === 0x004e4942) bin = chunk;
    off += 8 + len;
  }
  return { json, bin };
}
const acceso = ({ json, bin }, i, Tipo, comps) => {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView];
  return new Tipo(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * comps);
};
const vertices = (g) => g.json.meshes.flatMap((m) => m.primitives).reduce((n, p) => n + g.json.accessors[p.attributes.POSITION].count, 0);

test('F1: todos los modelos tienen geometría propia (ninguno es marcador ni copia de otro)', async () => {
  const archivos = (await readdir(dir)).filter((f) => f.endsWith('.glb'));
  assert.ok(archivos.length >= 18);
  const huellas = new Map();
  for (const f of archivos) {
    const g = leerGlb(await readFile(new URL(f, dir)));
    assert.ok(vertices(g) >= 1000, `${f}: ${vertices(g)} vértices (un marcador tenía 34)`);
    assert.equal(g.json.asset.generator, 'tools/generar_assets.py', `${f}: generado por la herramienta del equipo`);
    const pos = g.json.meshes[0].primitives[0].attributes.POSITION;
    const h = createHash('sha1').update(Buffer.from(acceso(g, pos, Float32Array, 3).buffer.slice(0))).digest('hex');
    const huella = `${vertices(g)}:${h}`;
    assert.ok(!huellas.has(huella), `${f} es idéntico a ${huellas.get(huella)}`);
    huellas.set(huella, f);
  }
});

test('F1: lecho-marino.glb tiene relieve real a escala 1:1 y coincide con Seabed.heightAt', async () => {
  const g = leerGlb(await readFile(new URL('lecho-marino.glb', dir)));
  const prim = g.json.meshes[0].primitives[0];
  const P = acceso(g, prim.attributes.POSITION, Float32Array, 3);
  assert.equal(P.length / 3, 261 * 261, 'mismos nodos que la rejilla de choque');
  const sb = new Seabed(null, null, 250);
  let err = 0, yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    // glTF es diestro: el cargador de Babylon refleja x (x_babylon = −x_gltf)
    const x = -P[i], y = P[i + 1], z = P[i + 2];
    err = Math.max(err, Math.abs((y - sb.fondoM) - sb.heightAt(x, z)));
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  }
  assert.ok(err < 1e-3, `error máximo ${err} m`);
  assert.ok(yMax - yMin > 30, `relieve de ${(yMax - yMin).toFixed(1)} m (el marcador medía 0,02)`);
  assert.ok(Math.abs(g.json.accessors[prim.attributes.POSITION].max[0] - 400) < 1e-3, '800 m de lado');
});

test('F1: las caras del lecho miran hacia arriba (orden antihorario en glTF)', async () => {
  const g = leerGlb(await readFile(new URL('lecho-marino.glb', dir)));
  const prim = g.json.meshes[0].primitives[0];
  const P = acceso(g, prim.attributes.POSITION, Float32Array, 3), I = acceso(g, prim.indices, Uint32Array, 1);
  let arriba = 0, total = 0;
  for (let t = 0; t < I.length; t += 3 * 50) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]].map((k) => [P[3 * k], P[3 * k + 1], P[3 * k + 2]]);
    const u = b.map((v, k) => v - a[k]), v = c.map((w, k) => w - a[k]);
    const ny = u[2] * v[0] - u[0] * v[2];
    total++; if (ny > 0) arriba++;
  }
  assert.ok(arriba / total > 0.95, `${arriba}/${total} caras hacia arriba`);
});
