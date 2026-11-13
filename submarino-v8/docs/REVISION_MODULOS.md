# Revisión de módulos antes de dar las tarjetas por terminadas (punto F4)

Fecha: 2026-11-10 · versión revisada: submarino-v8

## Cómo se revisó

1. **Sintaxis:** `node --check` sobre todos los `.js` de `src/`, `server/`, `server.js`, `guardado.js` y `tools/`. Sin errores.
2. **Carga:** se importaron los 69 módulos de `src/` en Node. Todos cargan; `main.js` arranca solo en el navegador (necesita `document`), como se espera.
3. **Pruebas automáticas:** `npm test` → **121/121 aprobadas** (antes de esta entrega eran 90).
4. **Navegador:** Chrome sin interfaz con `node server.js`: se recorrieron las 10 pantallas, se cargó el diseño de ejemplo, se abrió la fase M de la Ruta STEAM, se ejecutó una prueba completa y se revisó `proyectos.html`. Se registraron los errores de consola de cada pantalla.
5. **Regresión física:** el diseño de ejemplo aprueba los 7 escenarios automáticos antes y después de los cambios de constantes (`tests/physics/escenarios-ejemplo.test.js`).

## Hallazgos y correcciones

| # | Módulo | Problema encontrado | Corrección |
|---|---|---|---|
| 1 | `src/main.js` (`registrarEventoEstandarizado`) | Si un intento traía `exito: true` se llamaba a `registrarAcierto(detalle)` sin `evento`: el intento correcto **no** quedaba en el buffer de telemetría, así que `evaluacion.js` no lo veía (M quedaba en 50 aunque el cálculo fuera correcto), y el contador de aciertos subía dos veces. | Siempre se llama a `telemetry.event(evento, …)`, que ya cuenta aciertos y fallos. Verificado en navegador: 1 evento, `exito: true`, 1 acierto, M = 100. |
| 2 | `RouteScreen.js` (fase A) | Entregar el proyecto no emitía ningún evento: la dimensión A nunca recibía evidencia de la entrega. | Se emite `biomimetica_completada` (dimensión A en `Telemetry.js`). |
| 3 | `server.js` (`POST /api/avance-rutas`) | Un evento con nombre desconocido caía en la rama que **reemplaza el avance** con `completadas: []`, borrando las fases ya completadas. | Los eventos con nombre solo incrementan su contador; el avance se reemplaza únicamente cuando no hay `evento`. |
| 4 | `TrialsScreen.js` | Pedía el ícono `assets/icons/reloj.svg`, que no existía (error 404 en consola). | Se dibujó `reloj.svg` con el mismo estilo de los demás íconos. Ya no quedan íconos faltantes. |
| 5 | `src/styles/screens.css` (`.lab-campos`) | En el panel lateral (≈ 380 px) los campos de la segunda columna se salían de la tarjeta y ocultaban las unidades. | La rejilla usa una columna cuando no caben dos. |
| 6 | `Seabed.js` / `lecho-marino.glb` | El lecho del `.glb` era un marcador plano y siempre se descartaba. | Ver F1: modelo real 1:1, verificado contra la fórmula de choque. |
| 7 | `controles-navegacion.glb` | Era copia idéntica de `controles.glb`. | Ver F1: consola de navegación propia. |
| 8 | `ResultsScreen.js`, `AssemblyScreen.js` | `cont.append(…, condición ? nodo : null)` escribía el texto "null" en pantalla (en Resultados cuando la prueba no tiene eventos; en Ensamblaje cuando el diseño está completo). | Se filtran los valores vacíos antes de insertar. Revisadas las 10 pantallas: ningún "null" ni "undefined" visible. |

## Estado por módulo

Leyenda: **P** = cubierto por prueba automática · **N** = revisado en navegador · ✓ = revisado sin pendientes · ⚠ = funciona, con pendiente anotado.

| Módulo | Responsabilidad | Revisión | Estado |
|---|---|---|---|
| `server.js` | Servir archivos, API de guardado, avance, telemetría y catálogo | N | ✓ (hallazgo 3 corregido) |
| `server/migraciones.js` | Tablas `proyectos` y `rutas_aprendizaje` (E1) | P | ✓ |
| `src/proyectos.js` + `proyectos.html` | Tarjeta del catálogo (E2) | P N | ✓ |
| `core/Config.js` | Carga y valida los JSON (ahora también la rúbrica) | N | ✓ |
| `core/EventBus.js`, `SLog.js`, `Loop.js`, `Units.js` | Infraestructura | P N | ✓ |
| `core/Telemetry.js`, `telemetria.js` | Muestras y eventos estandarizados (D1–D3) | P N | ✓ |
| `core/evaluacion.js` | Puntajes STEAM, objetivos (E3) y pesos de la rúbrica (F3) | P | ✓ |
| `core/guardado.js` | Autoguardado, `sendBeacon`, espejo docente (C1–C5) | P | ✓ |
| `physics/*` | Presión, flotabilidad, arrastre, masa añadida, estabilidad, casco, contacto | P | ✓ validado con el Alvin (F2); ⚠ dinámica sin curvas reales |
| `submarine/*` | Catálogo, ensamblaje, colocación, estadísticas, batería, lastre | P N | ✓ |
| `trials/*` | Escenarios, ejecución, dictamen, informe | P N | ✓ (nueva regresión de 7 escenarios) |
| `scene/*` | Escena Babylon, cámara, cargador `.glb`, vista de ensamblaje, interior | N | ✓ |
| `environment/*` | Océano, lecho, rocas, plantas, fauna, partículas, implosión | P N | ✓ |
| `controls/*` | Teclado y hélice | P | ✓ |
| `ui/*` y `ui/screens/*` | Las 10 pantallas, HUD, sonar, gráficas | N (+P en ensamblaje y pruebas) | ✓ (hallazgos 2, 4, 5 y 8 corregidos) |

## Pendientes que siguen abiertos

- Compuesto de carbono, acrílico PMMA, costos de piezas: sin ficha técnica (marcados en `materials.json` y `CREDITS.md`).
- Respuesta dinámica (aceleración, radio de giro, consumo) sin comparar con mediciones de un vehículo real.
- Los textos de la rúbrica oficial (`data/rubrics.json`) deben confirmarse con el profesor; si cambia un peso basta con editar el JSON.
