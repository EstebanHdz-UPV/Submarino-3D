# Simulador de Submarinos 3D

Simulador de submarino de exploración: se **arma desde cero** con piezas y materiales, se consultan **dos libros** (piezas y materiales), y se **prueba** en escenarios con física realista, incluso con el diseño incompleto.

**Equipo:** Nayma Karina Rodriguez Guevara (2530250) · Enrique Zoe Leon Saldivar (2530265) · Oscar Daniel Purata Martinez (2530285) · Jorge Esteban Hernández Pérez (2530451)
**Metodología:** Kanban (Trello + GitHub) · **Motor:** Babylon.js 9.32 (≥ 9) · **Lenguaje:** JavaScript puro con módulos ES

## Requisitos

- **Node.js 18 o superior** (solo para servir el proyecto en local, no para desarrollar).
- Un navegador moderno con WebGL2 (Chrome, Edge o Firefox).
- **No necesita internet.** Babylon.js ya está en `vendor/babylon/`.

## Ejecutar

```bash
node server.js        # o: npm start
# abrir http://localhost:3000
```

Al arrancar, el servidor aplica las migraciones pendientes del catálogo (`server/migraciones.js`). También se pueden correr solas con `npm run migrar` (o `node server/migraciones.js --estado` para ver cuáles están aplicadas).

- Catálogo de proyectos del Core: http://localhost:3000/proyectos.html
- Pruebas automáticas: `npm test`

Para usar otro puerto: `PORT=3100 node server.js` (en Windows PowerShell: `$env:PORT=3100; node server.js`).
El servidor escucha solo en `127.0.0.1`.

## Cómo se usa

1. **Libros:** consulta el Libro 1 (piezas y ensamblaje) y el Libro 2 (materiales por escenario y profundidad).
2. **Ensamblaje:** elige un punto de montaje y una pieza. El casco permite elegir material. Las estadísticas se actualizan en vivo (masa, flotabilidad, profundidad de colapso, estabilidad, costo). "Cargar ejemplo" trae un submarino listo.
3. **Pruebas:** elige un escenario y las condiciones (profundidad, velocidad, temperatura, corriente) y pulsa *Iniciar prueba*. Puedes probar aunque falten piezas.
4. **Estrés estructural:** mapa de colores del casco a cualquier profundidad.
5. **Resultados:** dictamen aprobado/no aprobado con causas, métricas y gráficas; *Guardar reporte*.
6. **Piloto manual** (escenario "Piloto manual"): maneja con el teclado y observa el HUD.

### Controles del piloto manual

| Tecla | Acción |
|---|---|
| W / ↑ · S / ↓ | Más / menos empuje · **Espacio** detiene el motor |
| A / ← · D / → | Timón izquierda / derecha (necesita velocidad) |
| Z · C | Desplazamiento lateral |
| E · Q | Llenar lastre (descender) · vaciar lastre (ascender) |
| B · G | Soplar lastre · soltar pesos (emergencia) |
| V · R · H | Cambiar cámara · reiniciar · ayuda |

## Estructura

```
index.html · proyectos.html · server.js · manifest.json · package.json
server/              migraciones.js: tablas proyectos y rutas_aprendizaje del Core
vendor/babylon/      Babylon.js 9.32 + loader glTF (local)
src/core/            SLog, Config, Telemetry, Loop, EventBus, evaluacion, guardado
src/modules/         scene · physics · submarine · controls · environment · trials · books · ui
src/proyectos.js     tarjeta del catálogo
assets/              models (.glb) · textures · icons (.svg) · images (portada)
data/                JSON: física, materiales, piezas, reglas, escenarios, libros, rúbrica, i18n, diseños, kanban
data/db/             tablas del catálogo (las crean las migraciones)
docs/                metodología, objetivos, rúbricas, lecciones, física, revisión de módulos, bitácora, kanban
tools/               generador de modelos .glb y texturas (Python) y visor de modelos
tests/               pruebas con node:test (assets, core, physics, submarine, ui)
```

Detalle de requisitos, cronograma y flujo de trabajo en `docs/`.

## Reglas del proyecto

- Solo JavaScript puro con módulos ES. **Sin frameworks, sin TypeScript, sin bundlers.**
- Modelos solo `.glb`/`.gltf`; imágenes solo PNG/JPG/WebP; iconos solo SVG; datos en JSON.
- Todo se sirve localmente (sin CDN).
- Cada cambio: tarjeta de Trello `SUB-###`, rama `sub-###-nombre`, Pull Request con la plantilla y entrada de bitácora.

## Estado de los pendientes del equipo (v8)

- ✅ Modelos `.glb` propios: los 18 de `assets/models/` los genera `tools/generar_assets.py`; el lecho marino y la consola de navegación dejaron de ser marcadores (`tests/assets/modelos-propios.test.js`).
- ✅ Física validada con el HOV Alvin (WHOI) y fuentes citadas: `docs/FISICA.md` (sección "Validación con un submarino real") y `CREDITS.md`. Quedan sin ficha el compuesto de carbono, el PMMA y los costos.
- ✅ `data/rubrics.json` es la rúbrica oficial con la que califica `evaluacion.js` (`docs/RUBRICAS.md`). Si el profesor cambia un peso, solo se edita el JSON.
- ✅ Revisión de cada módulo: `docs/REVISION_MODULOS.md`. Las tarjetas quedan en *Verificación*; cada responsable las pasa a *Terminado* después de revisarlas.

## Depuración

En la consola del navegador, `__submarino` da acceso a la aplicación (por ejemplo `__submarino.assembly.stats(__submarino.worldEfectivo(), {tipoAgua:'mar'})`). En *Configuración* se pueden exportar el SLog y la telemetría. La telemetría del servidor queda en `data/telemetry/*.jsonl`.
