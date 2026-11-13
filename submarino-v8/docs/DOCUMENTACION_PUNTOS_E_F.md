# Documentación Técnica — Registro en el Core, Modelos, Validación Física, Rúbrica y Revisión (Puntos E y F)

> **Proyecto:** Simulador de Submarino de Exploración 3D
> **Versión:** 0.1.0 (`submarino-v8`)
> **Archivos de referencia:** `docs/FISICA.md`, `docs/RUBRICAS.md`, `docs/REVISION_MODULOS.md`

---

## 1. Resumen de Implementación — Punto E: Registro en el Core/catálogo (E1 – E3)

### E1. Migración en `server/migraciones.js` (tablas `proyectos` y `rutas_aprendizaje`)

- **Migraciones versionadas**: se creó `server/migraciones.js` con tres migraciones que se aplican una sola vez y en orden:
  - `001_crear_tabla_proyectos`: catálogo de proyectos (id, slug, nombre, descripción, versión, portada, url, activo, mapeo STEAM, objetivos, módulos, autores).
  - `002_crear_tabla_rutas_aprendizaje`: fases M, S, E, T y A de cada proyecto con su orden, fase requisito, evento de telemetría que la valida y criterio.
  - `003_registrar_submarino_exploracion`: inserta el simulador y sus cinco fases tomando los datos de `manifest.json` y `data/lessons.json`.
- **Almacenamiento sin dependencias**: como el proyecto solo usa módulos nativos de Node, cada tabla es un archivo JSON en `data/db/` (escritura atómica con archivo temporal). Cada migración incluye su `CREATE TABLE IF NOT EXISTS` en SQL para que el Core pueda aplicar el mismo esquema si usa una base SQL.
- **Registro de migraciones**: las aplicadas quedan en `data/db/_migraciones.json`; volver a ejecutar no repite migraciones ni duplica filas. La tabla rechaza columnas no declaradas.
- **Ejecución**: `server.js` aplica las pendientes al arrancar y sincroniza la fila del proyecto con el manifest. También se ejecutan con `npm run migrar` (y `--estado` para listarlas).
- **API de solo lectura**: `GET /api/proyectos`, `GET /api/proyectos/:slug` (incluye sus rutas) y `GET /api/rutas-aprendizaje?proyecto_id=`. Los archivos de `server/` y `data/db/` no se sirven como estáticos (HTTP 403).

### E2. Activar tarjeta en `proyectos.html`

- **Página del catálogo**: nueva `proyectos.html` con `src/proyectos.js`: lee `/api/proyectos` y pinta una tarjeta por cada proyecto activo con portada, estado, versión, chips M/S/E/T/A, las cinco fases de `rutas_aprendizaje`, número de objetivos y botón *Abrir proyecto* (`index.html#/proyecto`).
- **Tarjeta activa**: `manifest.json` declara `catalogo.activo: true`; la tarjeta se resalta con borde cian y la etiqueta **ACTIVO**.
- **Portada**: el manifest apuntaba a `assets/images/submarino-portada.png`, que no existía. Se generó con una captura del propio simulador (diseño de ejemplo en el escenario submarino).
- **Enlace desde la app**: la pantalla *Proyecto STEAM* tiene ahora el botón *Catálogo de proyectos*.

### E3. Verificar `calcularObjetivos()` para que lea objetivos del manifest

- **Función nueva** en `src/core/evaluacion.js`: `calcularObjetivos(manifest, informe, { avance })` recorre `manifest.objetivos_evaluables`; no usa listas fijas en el código ni `data/objectives.json` (que son los objetivos técnicos del equipo).
- **Datos en el manifest**: cada objetivo declara `dimensiones`, `regla` (`promedio` o `minimo`) y `umbral` (70 = nivel Bueno). OE-01 usa el mínimo de las cinco dimensiones; OE-02 el promedio de M y S; OE-03 a OE-05 una dimensión cada uno.
- **Resultado por objetivo**: puntaje, nivel, estado (`logrado`, `en_proceso`, `no_logrado`), dimensiones que faltan reforzar y fases completadas en `avance_rutas`.
- **Integración**: `evaluarTelemetria()` agrega `informe.objetivos` cuando recibe el manifest; `main.js` se lo pasa a `Evaluacion`; la clase expone `calcularObjetivos()` y la fachada `telemetria.js` la exporta. Se muestran en *Resultados* (lista con ✓/✗) y en *Proyecto STEAM* (puntaje junto a cada objetivo).

---

## 2. Resumen de Implementación — Punto F: Calidad y pendientes del equipo (F1 – F4)

### F1. Reemplazar `.glb` marcadores por modelos propios

- **Diagnóstico**: 16 de los 18 modelos ya los generaba `tools/generar_assets.py`. Quedaban dos marcadores: `lecho-marino.glb` (un plano de 34 vértices que el simulador siempre descartaba) y `controles-navegacion.glb` (copia idéntica de `controles.glb`).
- **Lecho marino**: relieve real de 800 × 800 m a escala 1:1 (261 × 261 = 68 121 vértices) con meseta, acantilados, dorsales y cañón, generado con la misma fórmula que `Seabed.heightAt()`. Se corrigió el orden de los triángulos porque glTF y Babylon reflejan el eje x.
- **Uso en el simulador**: `Seabed.js` carga el modelo, compara sus alturas con la fórmula del choque (error medido: 0,26 mm) y, si no coincide o falta el archivo, usa el terreno procedural. La rejilla de choque se calcula igual en ambos casos.
- **Consola de navegación**: modelo propio con carta electrónica, bitácora con compás, rueda de seis radios, joystick, panel con tres relojes y pilotos de estado.
- **Verificación visual**: la escena con el lecho del `.glb` es igual a la procedural (diferencia media de 0,13 sobre 255 por píxel).

### F2. Validar física con submarino real + citar fuentes

- **Referencia**: HOV Alvin (WHOI), versión de 6500 m: esfera de Ti-6Al-4V con paredes de 3 in y 4,8 m³ interiores, probada a 8000 m; 1,5 nudos; seis propulsores de 113 N.
- **Prueba automática**: `tests/physics/validacion-alvin.test.js` usa las mismas funciones del simulador (`Pressure.js`, `HullStress.js`) y los mismos JSON.

| Comparación | Simulador | Referencia | Diferencia |
|---|---|---|---|
| Presión a 6500 m | 66,4 MPa (9629 psi) | casi 10 000 psi | 3,7 % |
| Presión vs. densidad real (1000–10 000 m) | — | tabla de densidad de Encyclopaedia Britannica | 0,21 % |
| Colapso de la esfera | 11 989 m (fluencia) | resistió 8000 m | ✓ |
| Profundidad de diseño de la esfera | 7993 m | 6500 m | 23 % |
| Velocidad con 6 × 113 N | 1,38 nudos | 1,5 nudos | 8 % |

- **Constantes ajustadas (antes → después)**:
  - Perfil de densidad ampliado de 4000 m a 10 000 m (1053,5 · 1061,8 · 1069,6 kg/m³).
  - HY-80: densidad 7850 → 7746 kg/m³ y E 205 → 207 GPa.
  - Ti-6Al-4V: E 114 → 113,8 GPa y ν 0,34 → 0,342.
- **Efecto**: error de presión a 10 000 m de 0,82 % a 0,16 %; masa en seco del diseño de ejemplo de 4936 a 4908 kg. Los 7 escenarios del ejemplo siguen aprobados.
- **Fuentes citadas**: cada material de `data/materials.json` tiene el campo `fuente` (fichas ASM, MIL-S-16216, patente US 6,153,294, Alseamar). `CREDITS.md` y `docs/FISICA.md` listan las fuentes. Quedan marcados **SIN validar**: compuesto de carbono, PMMA y costos.

### F3. Sustituir `rubrics.json` por la rúbrica oficial

- **Rúbrica analítica STEAM**: cinco criterios (R-M 20 %, R-S 20 %, R-E 25 %, R-T 20 %, R-A 15 %), cada uno con descriptores para los niveles Excelente (≥ 85), Bueno (≥ 70), Suficiente (≥ 50) e Insuficiente, evidencia de telemetría y objetivos del manifest que evalúa.
- **Conectada al motor**: `Config.js` carga la rúbrica y `pesosDesdeRubrica()` convierte los pesos para `evaluacion.js`. Si un peso cambia en el JSON, cambia la calificación. Si la rúbrica falta o los pesos no suman 100, se usan los pesos por defecto.
- **Consistencia**: una prueba verifica que los umbrales de la rúbrica sean los mismos que usa `determinarNivel()`.
- **Criterios del equipo**: los criterios R1–R8 de la plantilla anterior se conservan en `entregableEquipo` (revisión del software, no califican al alumno). `docs/RUBRICAS.md` se generó desde el JSON.

### F4. Revisar cada módulo antes de dar la tarjeta por terminada

- **Método**: `node --check` en todos los archivos, importación de los 69 módulos de `src/`, recorrido de las 10 pantallas en Chrome con registro de la consola, una prueba completa en el navegador y regresión de los 7 escenarios del ejemplo.
- **Hallazgos corregidos**:
  - `main.js`: un intento correcto (`exito: true`) no quedaba en el buffer de telemetría y el contador de aciertos subía dos veces. Ahora la fase M correcta da M = 100.
  - `RouteScreen.js`: la entrega de la fase A no emitía evento. Ahora emite `biomimetica_completada`.
  - `server.js`: un evento desconocido en `/api/avance-rutas` borraba las fases completadas.
  - Faltaba el ícono `reloj.svg` (error 404).
  - El formulario de pruebas se salía del panel lateral.
  - *Resultados* y *Ensamblaje* mostraban el texto "null".
- **Documentación**: `docs/REVISION_MODULOS.md` con el estado de cada módulo. Bitácora (entradas 21–25) y tablero actualizados: SUB-014, SUB-024 y las nuevas SUB-044 a SUB-046 quedan en *Verificación* para que cada responsable las pase a *Terminado*.

---

## 3. Cobertura de Pruebas Automatizadas

**Pruebas nuevas:**

- `tests/core/catalogo.test.js`: migraciones, idempotencia, SQL, columnas válidas y tarjeta del catálogo (E1, E2).
- `tests/core/objetivos.test.js`: lectura de objetivos del manifest, reglas mínimo/promedio, umbrales y conexión con la telemetría (E3).
- `tests/assets/modelos-propios.test.js`: ningún `.glb` es marcador ni copia; el lecho coincide con `heightAt` y sus caras miran hacia arriba (F1).
- `tests/physics/validacion-alvin.test.js`: presión, densidad, esfera y velocidad contra el Alvin; fuentes en cada material (F2).
- `tests/core/rubrica.test.js`: estructura de la rúbrica, umbrales y pesos aplicados a la evaluación (F3).
- `tests/physics/escenarios-ejemplo.test.js`: el diseño de ejemplo aprueba los 7 escenarios automáticos (F4).

**Total ejecutado: 121/121 pruebas aprobadas** con 0 fallos (antes de esta entrega: 90). Sin errores de consola en las 10 pantallas ni en `proyectos.html`.
