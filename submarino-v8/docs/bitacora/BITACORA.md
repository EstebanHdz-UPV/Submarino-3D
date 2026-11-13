# Bitácora de proyecto

Registro de todo lo hecho desde cero. Una fila por cambio de columna en Trello (ver `docs/METODOLOGIA.md`).

## Uso de IA (RNF-10)

El código base, la estructura, los datos de ejemplo y esta documentación inicial se generaron con ayuda de **Claude (Anthropic)** a partir de los requisitos del equipo. Cada integrante debe **revisar, probar y entender** su parte (por eso las tarjetas empiezan en *Verificación*) y registrar aquí qué validó, qué corrigió y qué aprendió.

| Herramienta | Para qué se usó | Qué validó el equipo |
|---|---|---|
| Claude | Estructura, código base, datos JSON, libros, documentación | (completar por cada integrante) |
| ChatGPT | Auditoría de código, correcciones de telemetría y validación inicial con pruebas automatizadas | El equipo debe revisar los cambios y completar las pruebas en navegador y con referencias físicas. |

## Entradas

| # | Fecha | Tarjeta | Fase | Qué se hizo | Por qué | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-26 | SUB-001 | Planeación | Se definió la estructura de carpetas, package.json, server.js (solo 127.0.0.1) y manifest.json. | Base del proyecto, sin dependencias de npm. | OK: `node server.js` sirve el proyecto. | Estructura del repo |
| 2 | 2026-10-26 | SUB-002 | Desarrollo | Se descargó una sola vez Babylon.js 9.32.0 (paquete npm "babylonjs") y solo el loader glTF; se copiaron a vendor/babylon/ con su licencia. | Funcionar sin internet; el loader glTF solo carga .glb/.gltf (no incluye OBJ ni STL). | OK: BABYLON.Engine.Version = 9.32.0, verificado al arrancar. | vendor/babylon/VERSION.txt |
| 3 | 2026-10-26 | SUB-003 | Desarrollo | SLog (niveles + ISO-8601), Config (carga y validación de JSON), Telemetry (buffer + JSONL) y EventBus. | Trazabilidad (RNF-09). | OK: se genera data/telemetry/session-*.jsonl. | src/core/ |
| 4 | 2026-10-26 | SUB-006/008/012 | Desarrollo | Física: peso, empuje de Arquímedes con flotabilidad parcial, arrastre cuadrático por eje, presión hidrostática. | Propiedades físicas del proyecto. | OK: neutralidad con deriva < 0,05 m/s; ≈ 10,9 atm absolutas a 100 m. | src/modules/physics/ |
| 5 | 2026-10-26 | SUB-009/011 | Desarrollo | Masa añadida por eje, inercia, estabilidad por CG/CB (producto cruz) y plano de flotación en superficie. | Estabilidad realista. | OK: el submarino de ejemplo flota con ≈ 4° de trimado y se estabiliza. | PhysicsModule.js, Stability.js |
| 6 | 2026-10-26 | SUB-021 | Desarrollo | Esfuerzo del casco: fluencia y pandeo elástico (von Mises para cilindros, esfera clásica con factor de imperfección), factor de seguridad 1,5. | Calcular el colapso con materiales reales. | Resultado: cilindros de aluminio ≈ 200 m; esfera de Ti ≈ 3 800 m. Pendiente validar con fuentes. | HullStress.js |
| 7 | 2026-10-26 | SUB-022/023 | Desarrollo | Estadísticas del ensamble, consecuencias de piezas faltantes y 7 escenarios con pilotos automáticos y dictamen. | Probar el submarino aunque esté incompleto. | OK: los 7 escenarios aprueban con el diseño de ejemplo; sin propulsor/lastre/batería/domo fallan por la razón física esperada. | src/modules/trials/ |
| 8 | 2026-10-26 | SUB-004/014/025 | Desarrollo | Escena Babylon, cargador .glb con alternativa procedural, ensamblador visual y .glb marcadores generados con un script. | Mostrar el submarino armado. | Parcial: los .glb son marcadores; falta modelar los reales en Blender. | src/modules/scene/ |
| 9 | 2026-10-27 | SUB-013/028/010 | Desarrollo | Piloto manual (teclado), cámaras, HUD en Canvas 2D con iconos SVG y sonar. | RF-02 a RF-05, RF-09, RF-10. | OK en prueba automatizada: avance, giro (signo correcto), lastre, cámaras y reinicio. Se corrigió la orientación (FromLookDirectionLH invertía la proa). | src/modules/controls, ui/ |
| 10 | 2026-10-27 | SUB-029/030/031 | Desarrollo | Pantallas del mockup (Inicio, Ensamblaje, Pruebas, Estrés, Resultados, Configuración) y visor de los 2 libros. | Interfaz acordada. | OK en navegador (Chromium + WebGL2) sin errores en consola. | src/modules/ui/ |
| 11 | 2026-10-27 | SUB-033 | Documentación | Los libros se generaron con un script puntual que usa las mismas fórmulas del simulador para que las tablas coincidan. | Evitar números distintos entre libros y simulador. | OK: data/books/*.json. | data/books/ |

## Plantilla para nuevas entradas

| # | Fecha | Tarjeta | Fase | Qué se hizo | Por qué | Resultado (valores antes → después) | Evidencia (commit, PR, captura) |
|---|---|---|---|---|---|---|---|

| 12 | 2026-10-27 | SUB-034 | Verificación y mejora | Se auditó la telemetría existente, se corrigió la retención de lotes cuando falla el envío, se agregó comprobación de respuesta HTTP y límites del buffer para eventos. Se protegió el acceso estático directo a los archivos de telemetría. Se añadió una validación de muestras JSONL en el servidor, una guarda para altura inválida en el cálculo de fracción sumergida y pruebas automatizadas de física y telemetría. | Evitar pérdida silenciosa de telemetría, proteger registros de ejecución y detectar regresiones mediante pruebas repetibles. | 8 pruebas automatizadas aprobadas. Pendiente prueba completa en navegador y validación física con datos de referencia. | src/core/Telemetry.js; server.js; src/modules/physics/Buoyancy.js; tests/ |

| 13 | 2026-10-27 | SUB-035 | Verificación y mejora física | Se añadieron guardas para rechazar pasos de simulación inválidos, sanear entradas no finitas de control, limitar las órdenes de lastre y evitar que valores inválidos de potencia o tiempo alteren la batería. Se incorporaron pruebas para los actuadores. | Evitar que datos inválidos propaguen NaN al estado del simulador y garantizar límites físicos básicos en lastre y energía. | 13 pruebas automatizadas aprobadas. La validación de maniobras y calibración física sigue pendiente. | src/modules/physics/PhysicsModule.js; src/modules/submarine/Ballast.js; src/modules/submarine/Battery.js; tests/submarine/actuators.test.js |

| 14 | 2026-10-27 | SUB-036 | Validación física y navegación | Se reforzó la validación de profundidad, densidad, presión, geometría del casco, propiedades de materiales y masa efectiva. Se agregaron pruebas de presión-profundidad inversa y parámetros inválidos. | Evitar cálculos físicos no finitos o inválidos que afecten los límites de profundidad y los resultados del simulador. | 17 pruebas automatizadas aprobadas; calibración física y maniobras integrales aún pendientes. | src/modules/physics/Pressure.js; HullStress.js; AddedMass.js; tests/physics/physics.test.js |

| 15 | 2026-10-27 | SUB-037 | Integración de navegación | Se agregaron pruebas con el diseño JSON de ejemplo para validar órdenes de profundidad, rumbo, velocidad, maniobra y corriente; una simulación continua de 60 s; respuesta a acelerador/timón; y liberación única de pesos. | Comprobar la integración entre los controladores y la física, y detectar regresiones que las pruebas unitarias no cubren. | 21 pruebas automatizadas aprobadas. La prueba de integración confirma estados finitos y respuesta de mando; la calibración con datos reales continúa pendiente. | tests/physics/navigation.test.js; docs/FISICA.md |

| 16 | 2026-10-27 | SUB-038 | Validación de emergencia | Se añadieron pruebas de integración para el umbral temporal del piloto de emergencia, liberación única de pesos, evento de inicio, agotamiento energético y estados finitos. | Comprobar secuencia y trazabilidad de la emergencia sin afirmar que el ascenso esté calibrado. | Las pruebas verifican la secuencia y los eventos; velocidad de ascenso y distancia de parada siguen pendientes de criterios físicos de aceptación. | tests/physics/emergency.test.js; src/modules/trials/Scenarios.js |

| 17 | 2026-10-28 | SUB-039 | Diagnóstico de estado físico | Se añadió `validarEstadoFisico` para revisar snapshots, valores finitos, masa positiva, presión absoluta, límites de lastre y batería; permite aplicar límites configurables de profundidad, velocidad, cabeceo y balanceo. Se agregaron pruebas de integración durante 30 s y casos inválidos. | Detectar desviaciones físicas básicas de forma explícita y reunir los errores en un solo diagnóstico para facilitar depuración de maniobras. | 26 pruebas automatizadas aprobadas. Es una verificación del software, no calibración con datos reales ni certificación de seguridad. | `src/modules/trials/StateValidation.js`; `tests/physics/state-validation.test.js`; `docs/FISICA.md` |

| 18 | 2026-10-28 | SUB-040 | Informes de misión | Se añadió un generador de informes agregados con estado general, criterios fallidos, errores de ejecución y recomendaciones; admite JSON y CSV con escape de celdas. | Facilitar la comparación y trazabilidad de pruebas, distinguiendo resultados de software de la validación física real. | Pruebas de generación, criterios fallidos, errores de ejecución y exportación CSV añadidas; calibración con datos de referencia pendiente. | `src/modules/trials/MissionReport.js`; `tests/physics/mission-report.test.js` |

| 15 | SUB-040 | 2026-10-27 | Diagnóstico del piloto WASD, indicador de movimiento y pruebas de desplazamiento | 32 pruebas aprobadas; validación visual pendiente |

| 16 | 2026-10-29 | SUB-042 | Materiales y texturas GLB | Se añadieron texturas PNG embebidas y coordenadas UV a los 13 modelos GLB, con variaciones de pintura, metal, lastre, batería, sonar y luces. No se usan imágenes externas. | Aumentar el detalle visual sin introducir dependencias de red ni archivos de textura separados. | Verificación automatizada de recursos GLB y pruebas de regresión; la inspección visual en el navegador queda pendiente. | `assets/models/*.glb`; `tests/assets/glb-textures.test.js` |

| 17 | 2026-10-29 | SUB-043 | Texturas de ambientes de prueba | Se añadieron texturas procedurales locales para sedimento del fondo, superficie mineral de rocas y ondas/destellos del agua. Se aplicaron texturas de color y relieve con repetición UV; no se descargan recursos externos. | Hacer más legibles y realistas los entornos de las pruebas conservando el funcionamiento offline y sin alterar la física. | 35 pruebas automatizadas aprobadas; inspección visual en navegador pendiente. | `src/modules/environment/Seabed.js`; `src/modules/environment/OceanModule.js`; `tests/assets/environment-textures.test.js` |

## 2026-10-29 — Laboratorio unificado de pruebas
- Se reemplazó la lista de tarjetas de escenarios por un selector único de ensayo.
- Se agruparon profundidad, velocidad, temperatura, corriente y duración en un panel común.
- Se añadió un resumen del estado del ensamblaje y criterios de evaluación desplegables.
- Se preservan los parámetros por escenario y se conservan los flujos de piloto manual y resultados.
- Validación: `npm test` — 35 pruebas aprobadas.

## 2026-11-10 — Puntos E y F (submarino-v8)

| # | Fecha | Tarjeta | Fase | Qué se hizo | Por qué | Resultado (valores antes → después) | Evidencia |
|---|---|---|---|---|---|---|---|
| 21 | 2026-11-10 | SUB-044 | Registro en el Core (E1–E3) | server/migraciones.js con tablas proyectos y rutas_aprendizaje (JSON + SQL equivalente); API /api/proyectos y /api/rutas-aprendizaje; proyectos.html con la tarjeta activa y portada capturada del simulador; calcularObjetivos() en evaluacion.js leyendo manifest.objetivos_evaluables. | Registrar el simulador en el catálogo del Core y evaluar los objetivos declarados en el manifest. | Tarjeta activa en proyectos.html; 5 objetivos evaluados en Resultados y Proyecto STEAM. Pruebas: catalogo.test.js y objetivos.test.js aprobadas. | server/migraciones.js; proyectos.html; src/proyectos.js; src/core/evaluacion.js; tests/core/catalogo.test.js; tests/core/objetivos.test.js |
| 22 | 2026-11-10 | SUB-014 | Modelos propios (F1) | lecho-marino.glb pasó de marcador plano (34 vértices) a relieve real 800 × 800 m (68 121 vértices) generado con la misma fórmula del choque; controles-navegacion.glb pasó de copia de controles.glb a consola propia. Seabed.js usa el modelo y lo verifica contra heightAt. | Quitar los últimos marcadores de assets/models/. | Error del lecho contra la fórmula: 0,26 mm. Imagen igual a la versión procedural (diferencia media 0,13/255). modelos-propios.test.js aprobado. | tools/piezas.py; src/modules/environment/Seabed.js; tests/assets/modelos-propios.test.js |
| 23 | 2026-11-10 | SUB-024 | Validación con submarino real (F2) | Comparación con el HOV Alvin (WHOI): presión a 6500 m, esfera de titanio, velocidad. Perfil de densidad ampliado a 10 000 m (Britannica); HY-80 y Ti-6Al-4V con datos de fichas citadas. | Validar la física y citar las fuentes de los datos. | Presión a 10 000 m: error −0,82 % → −0,16 %. Esfera: diseño 7993 m vs 6500 m reales (+23 %), colapso 11 989 m > prueba de 8000 m. Velocidad 1,38 vs 1,5 nudos. Masa del ejemplo 4936 → 4908 kg. Los 7 escenarios siguen aprobados. | tests/physics/validacion-alvin.test.js; tests/physics/escenarios-ejemplo.test.js; docs/FISICA.md; CREDITS.md |
| 24 | 2026-11-10 | SUB-045 | Rúbrica oficial (F3) | data/rubrics.json con cinco criterios STEAM (M 20, S 20, E 25, T 20, A 15), descriptores por nivel, evidencia y objetivos; evaluacion.js toma los pesos con pesosDesdeRubrica(). Los criterios R1–R8 se conservan como entregable del equipo. | Sustituir la plantilla por la rúbrica con la que se califica. | rubrica.test.js aprobado; RUBRICAS.md generado desde el JSON. | data/rubrics.json; docs/RUBRICAS.md; src/core/evaluacion.js; src/core/Config.js |
| 25 | 2026-11-10 | SUB-046 | Revisión de módulos (F4) | Sintaxis, carga de los 69 módulos, recorrido de las 10 pantallas en Chrome y prueba completa. Se corrigieron 8 hallazgos (eventos de acierto no registrados, fase A sin evento, avance borrado por eventos desconocidos, ícono faltante, formulario desbordado, texto "null" en pantalla). | Revisar cada módulo antes de pasar tarjetas a Terminado. | npm test: 90 → 121 pruebas aprobadas; sin errores de consola. | docs/REVISION_MODULOS.md |
