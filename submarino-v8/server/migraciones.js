// Migraciones del registro en el Core/catálogo (punto E1).
// Crea las tablas `proyectos` y `rutas_aprendizaje` y registra el simulador del submarino.
//
// El proyecto no usa base de datos (solo Node con módulos nativos), así que cada tabla es un archivo JSON
// en data/db/. Cada migración incluye además su SQL equivalente para que el Core (si usa una base SQL)
// pueda aplicar exactamente el mismo esquema. Las migraciones se aplican una sola vez y en orden;
// las aplicadas quedan anotadas en data/db/_migraciones.json.
//
// Uso:  node server/migraciones.js          (o npm run migrar)
//       node server/migraciones.js --estado (lista migraciones aplicadas y pendientes)
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_PROYECTO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FASES_RUTA = ['M', 'S', 'E', 'T', 'A'];

/** Datos de cada fase de la ruta STEAM (los textos largos vienen de data/lessons.json). */
const FASES = {
  M: { titulo: 'Compuerta de cálculo', evento: 'matematicas_intento', criterio: 'Calcula P = ρ·g·h con error ≤ 1 % y elige lastre.' },
  S: { titulo: 'Laboratorio de Arquímedes', evento: 'ciencia_intento', criterio: 'Calibra empuje y peso hasta |B − W| ≤ 5 % (flotabilidad neutra).' },
  E: { titulo: 'Ensamblaje', evento: 'objeto_colocado', criterio: 'Coloca al menos 5 componentes compatibles en el ensamblaje 3D.' },
  T: { titulo: 'Programación por bloques', evento: 'programa_ejecutado', criterio: 'Ordena leer → comparar → ajustar lastre y ejecuta el programa.' },
  A: { titulo: 'Biomimética y entrega', evento: 'biomimetica_completada', criterio: 'Elige inspiración biomimética e iluminación y entrega una reflexión (≥ 20 caracteres).' }
};

// ---------------------------------------------------------------- almacenamiento JSON
/** Tablas como archivos JSON: { tabla, clave, columnas, filas }. Escritura atómica (archivo temporal + rename). */
export class AlmacenJSON {
  constructor(dir) { this.dir = dir; }
  ruta(tabla) { return join(this.dir, `${tabla}.json`); }
  async existe(tabla) { try { await readFile(this.ruta(tabla)); return true; } catch { return false; } }
  async leer(tabla) {
    try { return JSON.parse(await readFile(this.ruta(tabla), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') throw new Error(`La tabla "${tabla}" no existe: ejecuta las migraciones (npm run migrar).`); throw e; }
  }
  async escribir(tabla, datos) {
    await mkdir(this.dir, { recursive: true });
    const tmp = this.ruta(tabla) + '.tmp';
    await writeFile(tmp, JSON.stringify(datos, null, 2) + '\n');
    await rename(tmp, this.ruta(tabla));
  }
  async crearTabla(tabla, clave, columnas) {
    if (await this.existe(tabla)) return false; // CREATE TABLE IF NOT EXISTS
    await this.escribir(tabla, { tabla, clave, columnas, filas: [] });
    return true;
  }
  /** Inserta o actualiza por clave primaria. Valida que solo se usen columnas declaradas. */
  async upsert(tabla, fila) {
    const t = await this.leer(tabla);
    const extra = Object.keys(fila).filter((c) => !t.columnas.includes(c));
    if (extra.length) throw new Error(`Columnas desconocidas en "${tabla}": ${extra.join(', ')}`);
    const i = t.filas.findIndex((f) => f[t.clave] === fila[t.clave]);
    const ahora = new Date().toISOString();
    if (i >= 0) t.filas[i] = { ...t.filas[i], ...fila, actualizado_en: ahora };
    else t.filas.push({ ...Object.fromEntries(t.columnas.map((c) => [c, null])), ...fila, creado_en: ahora, actualizado_en: ahora });
    await this.escribir(tabla, t);
  }
  async seleccionar(tabla, filtro = () => true) { return (await this.leer(tabla)).filas.filter(filtro); }
}

// ---------------------------------------------------------------- definición de las migraciones
const COLS_PROYECTOS = ['id', 'slug', 'nombre', 'descripcion', 'version', 'portada', 'url', 'activo', 'mapeo_steam', 'objetivos', 'modulos', 'autores', 'creado_en', 'actualizado_en'];
const COLS_RUTAS = ['id', 'proyecto_id', 'fase', 'orden', 'titulo', 'descripcion', 'modulo_slug', 'requisito', 'evento_validacion', 'criterio', 'creado_en', 'actualizado_en'];

export const MIGRACIONES = [
  {
    id: '001_crear_tabla_proyectos',
    descripcion: 'Catálogo de proyectos STEAM que muestra proyectos.html.',
    sql: `CREATE TABLE IF NOT EXISTS proyectos (
  id            VARCHAR(60)  PRIMARY KEY,          -- proyecto_id
  slug          VARCHAR(60)  NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   TEXT,
  version       VARCHAR(20),
  portada       VARCHAR(200),                      -- ruta de la imagen de la tarjeta
  url           VARCHAR(200) NOT NULL,             -- entrada del proyecto
  activo        BOOLEAN      NOT NULL DEFAULT FALSE,
  mapeo_steam   JSON,                              -- { M, S, E, T, A }
  objetivos     JSON,                              -- objetivos_evaluables del manifest
  modulos       INTEGER,
  autores       JSON,
  creado_en     TIMESTAMP    NOT NULL,
  actualizado_en TIMESTAMP   NOT NULL
);`,
    aplicar: (db) => db.crearTabla('proyectos', 'id', COLS_PROYECTOS)
  },
  {
    id: '002_crear_tabla_rutas_aprendizaje',
    descripcion: 'Fases de la ruta STEAM de cada proyecto (orden, requisito y evento que la valida).',
    sql: `CREATE TABLE IF NOT EXISTS rutas_aprendizaje (
  id                VARCHAR(80) PRIMARY KEY,       -- proyecto_id:fase
  proyecto_id       VARCHAR(60) NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fase              CHAR(1)     NOT NULL CHECK (fase IN ('M','S','E','T','A')),
  orden             INTEGER     NOT NULL,
  titulo            VARCHAR(120) NOT NULL,
  descripcion       TEXT,
  modulo_slug       VARCHAR(60),                   -- módulo de data/lessons.json
  requisito         CHAR(1),                       -- fase que hay que completar antes (NULL = primera)
  evento_validacion VARCHAR(40) NOT NULL,          -- evento de telemetría que registra el intento
  criterio          TEXT,
  creado_en         TIMESTAMP   NOT NULL,
  actualizado_en    TIMESTAMP   NOT NULL,
  UNIQUE (proyecto_id, fase)
);`,
    aplicar: (db) => db.crearTabla('rutas_aprendizaje', 'id', COLS_RUTAS)
  },
  {
    id: '003_registrar_submarino_exploracion',
    descripcion: 'Registra el simulador (tarjeta activa) y sus cinco fases a partir de manifest.json y data/lessons.json.',
    sql: '-- INSERT ... ON CONFLICT (id) DO UPDATE generado por sincronizarProyecto() con los datos del manifest',
    aplicar: (db, ctx) => sincronizarProyecto(db, ctx)
  }
];

// ---------------------------------------------------------------- registro del proyecto
async function leerJSON(raiz, rel) { return JSON.parse(await readFile(join(raiz, rel), 'utf8')); }

/** Registro de proyectos a partir del manifest (sirve también para mantener la tarjeta al día). */
export function filaProyecto(manifest) {
  if (!manifest?.proyecto_id || !manifest?.slug) throw new Error('manifest.json necesita proyecto_id y slug para registrarse en el catálogo.');
  return {
    id: manifest.proyecto_id,
    slug: manifest.slug,
    nombre: manifest.name,
    descripcion: manifest.descripcion,
    version: manifest.version,
    portada: manifest.portada ?? null,
    url: `index.html#/proyecto`,
    activo: manifest.catalogo?.activo !== false,
    mapeo_steam: manifest.mapeoSTEAM ?? null,
    objetivos: manifest.objetivos_evaluables ?? [],
    modulos: manifest.curriculoSTEAM?.modulos ?? null,
    autores: (manifest.autores ?? []).map((a) => a.nombre)
  };
}

export function filasRutas(manifest, lessons) {
  const modulos = Object.fromEntries((lessons?.modulos ?? []).map((m) => [m.id, m]));
  return FASES_RUTA.map((fase, i) => ({
    id: `${manifest.proyecto_id}:${fase}`,
    proyecto_id: manifest.proyecto_id,
    fase,
    orden: i + 1,
    titulo: `${modulos[fase]?.titulo ?? fase} · ${FASES[fase].titulo}`,
    descripcion: modulos[fase]?.objetivo ?? null,
    modulo_slug: modulos[fase]?.slug ?? null,
    requisito: i === 0 ? null : FASES_RUTA[i - 1],
    evento_validacion: FASES[fase].evento,
    criterio: FASES[fase].criterio
  }));
}

/** Inserta/actualiza el proyecto y sus rutas. Idempotente. */
export async function sincronizarProyecto(db, { raiz = RAIZ_PROYECTO } = {}) {
  const manifest = await leerJSON(raiz, 'manifest.json');
  const lessons = await leerJSON(raiz, manifest.data?.lessons ?? 'data/lessons.json');
  await db.upsert('proyectos', filaProyecto(manifest));
  for (const r of filasRutas(manifest, lessons)) await db.upsert('rutas_aprendizaje', r);
  return manifest.proyecto_id;
}

// ---------------------------------------------------------------- ejecución
/** Aplica en orden las migraciones pendientes. Devuelve { aplicadas, pendientes, db }. */
export async function ejecutarMigraciones({ raiz = RAIZ_PROYECTO, dir = join(raiz, 'data/db'), log = () => {} } = {}) {
  const db = new AlmacenJSON(dir);
  let registro = { aplicadas: [] };
  try { registro = await db.leer('_migraciones'); } catch { /* primera ejecución */ }
  const hechas = new Set(registro.aplicadas.map((m) => m.id));
  const nuevas = [];
  for (const m of MIGRACIONES) {
    if (hechas.has(m.id)) continue;
    await m.aplicar(db, { raiz });
    registro.aplicadas.push({ id: m.id, descripcion: m.descripcion, aplicada_en: new Date().toISOString() });
    await db.escribir('_migraciones', registro); // se anota cada una: si la siguiente falla, no se repite esta
    nuevas.push(m.id);
    log(`migración aplicada: ${m.id}`);
  }
  return { aplicadas: nuevas, total: registro.aplicadas.length, db };
}

// node server/migraciones.js [--estado]
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const estado = process.argv.includes('--estado');
  const db = new AlmacenJSON(join(RAIZ_PROYECTO, 'data/db'));
  if (estado) {
    let hechas = [];
    try { hechas = (await db.leer('_migraciones')).aplicadas.map((m) => m.id); } catch { /* sin aplicar */ }
    for (const m of MIGRACIONES) console.log(`${hechas.includes(m.id) ? '[x]' : '[ ]'} ${m.id} — ${m.descripcion}`);
  } else {
    const r = await ejecutarMigraciones({ log: console.log });
    console.log(r.aplicadas.length ? `Listo: ${r.aplicadas.length} migración(es) nueva(s).` : 'Sin migraciones pendientes.');
  }
}
