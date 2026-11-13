# Requisitos No Funcionales — Submarino de Exploración (Babylon.js)

Fuente: `instrucciones.txt` del proyecto, más las decisiones de diseño del proyecto (metodología Kanban, estructura de carpetas y arquitectura).

**Leyenda**
- **Origen:** `E` = explícito en las instrucciones · `D` = derivado o necesario para cumplirlas · `?` = no aparece en las instrucciones que se tienen; confirmar con el profesor
- **Prioridad:** `Alta` = obligatorio / descalificante · `Media` = muy recomendable · `Baja` = deseable
- **Cambio:** `=` sin cambios · `M` modificado · `N` nuevo

---

## 1. Restricciones tecnológicas (stack obligatorio)

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-01 | El motor 3D será exclusivamente **Babylon.js ≥ 9.0**, incluido de forma local en `vendor/babylon/` (bundles UMD cargados con `<script>`). | `BABYLON.Engine.Version` ≥ 9.0.0 y el número queda en `manifest.json`; no hay otro motor 3D (Three.js, PlayCanvas, etc.). | Alta | E | M |
| RNF-02 | El frontend propio se escribirá en **JavaScript puro (ES2020+)** con módulos nativos `import`/`export`. | Todo el código propio carga con `<script type="module">`; no hay archivos `.ts`, `.jsx` ni `.vue`. | Alta | E | M |
| RNF-03 | **Prohibido cualquier framework** (React, Angular, Vue, Svelte, jQuery, Bootstrap, Tailwind, etc.). | Búsqueda en el código y en `vendor/`: 0 frameworks. | Alta | E | = |
| RNF-04 | **Prohibido TypeScript** y cualquier transpilador (Babel, tsc, CoffeeScript). | No hay `tsconfig.json`, `.babelrc` ni archivos `.ts`. | Alta | E | = |
| RNF-05 | **Node.js ≥ 18** se usará solo para servir y ejecutar el proyecto en local. | `"engines": { "node": ">=18" }`; el servidor usa solo módulos nativos (`http`, `fs`, `path`, `url`). | Alta | E | = |
| RNF-06 | Node.js **no** se usará para desarrollar: sin bundlers, transpiladores ni servidores de desarrollo (Vite, Webpack, Parcel, Rollup, esbuild). `package.json` no tendrá `dependencies`. | No existen configuraciones de bundlers; `package.json` solo tiene el script `start`. | Alta | E | M |
| RNF-07 | Las únicas librerías externas serán los bundles oficiales de Babylon.js (core y loaders; GUI y materials solo si hacen falta), copiados una sola vez a `vendor/`. La física será propia; Havok es opcional. | `vendor/` contiene solo archivos oficiales de Babylon.js; origen y versión registrados en `CREDITS.md` y en la bitácora. | Alta | D | M |
| RNF-08 | Los elementos 2D nativos (HUD, gráficas, sonar) se harán con **Canvas 2D API** y SVG; Babylon GUI es opcional. | No hay librerías de gráficas externas (Chart.js, D3…). | Media | E | M |
| RNF-90 | Al arrancar se verificará la versión de Babylon.js y se detendrá la aplicación con un error en SLog si es menor a 9.0. | Con un Babylon 8 en `vendor/`, la app muestra el error y no inicia. | Media | D | N |

## 2. Formatos de archivos y recursos

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-09 | Los modelos 3D serán exclusivamente **`.glb` o `.gltf`**; se prefiere `.glb`. Un `.gltf` puede referenciar su `.bin` y sus texturas (PNG/JPG/WebP). | Ningún otro formato 3D en `assets/models/`. | Alta | E | M |
| RNF-10 | **Prohibidos** `.obj`, `.fbx`, `.blend`, `.stl` y cualquier otro formato 3D distinto de glTF dentro del proyecto entregado. | Búsqueda por extensión: 0 coincidencias. | Alta | E | M |
| RNF-11 | Las imágenes y texturas serán solo **PNG, JPG/JPEG o WebP**. | Ningún otro formato raster (BMP, TGA, GIF, TIFF…). | Alta | E | = |
| RNF-12 | Los iconos serán **exclusivamente SVG**. | Todos los iconos están en `assets/icons/*.svg`; no hay icon fonts ni PNG usados como iconos. | Alta | E | = |
| RNF-13 | Los datos, la configuración y los contenidos (lecciones, rúbricas, objetivos, tarjetas Kanban, textos de UI, telemetría y parámetros físicos) estarán en **JSON**. | Ningún parámetro configurable está fijo en el código; los JSON pasan `JSON.parse`. | Alta | E | M |
| RNF-14 | Existirá un **manifest.json** en la raíz con: nombre, versión, **autor**, motor y versión mínima, runtime, punto de entrada, módulos, datos, documentos y política de recursos. | El archivo es válido y la aplicación lo lee al arrancar. | Alta | E | M |
| RNF-15 | Los recursos estarán optimizados: modelos `.glb` ≤ 10 MB cada uno y texturas ≤ 2048×2048 px. | Comprobación de tamaño en la carpeta de recursos. | Media | D | = |
| RNF-16 | Los archivos usarán **UTF-8**. Carpetas, recursos y JSON de datos en kebab-case, sin espacios ni acentos. Los archivos de clase pueden usar PascalCase (`SLog.js`, `PhysicsModule.js`). | Revisión de nombres y codificación. | Media | D | M |

## 3. Portabilidad y funcionamiento sin conexión

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-17 | La aplicación funcionará **100 % offline** una vez instalada. | Con la red desactivada, la aplicación carga y se ejecuta sin errores. | Alta | E | = |
| RNF-18 | Babylon.js, las fuentes y todos los recursos se servirán **localmente** (sin CDN). | La pestaña Network no muestra peticiones a dominios externos. | Alta | D | M |
| RNF-19 | El proyecto se arrancará con **un solo comando** (`npm start` o `node server.js`). | La aplicación queda disponible en `http://localhost:<puerto>`. | Alta | D | = |
| RNF-20 | El proyecto será multiplataforma: Windows, macOS y Linux. | Se ejecuta en los 3 sistemas con Node ≥ 18 sin cambios. | Media | D | = |
| RNF-21 | El servidor local servirá los tipos MIME correctos (`.js`, `.mjs`, `.css`, `.json`, `.svg`, `.png`, `.jpg`, `.webp`, `.glb`, `.gltf`, `.bin`, `.wasm`, `.md`). | Sin errores de tipo MIME en la consola. | Alta | D | M |
| RNF-22 | Las rutas a los recursos serán relativas y no dependerán de rutas absolutas del equipo. | El proyecto funciona copiado en cualquier carpeta. | Alta | D | = |

## 4. Rendimiento

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-23 | **≥ 60 FPS** en hardware de referencia y **≥ 30 FPS** mínimo en equipos con GPU integrada. | Medido con `engine.getFps()` durante 60 s de navegación. | Alta | D | = |
| RNF-24 | La carga inicial durará **≤ 5 s** en local. | Tiempo desde abrir la página hasta la escena interactiva. | Media | D | = |
| RNF-25 | La latencia entre la entrada del usuario y la respuesta del submarino será **≤ 100 ms**. | Medición de input → cambio de empuje en telemetría. | Alta | D | = |
| RNF-26 | La física se ejecutará con **paso de tiempo fijo** (60 Hz, `fixedStep` en `physics.json`), independiente de los FPS. | La simulación da el mismo resultado a 30 y a 144 FPS. | Alta | D | = |
| RNF-27 | Consumo de memoria estable: crecimiento < 10 % tras 30 min. | Perfil de memoria de DevTools. | Media | D | = |
| RNF-28 | Optimizaciones de render (LOD, instancias, *frustum culling*, `freezeWorldMatrix` en estáticos). | Revisión de código / Inspector. | Media | D | = |
| RNF-29 | La telemetría no reducirá el rendimiento más de un 5 %, gracias a muestreo y buffer. | Comparativa de FPS con telemetría ON y OFF. | Media | D | = |

## 5. Fidelidad física (simulación)

Todas las propiedades físicas del proyecto deben estar implementadas, con sus constantes en `data/physics.json` y `data/submarine.json`.

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-30 | La **flotabilidad** seguirá Arquímedes: `B = ρ·g·V_desplazado`, y el peso `W = m·g`. | Con masa total = ρ·V el submarino queda neutro (deriva < 0,05 m/s). | Alta | E | M |
| RNF-31 | La **presión hidrostática** será `P = P_atm + ρ·g·h` y se mostrará en HUD y telemetría. | A 10 m de profundidad: ≈ 2 atm (±1 %). | Alta | E | = |
| RNF-32 | La **resistencia hidrodinámica** será `F_d = ½·ρ·C_d·A·v²`, con C_d y área distintos por eje (avance, lateral, vertical). | La velocidad terminal converge a un valor coherente con los parámetros. | Alta | E | M |
| RNF-33 | La **estabilidad** se basará en la separación entre el centro de gravedad (CG) y el centro de flotación (CB), con par restaurador. | El submarino se endereza solo tras una perturbación de cabeceo o alabeo. | Alta | E | = |
| RNF-34 | El **movimiento** tendrá 6 grados de libertad (mínimo 4: avance, deriva, ascenso y guiñada) con aceleraciones progresivas. | Nunca hay cambios instantáneos de velocidad. | Alta | E | M |
| RNF-35 | Todas las constantes físicas (ρ agua dulce/salada, g, C_d, masa, volumen, empuje máximo, inercia) serán **configurables en JSON** en **unidades SI**. | `physics.json` y `submarine.json` con unidades documentadas. | Alta | D | = |
| RNF-36 | Habrá límites realistas: velocidad máxima y empuje máximo de la hélice, con **rampa** de aceleración. | La fuerza aplicada nunca supera `maxThrustN`. | Media | D | M |
| RNF-37 | La simulación será determinista con las mismas entradas y la misma semilla. | Dos ejecuciones grabadas producen telemetría idéntica. | Baja | D | = |
| RNF-38 | Ambientación subacuática coherente: niebla y atenuación de luz con la profundidad, y partículas o cáusticas. | La visibilidad y el color cambian al bajar. | Media | D | = |
| RNF-91 | **Lastre variable**: la masa total será `m_seco + m_agua_tanque`, con llenado de 0 a 1 que permite sumergirse, flotar y mantener flotabilidad neutra. | Aumentar el lastre hace descender; vaciarlo hace ascender. | Alta | D | N |
| RNF-92 | **Flotabilidad parcial en superficie**: el volumen desplazado depende de la fracción sumergida del casco. | En superficie el submarino flota parcialmente sumergido y se estabiliza. | Alta | D | N |
| RNF-93 | **Densidad variable** del agua según profundidad, temperatura y salinidad. | La densidad cambia con la profundidad y afecta la flotabilidad. | Media | D | N |
| RNF-94 | **Corrientes marinas** como fuerza externa configurable por zona. | Dentro de una corriente el submarino deriva sin entrada del usuario. | Media | D | N |
| RNF-95 | **Batería y consumo**: la energía se descuenta según el empuje y los sistemas activos; al llegar a 0 se limita el empuje. | La telemetría muestra el consumo y el descenso de batería. | Alta | D | N |
| RNF-96 | **Profundidad de colapso**: al superar `maxDepthM` se genera aviso y daño o fin de misión. | Evento registrado en SLog y en telemetría. | Alta | D | N |
| RNF-97 | **Masa añadida** (fracción del volumen de agua desplazado) y **momentos de inercia** por eje, usados en traslación y rotación. | La aceleración con masa añadida es menor que sin ella; los giros tienen inercia. | Alta | D | N |

## 6. Usabilidad e interfaz

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-39 | Controles intuitivos: teclado (WASD + QE + flechas), y opcionalmente ratón y gamepad. Incluye control del lastre y de la hélice. | Un usuario nuevo maneja el submarino en < 2 min sin ayuda. | Alta | D | M |
| RNF-40 | El **HUD** (Canvas 2D + iconos SVG) mostrará: profundidad, presión, velocidad, rumbo, nivel de lastre, batería y temperatura. | Valores actualizados ≥ 10 Hz y legibles sobre la escena. | Alta | D | M |
| RNF-41 | Panel de ayuda o controles accesible en todo momento (`H` o `F1`). | Se abre y se cierra sin pausar la aplicación. | Media | D | = |
| RNF-42 | UI responsive desde 1280×720 hasta 4K. | `engine.resize()` ligado a `resize`; sin solapamientos. | Media | D | = |
| RNF-43 | Diseño visual consistente: paleta, tipografía local y espaciado en variables CSS. | Archivo de *design tokens* en `src/styles/`. | Media | D | = |
| RNF-44 | Interfaz en **español**, con textos en JSON (preparada para i18n). | Ningún texto de la UI fijo en el código. | Media | D | = |
| RNF-45 | Retroalimentación inmediata ante eventos: profundidad crítica, colisión o batería baja. | Alerta visual (y sonora opcional) en < 200 ms. | Media | D | = |

## 7. Fiabilidad y robustez

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-46 | Si falla la carga de un recurso, se mostrará un mensaje claro y un *fallback* (p. ej. el casco procedural), sin bloquearse. | Al renombrar el `.glb`, la aplicación sigue funcionando con aviso. | Alta | D | M |
| RNF-47 | Los JSON (manifiesto, configuración, lecciones, rúbricas) se validarán al cargarse. | Un JSON mal formado produce un error descriptivo en SLog. | Alta | D | = |
| RNF-48 | Estabilidad en sesiones continuas de **≥ 60 min**. | Prueba de resistencia documentada en la bitácora. | Media | D | = |
| RNF-49 | Pérdida de foco: se pausa la física y el `deltaTime` acumulado se limita (p. ej. máx. 0,1 s) para evitar saltos y la espiral del bucle de paso fijo. | Al volver a la pestaña, el submarino no se teletransporta. | Media | D | M |
| RNF-50 | WebGL2 es el motor de render base; WebGPU es opcional y solo si no complica el arranque. | Funciona en navegadores sin WebGPU. | Baja | D | M |

## 8. Mantenibilidad y modularidad

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-51 | Módulos ES independientes con una sola responsabilidad: `core` (SLog, Telemetry, Config, Loop) y `modules/` (`scene`, `physics`, `submarine`, `controls`, `environment`, `ui`). | Cada módulo tiene su archivo y una API pública con `export`. | Alta | E | M |
| RNF-52 | Bajo acoplamiento: los módulos se comunican con eventos o un bus (`EventTarget`), sin dependencias circulares. | Grafo de imports sin ciclos. | Alta | D | = |
| RNF-53 | Estructura de carpetas documentada: `src/`, `vendor/`, `assets/models`, `assets/textures`, `assets/icons`, `data/`, `docs/`. | Coincide con el README y con `manifest.json`. | Alta | D | M |
| RNF-54 | Estilo uniforme: `camelCase` en variables y funciones, `PascalCase` en clases, `const`/`let` (nunca `var`). | Revisión de código. | Media | D | = |
| RNF-55 | **JSDoc** en funciones, clases y módulos públicos. | ≥ 80 % de las funciones exportadas documentadas. | Media | D | = |
| RNF-56 | Sin números mágicos: las constantes están en JSON o en módulos de constantes. | Revisión de código. | Media | D | = |
| RNF-57 | Control de versiones (**Git**) con commits frecuentes y descriptivos. | Historial coherente con la bitácora. | Alta | D | = |
| RNF-58 | Versionado **SemVer** reflejado en el manifiesto. | `manifest.json.version` coincide con el tag de Git. | Baja | D | = |

## 9. Trazabilidad, registro (SLog) y documentación

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-59 | **SLog** con niveles `DEBUG`, `INFO`, `WARN` y `ERROR`, marca de tiempo ISO-8601 y módulo de origen. | Cada entrada cumple `{ts, level, module, msg, data}`. | Alta | E | = |
| RNF-60 | El SLog será exportable a JSON y tendrá nivel configurable. | Botón o atajo de exportación; nivel definido en la configuración. | Media | D | = |
| RNF-61 | **Bitácora** completa y cronológica desde cero: fecha, tarjeta Kanban, actividad, motivo, resultado, valores antes/después, pruebas, dificultades, soluciones y evidencia. | `docs/bitacora/BITACORA.md` y `docs/bitacora/entradas.json` con entradas fechadas y continuas. | Alta | E | M |
| RNF-62 | Se documentará el **uso de IA**: herramienta, propósito, resultado y validación hecha por el alumno. | Sección específica en la bitácora. | Alta | ? | M |
| RNF-63 | Metodología **Kanban**, documentada en `docs/METODOLOGIA.md`, con tablero, límites WIP, políticas, Definición de Terminado y métricas. | `docs/kanban/TABLERO.md` actualizado y `docs/kanban/METRICAS.md` semanal. | Alta | E | M |
| RNF-64 | **Objetivos** medibles (SMART) en `data/objectives.json` y `docs/OBJETIVOS.md`, vinculados a los requisitos. | Cada objetivo tiene ID, descripción y criterio de cumplimiento. | Alta | E | M |
| RNF-65 | **Rúbricas** en `data/rubrics.json` y `docs/RUBRICAS.md`, con criterios, niveles y ponderación. | JSON válido y visible en la aplicación o en la documentación. | Alta | E | M |
| RNF-66 | **Lecciones** en `data/lessons.json` y `docs/LECCIONES.md`, ordenadas, con objetivo, contenido, pasos y módulo de código relacionado. | JSON cargado por la aplicación o enlazado en la documentación. | Alta | E | M |
| RNF-67 | **README** con requisitos previos, instalación de `vendor/`, ejecución, controles, estructura y créditos. | Un tercero ejecuta el proyecto solo con el README. | Alta | D | = |
| RNF-68 | Matriz de trazabilidad entre objetivos, requisitos, módulos, tarjetas Kanban y rúbrica. | Tabla en `docs/`. | Media | D | M |
| RNF-98 | Las tarjetas Kanban se guardan en `data/kanban/tarjetas.json` (ID `SUB-###`) y cada cambio de columna genera una entrada de bitácora. | Cada tarjeta terminada tiene al menos una entrada de bitácora enlazada. | Alta | D | N |

## 10. Telemetría

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-69 | La telemetría registrará como mínimo: tiempo, posición, orientación, profundidad, presión, velocidad, empuje, nivel de lastre, batería y eventos. | Esquema en `data/telemetry.schema.json`. | Alta | E | M |
| RNF-70 | Frecuencia de muestreo configurable, por defecto **10 Hz** (`intervalMs` en el manifiesto). | Parámetro en la configuración. | Media | D | = |
| RNF-71 | Buffer en memoria con límite (p. ej. 10 min o 20 muestras por envío) para no saturar la memoria. | Memoria estable en sesiones largas. | Media | D | M |
| RNF-72 | Telemetría exportable a **JSON/JSONL** (y opcionalmente CSV). | El archivo es válido y reproducible. | Media | D | = |
| RNF-73 | Gráficas con Canvas 2D de profundidad y velocidad en el tiempo. | Gráficas en tiempo real. | Baja | D | = |
| RNF-99 | La telemetría se persiste en `data/telemetry/*.jsonl` mediante `POST /api/telemetry` al servidor local; si el servidor no responde, se registra un `WARN` y la app sigue. | Tras una sesión existe un `.jsonl` con las muestras. | Media | D | N |

## 11. Seguridad

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-74 | El servidor escuchará solo en `127.0.0.1` (`server.listen(PORT, '127.0.0.1')`). | No es accesible desde otra máquina. | Media | D | M |
| RNF-75 | El servidor impedirá *path traversal*: resolverá la ruta y comprobará que queda dentro de la carpeta del proyecto; solo `POST /api/telemetry` escribe, y solo en `data/telemetry/`. | Una petición a `/../` devuelve 403 o 404. | Media | D | M |
| RNF-76 | El código propio no usará `eval`, `new Function` ni `innerHTML` con datos no confiables. | Revisión de código. | Media | D | M |
| RNF-77 | Content-Security-Policy con origen propio (`'self'`) y los permisos que Babylon.js necesite (`blob:` y `data:` para texturas, `wasm-unsafe-eval` solo si se usa WASM). | Cabecera presente y sin violaciones en la consola. | Baja | D | M |
| RNF-78 | No se recogen ni envían datos personales; las únicas peticiones salientes son a `localhost`. | Network sin dominios externos. | Alta | D | M |

## 12. Compatibilidad

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-79 | Últimas 2 versiones de **Chrome, Edge y Firefox** (Safari deseable). | Matriz de pruebas en la bitácora. | Alta | D | = |
| RNF-80 | Requiere **WebGL2**; si no existe, se muestra un mensaje de incompatibilidad. | Mensaje visible sin WebGL2. | Alta | D | M |
| RNF-81 | Hardware mínimo: CPU de 4 núcleos, 8 GB de RAM y GPU integrada de 2018 o posterior. | Documentado en el README y probado. | Media | D | = |

## 13. Accesibilidad

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-82 | Texto del HUD con contraste ≥ 4.5:1 (WCAG AA). | Verificación con herramienta de contraste. | Media | D | = |
| RNF-83 | Controles reasignables y menús navegables con teclado. | Configuración de teclas en JSON o desde la UI. | Baja | D | = |
| RNF-84 | Las alertas no dependen solo del color: incluyen icono SVG y texto. | Revisión visual. | Media | D | = |
| RNF-85 | HTML semántico: `lang="es"`, `<title>`, un único `<h1>`, IDs únicos. | Validador W3C sin errores. | Baja | D | = |

## 14. Restricciones académicas y legales

| ID | Requisito | Criterio de aceptación | Prior. | Origen | Cambio |
|---|---|---|---|---|---|
| RNF-86 | Proyecto **desde cero**: sin plantillas ni proyectos de terceros. | Historial de Git y bitácora lo evidencian. | Alta | E | = |
| RNF-87 | Recursos de terceros con licencia compatible (CC0, CC-BY…) y atribuidos. | `CREDITS.md` con fuente y licencia de cada recurso. | Alta | D | = |
| RNF-88 | Se respetan las licencias de Babylon.js (Apache 2.0) y de cualquier otro componente incluido. | Licencias incluidas en `vendor/`. | Media | D | M |
| RNF-89 | No se usa ninguna tecnología prohibida. Cualquier duda se resuelve descartando la tecnología. | Auditoría final con *checklist* antes de entregar. | Alta | E | = |

---

## Resumen

| Categoría | Nº RNF | E | D | ? |
|---|---|---|---|---|
| Restricciones tecnológicas | 9 | 7 | 2 | 0 |
| Formatos | 8 | 6 | 2 | 0 |
| Portabilidad / Offline | 6 | 1 | 5 | 0 |
| Rendimiento | 7 | 0 | 7 | 0 |
| Fidelidad física | 16 | 5 | 11 | 0 |
| Usabilidad | 7 | 0 | 7 | 0 |
| Fiabilidad | 5 | 0 | 5 | 0 |
| Mantenibilidad | 8 | 1 | 7 | 0 |
| Trazabilidad / Documentación | 11 | 6 | 4 | 1 |
| Telemetría | 6 | 1 | 5 | 0 |
| Seguridad | 5 | 0 | 5 | 0 |
| Compatibilidad | 3 | 0 | 3 | 0 |
| Accesibilidad | 4 | 0 | 4 | 0 |
| Académicas / Legales | 4 | 2 | 2 | 0 |
| **Total** | **99** | **29** | **69** | **1** |

> [!IMPORTANT]
> Los 28 requisitos `E` con prioridad `Alta` son **descalificantes** si no se cumplen (stack, formatos, offline, sin frameworks, elementos obligatorios). RNF-62 (uso de IA) también es `Alta`, pero está pendiente de confirmar.

> [!NOTE]
> Los umbrales numéricos de los requisitos derivados (FPS, tiempos, tamaños) son propuestas razonables. Ajústalos si el profesor o la rúbrica indican otros valores.

## Cambios respecto a la versión anterior

- **ROV → submarino de exploración** en todo el documento (el proyecto es un submarino, no un vehículo remoto).
- **Babylon.js por UMD local** en vez de `@babylonjs/core` por npm: los módulos npm requieren bundler, lo que choca con RNF-06. `package.json` queda sin dependencias.
- **Havok** pasa a opcional: la física es propia.
- **Física ampliada** (RNF-91 a RNF-97) para cubrir todas las propiedades físicas: lastre, flotabilidad parcial, densidad variable, corrientes, batería, colapso, masa añadida e inercia.
- **Kanban** sustituye la opción abierta de metodología (RNF-63, RNF-98).
- **JSON y Markdown** para objetivos, rúbricas y lecciones, con rutas alineadas a la estructura real (`data/` y `docs/`).
- **Telemetría** persistida por el servidor local (RNF-99); RNF-78 aclara que las peticiones a `localhost` están permitidas.
- **Seguridad**: servidor en `127.0.0.1`, protección contra *path traversal* y CSP realista para Babylon.js.
- **`.gltf` con `.bin`** permitido, y MIME de `.bin` añadido.
- **Nombres**: kebab-case para recursos y datos; PascalCase permitido en archivos de clase.
- **Pérdida de foco**: se limita el `deltaTime` acumulado.
- **Conteo corregido**: eran 29 requisitos E y Alta, no 30, porque RNF-08 es `Media`.
