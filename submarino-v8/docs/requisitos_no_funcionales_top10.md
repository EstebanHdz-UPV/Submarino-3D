# Requisitos No Funcionales (Top 10) — Submarino de Exploración

Versión reducida: los 10 requisitos más necesarios, agrupando los obligatorios de la versión completa de 99.
La columna **Equivale a** indica qué RNF de la versión completa cubre cada uno.

**Leyenda:** `E` = explícito en las instrucciones · `D` = derivado · `?` = por confirmar con el profesor

| ID | Requisito | Criterio de aceptación | Origen | Equivale a |
|---|---|---|---|---|
| **RNF-01** | **Motor 3D:** exclusivamente **Babylon.js ≥ 9.0**, incluido de forma local en `vendor/babylon/`. | `BABYLON.Engine.Version` ≥ 9.0.0; no hay otro motor 3D; si la versión es menor, la app se detiene con un error en SLog. | E | 01, 07, 90 |
| **RNF-02** | **Frontend:** JavaScript puro con módulos ES (`import`/`export`). Prohibidos frameworks, TypeScript, transpiladores y bundlers. | Código propio con `<script type="module">`; 0 archivos `.ts`/`.jsx`/`.vue`; sin Vite, Webpack, Babel ni similares; `package.json` sin `dependencies`. | E | 02, 03, 04, 06 |
| **RNF-03** | **Node.js ≥ 18 solo para ejecutar**, nunca para desarrollar. El servidor usa solo módulos nativos y escucha solo en `127.0.0.1`. | `"engines": { "node": ">=18" }`; la app arranca con `npm start` o `node server.js`; sirve los tipos MIME correctos (incluido `.glb`, `.gltf`, `.bin`, `.svg`, `.webp`). | E | 05, 19, 21, 74, 75 |
| **RNF-04** | **Formatos de recursos:** modelos solo `.glb`/`.gltf`; imágenes solo PNG, JPG o WebP; iconos solo SVG. Prohibidos `.obj`, `.fbx`, `.blend`, `.stl`. | Búsqueda por extensión en el proyecto: 0 archivos de formatos no permitidos. | E | 09, 10, 11, 12 |
| **RNF-05** | **Funcionamiento 100 % offline:** todos los recursos se sirven localmente, con rutas relativas. | Con la red desactivada la app carga y corre sin errores; la pestaña Network no muestra dominios externos (solo `localhost`). | E | 17, 18, 22, 78 |
| **RNF-06** | **Datos en JSON y `manifest.json`:** parámetros físicos, especificaciones del submarino, objetivos, rúbricas, lecciones, tarjetas Kanban y textos de UI están en JSON; el manifiesto describe el proyecto (nombre, versión, autor, motor, módulos, datos, documentos). | Ningún parámetro configurable está fijo en el código; los JSON se validan al cargar y los errores se reportan en SLog. | E | 13, 14, 47, 56 |
| **RNF-07** | **Física fundamental (SI, paso fijo):** peso `W = m·g`, empuje de Arquímedes `B = ρ·g·V`, presión `P = P_atm + ρ·g·h`, arrastre `F_d = ½·ρ·C_d·A·v²` por eje, estabilidad CG/CB con par restaurador, masa añadida e inercia, movimiento con aceleración progresiva. Se integra con **paso de tiempo fijo** (60 Hz), independiente de los FPS. | Con masa = ρ·V el submarino es neutro (deriva < 0,05 m/s); a 10 m la presión ≈ 2 atm (±1 %); la velocidad terminal converge; el submarino se endereza tras una perturbación; la simulación es igual a 30 y a 144 FPS. | E | 26, 30, 31, 32, 33, 34, 35, 97 |
| **RNF-08** | **Física operativa:** lastre variable (`m_seco + m_agua_tanque`), flotabilidad parcial en superficie, densidad variable con profundidad y temperatura, corrientes, batería y consumo, límites y rampa de la hélice, y profundidad de colapso. | Más lastre hace descender y menos lo hace subir; la batería baja según el empuje; al superar `maxDepthM` hay aviso y daño o fin de misión; todo queda en telemetría. | E | 36, 91, 92, 93, 94, 95, 96 |
| **RNF-09** | **Trazabilidad:** **SLog** con niveles y marca de tiempo, **telemetría** (tiempo, posición, orientación, profundidad, presión, velocidad, empuje, lastre, batería, eventos) guardada en `data/telemetry/*.jsonl`, y **bitácora** completa desde cero, enlazada a cada tarjeta Kanban. | Cada entrada de SLog tiene `{ts, level, module, msg, data}`; tras una sesión existe un `.jsonl`; cada tarjeta terminada tiene al menos una entrada de bitácora con valores antes y después. | E | 59, 61, 69, 98, 99 |
| **RNF-10** | **Documentación y organización:** metodología **Kanban** (`docs/METODOLOGIA.md`, tablero, WIP, Definición de Terminado), objetivos, rúbricas y lecciones (JSON y Markdown), README, y código en módulos independientes (`scene`, `physics`, `submarine`, `controls`, `environment`, `ui`) sin dependencias circulares. | Existen `OBJETIVOS`, `RUBRICAS`, `LECCIONES`, `METODOLOGIA` y `README`; el grafo de imports no tiene ciclos; un tercero corre el proyecto solo con el README. | E | 51, 52, 53, 63, 64, 65, 66, 67 |

---

## Qué quedó fuera (y dónde reponerlo)

Estos temas pasan a ser **criterios de calidad** o de la Definición de Terminado, no requisitos principales:

- **Rendimiento** (≥ 60 FPS, carga ≤ 5 s): RNF-23 a RNF-29 de la versión completa.
- **Usabilidad y HUD:** RNF-39 a RNF-45.
- **Fiabilidad y compatibilidad:** RNF-46 a RNF-50 y RNF-79 a RNF-81.
- **Seguridad, accesibilidad y licencias:** RNF-74 a RNF-77, RNF-82 a RNF-85 y RNF-87 a RNF-89.
- **Uso de IA en la bitácora (RNF-62):** sigue pendiente de confirmar con el profesor; si es obligatorio, súmalo al RNF-09.

> [!NOTE]
> Los 10 requisitos son todos de origen `E` (explícito), así que cualquiera que falle puede ser descalificante.
