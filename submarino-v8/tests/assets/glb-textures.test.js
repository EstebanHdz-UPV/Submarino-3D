import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../assets/models/', import.meta.url);
const models = [
  'lastre-fijo.glb', 'modulo-propulsion.glb', 'bateria.glb', 'sonar.glb',
  'aletas.glb', 'tanque-lastre.glb', 'lecho-marino.glb', 'casco-principal.glb',
  'espuma.glb', 'torre-acceso.glb', 'casco-esfera.glb', 'focos.glb', 'cabina-control.glb',
  'controles.glb', 'controles-navegacion.glb', 'periscopio.glb', 'portillas.glb', 'escotilla.glb'
];

function readGlb(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'cabecera GLB');
  assert.equal(bytes.readUInt32LE(4), 2, 'versión glTF 2.0');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'longitud total del GLB');
  let offset = 12;
  let json;
  let bin;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trim());
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  return { json, bin };
}

test('los modelos GLB (incluidos controles, periscopio, portillas y escotilla) contienen texturas PNG embebidas, materiales y UV', async () => {
  for (const model of models) {
    const bytes = await readFile(new URL(model, root));
    const { json, bin } = readGlb(bytes);
    assert.ok(json.images?.some(img => img.mimeType === 'image/png' && Number.isInteger(img.bufferView)), `${model}: imagen embebida`);
    assert.ok(json.textures?.length, `${model}: textura glTF`);
    assert.ok(json.materials?.some(mat => mat.pbrMetallicRoughness?.baseColorTexture), `${model}: material con textura`);
    assert.ok(json.meshes?.some(mesh => mesh.primitives?.some(p => Number.isInteger(p.attributes?.TEXCOORD_0))), `${model}: coordenadas UV`);
    for (const image of json.images.filter(img => img.mimeType === 'image/png')) {
      const view = json.bufferViews[image.bufferView];
      const start = view.byteOffset ?? 0;
      assert.ok(bin.subarray(start, start + 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${model}: cabecera PNG embebida`);
      assert.ok(start + view.byteLength <= bin.length, `${model}: PNG dentro del buffer`);
    }
  }
});
