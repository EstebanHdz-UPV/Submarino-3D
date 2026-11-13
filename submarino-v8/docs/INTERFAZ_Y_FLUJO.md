# Interfaz (según el mockup) y flujo de trabajo con Trello + GitHub

Complementa a `METODOLOGIA.md` y `CRONOGRAMA.md`. Ubicación sugerida: `docs/INTERFAZ_Y_FLUJO.md`.

---

## 1. Del mockup a los módulos

El mockup muestra un flujo de 3 pasos (**Ensamblaje → Pruebas → Resultados**) con una barra lateral. Coincide con nuestro plan; solo faltan los libros y la elección de materiales.

| Pantalla del mockup | Qué muestra | Módulo | Tarjetas | Responsable |
|---|---|---|---|---|
| **Inicio** | Bienvenida y botón "Comenzar" | `ui` | SUB-035 | Oscar |
| **Ensamblaje** | Lista de piezas (con marca de colocada), vista 3D, botón "Siguiente" | `ui` + `scene` | SUB-029, SUB-025 | Oscar y Zoé |
| **Pruebas en el agua** | Vista 3D y condiciones (profundidad, velocidad, temperatura del agua) con "Iniciar prueba" | `ui` + `physics` | SUB-031, SUB-023 | Oscar y Nayma |
| **Estrés estructural** | Mapa de colores del esfuerzo del casco y mensaje "Sin fallas" | `scene` + `physics` | SUB-021, SUB-026 | Nayma y Zoé |
| **Resultados** | Profundidad máxima, velocidad máxima, temperatura, presión, estado "Aprobado" y "Guardar reporte" | `ui` | SUB-031, SUB-034 | Oscar y Esteban |
| **Configuración** | Tipo de agua, clima, gravedad, densidad, y opciones (malla, datos, modo simplificado) | `ui` + `core` | SUB-036 | Oscar |

### Lo que el mockup NO tiene y hay que agregar

| Falta | Cómo agregarlo |
|---|---|
| **Libros 1 y 2** | Dos entradas más en la barra lateral: "Libro de piezas" y "Libro de materiales" (SUB-030). |
| **Elección de material por pieza** | En Ensamblaje, al seleccionar una pieza, un selector de material con estadísticas en vivo (SUB-029). |
| **Estadísticas del diseño** | Panel con masa, flotabilidad neta, profundidad de colapso y costo (SUB-022). |
| **Probar con diseño incompleto** | Aviso con las piezas faltantes y consecuencias, pero sin bloquear el botón "Iniciar prueba". |
| **Cámara y reinicio** | Botones de cámara y de reiniciar (SUB-028). |

### Ajustes de piezas para que coincidan con el mockup

Las 6 piezas del mockup son el **catálogo mínimo (MVP)**, cada una con varias opciones:

| Pieza del mockup | Equivale a | Efecto físico |
|---|---|---|
| Casco principal | Casco de presión | Volumen, masa, resistencia, colapso |
| Módulo de propulsión | Hélice y motor | Empuje máximo y consumo |
| Tanque de lastre | Tanque de lastre | Masa variable y control de profundidad |
| Cabina de control | Domo o visor | Resistencia y visibilidad |
| Aletas | Planos y timones | Maniobrabilidad y arrastre |
| Torre de acceso | Torre y escotilla | Arrastre y riesgo de fuga |

Batería, focos y sonar se agregan en una segunda categoría "Equipo".

### Ajustes a las actividades del cronograma

No se agregan actividades; se redefinen estas para mantener 5 por persona y semana:

| Actividad | Ajuste |
|---|---|
| Oscar, Semana 1, #3 | Estructura HTML/CSS con *design tokens* **y las 5 pantallas del mockup** (Inicio, Ensamblaje, Pruebas, Resultados, Configuración) con navegación por `#hash`. |
| Oscar, Semana 2, #5 | Lista de piezas del mockup con marca de "colocada". |
| Oscar, Semana 3, #4 | Panel de condiciones de prueba: profundidad, velocidad y temperatura. |
| Zoé, Semana 3, #4 | Mapa de esfuerzo en colores sobre el casco (en lugar de solo "casco en rojo"). |
| Nayma, Semana 3, #2 | Además del factor de seguridad, entregar el esfuerzo **por sección del casco** para alimentar el mapa de colores. |
| Esteban, Semana 1, #4 | Crear el tablero en **Trello** y el repositorio en **GitHub** (ver sección 3). |
| Oscar, Semana 4, #1 | La pantalla de Resultados del mockup y el botón "Guardar reporte". |

Se añaden dos tarjetas: **SUB-035** (pantalla de Inicio y navegación) y **SUB-036** (pantalla de Configuración), ambas de Oscar y absorbidas por las actividades de arriba.

---

## 2. Notas técnicas de la interfaz

### 2.1 Cómo se construye sin frameworks

- **Estructura de la app:** HTML, CSS y JS puro con módulos ES. Cada pantalla es una función que pinta su contenido; la navegación usa `location.hash` (`#/ensamblaje`, `#/pruebas`, `#/resultados`, `#/configuracion`).
- **Capas:** el `<canvas>` de Babylon.js va al fondo; encima, la interfaz HTML. Durante las pruebas, un `<canvas>` 2D dibuja el HUD (brújula, profundidad, inclinación, sonar).
- **Iconos:** todos en SVG dentro de `assets/icons/`.
- **Textos:** en `data/i18n/es.json`.
- **Estilos:** variables CSS en `src/styles/tokens.css`. La paleta del mockup es azul marino oscuro de fondo, azul brillante de acento y verde para estados correctos (valores exactos: tomarlos de la imagen con un selector de color).

### 2.2 Cuidado con la física que se muestra

| Dato del mockup | Corrección o decisión |
|---|---|
| **Presión a 100 m: "10 atm"** | La presión **absoluta** a 100 m es ≈ 10,9 atm (1 atm de la atmósfera más ≈ 9,9 atm del agua). Mostrar "presión absoluta" o "manométrica" con su etiqueta. |
| **Gravedad "9.8 m/s²"** | Usar `9.81` (o `9.80665`) en `physics.json` y mostrar el mismo valor en Configuración. |
| **Densidad "1025 kg/m³"** | Correcto para agua de mar; el tipo de agua "Dulce" usa ≈ 1000 kg/m³. |
| **Mapa de esfuerzo en colores** | Es un modelo simplificado por secciones del casco (`σ = P·r/t`, con concentraciones en uniones y tapas), **no** un análisis de elementos finitos. Se colorea con colores por vértice o por anillo; hay que decir eso en el Libro 2 y en la documentación. |
| **Modo simplificado** | Desactiva corrientes, densidad variable y masa añadida para una versión didáctica. Debe estar en `physics.json`. |

---

## 3. Trello + GitHub: cómo se reparten el trabajo

Regla de oro: **Trello es la fuente de verdad del tablero y GitHub es la fuente de verdad del código.** Se enlazan con el ID `SUB-###`.

### 3.1 Tablero de Trello

**Listas (de izquierda a derecha):**
`Backlog` · `Listo` · `En progreso (máx. 2 por persona)` · `Verificación` · `Terminado`

El límite de lista (WIP) automático depende del plan de Trello; si no lo tienen, ponerlo en el nombre de la lista y que Esteban lo vigile.

**Etiquetas:**
- Un color por integrante: Nayma, Zoé, Oscar, Esteban.
- Por tipo: `fisica`, `funcionalidad`, `defecto`, `documentacion`, `aprendizaje`.
- Por clase de servicio: `urgente`, `fecha-limite`, `estandar`, `mejora`.
- `BLOQUEADA` (con el motivo en un comentario).

**Cada tarjeta:**
- **Título:** `SUB-006 · Peso y empuje de Arquímedes`
- **Descripción:** objetivo, propiedad física, valores de `physics.json` que usa.
- **Checklist "Criterios de aceptación":** los de la tarjeta.
- **Checklist "Definición de Terminado":** la lista de `METODOLOGIA.md`.
- **Fecha límite:** viernes de la semana del cronograma.
- **Adjuntos:** enlace al PR de GitHub y captura o video de la prueba.

**Automatizaciones útiles** (si el plan las permite): al mover una tarjeta a "Verificación", agregar la etiqueta de revisión; al mover a "Terminado", poner la fecha de cierre (sirve para medir cycle time).

### 3.2 Repositorio de GitHub

| Tema | Regla |
|---|---|
| **Ramas** | `main` protegida (solo por Pull Request). Una rama por tarjeta: `sub-006-arquimedes`. |
| **Commits** | Empiezan con el ID: `SUB-006: agrega empuje de Arquímedes`. |
| **Pull Request** | Título `SUB-006 · Peso y empuje`; enlaza la tarjeta de Trello; usa la plantilla de abajo; **Esteban revisa** (guardián de la DoD) antes de hacer *merge*. |
| **Defectos** | Tarjeta en Trello con la etiqueta `defecto`; el PR que lo corrige menciona el ID. |
| **Hitos** | Una etiqueta (tag) por semana: `hito-s1`, `hito-s2`, `hito-s3`, `hito-s4` y `v1.0.0` al final. |
| **Evidencia** | El historial de commits y PRs demuestra que el proyecto es "desde cero" (RNF-86 de la versión completa). |

**`.github/pull_request_template.md`**
```md
## Tarjeta
SUB-___ · (enlace a Trello)

## Qué cambia
(2 a 3 líneas)

## Definición de Terminado
- [ ] Cumple los criterios de aceptación de la tarjeta
- [ ] Funciona sin internet con `node server.js`
- [ ] Sin frameworks, TypeScript ni bundlers
- [ ] Formatos permitidos: .glb/.gltf, PNG/JPG/WebP, SVG
- [ ] Datos configurables en JSON
- [ ] Eventos registrados con SLog / telemetría si aplica
- [ ] Pruebas físicas hechas (si es tarjeta de física) con valores antes y después
- [ ] Entrada de bitácora agregada

## Evidencia
(captura, video o salida de la prueba)
```

**`.gitignore`**
```
node_modules/
.DS_Store
data/telemetry/*.jsonl
data/designs/*.json
!data/designs/ejemplo.json
```

**`.gitattributes`** (para que Git trate los modelos como binarios)
```
*.glb binary
*.png binary
*.jpg binary
*.webp binary
```

Dejar `vendor/babylon/` **dentro del repositorio**, para que cualquiera pueda clonar y ejecutarlo sin internet.

### 3.3 Cómo se conecta con la bitácora (RNF-61) y el JSON (RNF-06)

- Cada entrada de `docs/bitacora/entradas.json` incluye `"tarjeta": "SUB-006"`, `"trello": "<enlace>"` y `"commit": "<hash>"`.
- Cada semana, Esteban exporta el tablero de Trello como JSON y lo guarda en `docs/kanban/export-AAAA-MM-DD.json`; de ahí salen las métricas (lead time, cycle time y throughput) de `docs/kanban/METRICAS.md`.
- `data/kanban/tarjetas.json` deja de ser el origen y se convierte en una copia del último export. Así se cumple "contenidos en JSON" sin duplicar trabajo.

---

## 4. Tarjetas para cargar en Trello

Se pueden pegar varias líneas a la vez al crear tarjetas: Trello crea una tarjeta por línea. Lista inicial: **Listo** = Semana 1, **Backlog** = el resto.

| ID | Título | Responsable | Semana |
|---|---|---|---|
| SUB-001 | Estructura base del proyecto | Esteban | 1 |
| SUB-002 | Librerías locales (Babylon.js 9+ en vendor) | Esteban | 1 |
| SUB-003 | Configuración, SLog y telemetría | Esteban | 1 |
| SUB-004 | Escena, luz y niebla | Zoé | 1 |
| SUB-005 | Bucle principal de paso fijo | Esteban | 2 |
| SUB-006 | Peso y empuje de Arquímedes | Nayma | 1 |
| SUB-007 | Lastre base | Esteban | 2 |
| SUB-008 | Arrastre hidrodinámico | Nayma | 2 |
| SUB-009 | Masa añadida | Nayma | 2 |
| SUB-010 | Hélice y aceleración | Oscar | 1 |
| SUB-011 | Estabilidad CG/CB | Nayma | 2 |
| SUB-012 | Presión | Nayma | 2 |
| SUB-013 | Pantalla HUD y sonar | Oscar | 1 |
| SUB-014 | Modelo 3D en .glb | Zoé | 1 |
| SUB-015 | Atenuación de luz | Zoé | 2 |
| SUB-016 | Densidad variable | Nayma | 3 |
| SUB-017 | Corrientes | Nayma | 3 |
| SUB-018 | Batería y consumo | Oscar | 2 |
| SUB-019 | Objetivos de misión | Esteban | 1 |
| SUB-020 | Documentación | Esteban | 4 |
| SUB-021 | Materiales y esfuerzo del casco (colapso) | Nayma | 1 |
| SUB-022 | Estadísticas del ensamble y piezas faltantes | Nayma | 3 |
| SUB-023 | Motor de pruebas y escenarios | Nayma | 4 |
| SUB-024 | Validación con submarino real | Nayma | 4 |
| SUB-025 | Piezas `.glb` modulares y ensamblador visual | Zoé | 1 |
| SUB-026 | Focos, partículas, efectos de daño y mapa de esfuerzo | Zoé | 2 |
| SUB-027 | Ambientes visuales por escenario | Zoé | 3 |
| SUB-028 | Cámaras y reinicio | Oscar | 1 |
| SUB-029 | Interfaz del constructor y catálogo | Oscar | 1 |
| SUB-030 | Visores de los Libros 1 y 2 | Oscar | 3 |
| SUB-031 | Menú de pruebas y pantalla de resultados | Oscar | 3 |
| SUB-032 | Esquemas JSON de piezas, materiales y reglas | Esteban | 1 |
| SUB-033 | Contenido de los dos libros | Esteban | 3 |
| SUB-034 | Guardado y carga de diseños | Esteban | 2 |
| SUB-035 | Pantalla de Inicio y navegación | Oscar | 1 |
| SUB-036 | Pantalla de Configuración | Oscar | 2 |

La columna "Semana" indica cuándo se **empieza** la tarjeta; muchas se extienden a la semana siguiente, como marca el cronograma.
