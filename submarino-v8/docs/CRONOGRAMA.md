# Simulador de Submarino: alcance ampliado y cronograma de 1 mes

Equipo: Nayma (Física) · Zoé (Mundo 3D) · Oscar (HUD y controles) · Esteban (Coordinación / Líder Kanban)
Metodología: Kanban (WIP máximo de 2 tarjetas "En progreso" por persona)
Periodo propuesto: **lunes 26 de octubre – domingo 22 de noviembre de 2026** (4 semanas). Si empiezan otro día, solo se recorren las fechas.

---

## 1. Concepto: de "manejar un submarino" a "construirlo y probarlo"

El flujo del simulador es:

```
 LIBROS (consulta)            CONSTRUCTOR                PRUEBAS                  DICTAMEN
 Libro 1: piezas y   ──►  Armar el submarino   ──►  Elegir escenario   ──►  Aprobado / Falló
 orden de armado           pieza por pieza            y probar (aunque         + causas + estadísticas
 Libro 2: materiales       con materiales y           el diseño esté           + gráficas
 por escenario/prof.       variantes                  incompleto)
```

### 1.1 Los dos libros (contenido en JSON, visor propio en la app)

| Libro | Contenido | Archivo de datos |
|---|---|---|
| **Libro 1: Manual de piezas y ensamblaje** | Cada pieza con su ficha (masa, volumen, función), dónde se monta, con qué se conecta, piezas obligatorias y opcionales, y el orden de armado con despiece. | `data/books/libro-piezas.json` |
| **Libro 2: Manual de materiales** | Qué material usar según el escenario y la profundidad: densidad, resistencia, costo, ventajas y límites. Incluye la presión esperada por profundidad. | `data/books/libro-materiales.json` |

### 1.2 Catálogo mínimo de piezas (varias opciones por tipo)

| Tipo | Opciones (ejemplo) | Qué afecta en la física |
|---|---|---|
| Casco de presión | Cilíndrico / esférico / híbrido; varios espesores | Volumen, masa, resistencia, arrastre |
| Tapas y domos | Plana, semiesférica, visor acrílico | Resistencia, visibilidad |
| Tanques de lastre | Pequeño / mediano / grande | Masa variable, control de profundidad |
| Hélices / propulsores | 3 potencias y eficiencias | Empuje máximo, consumo |
| Planos y timones | Profundidad, dirección | Maniobrabilidad |
| Baterías | 3 capacidades (Wh) | Autonomía y masa |
| Flotabilidad fija | Espuma sintáctica por profundidad | Flotabilidad neutra |
| Equipo | Focos, sonar, cámara, brazo | Consumo, masa, arrastre |
| Lastre de emergencia | Peso soltable | Prueba de emergencia |

### 1.3 Materiales con datos reales (valores aproximados: verificar con fichas técnicas y citar fuente en `CREDITS.md`)

| Material | Densidad (kg/m³) | Límite elástico (MPa) | Uso típico |
|---|---|---|---|
| Aluminio 6061-T6 | 2700 | ~276 | Poca profundidad, económico |
| Aluminio 7075-T6 | 2810 | ~503 | Profundidad media |
| Acero HY-80 | 7850 | ~552 | Cascos resistentes, mayor masa |
| Titanio Ti-6Al-4V | 4430 | ~880 | Gran profundidad, costoso |
| Compuesto de fibra de carbono | ~1600 | ~500–600 (según laminado) | Ligero, a presión es más delicado |
| Acrílico PMMA | ~1180 | ~110 (compresión) | Visores y domos |
| Espuma sintáctica | 450–650 | según profundidad nominal | Flotabilidad fija |

### 1.4 Escenarios de prueba y presión esperada

Presión ≈ `P_atm + ρ·g·h`, con ρ ≈ 1025 kg/m³.

| Escenario | Profundidad | Presión aprox. | Reto principal |
|---|---|---|---|
| Aguas someras | 0–30 m | 1–4 atm | Flotabilidad y trimado |
| Arrecife / plataforma | 30–200 m | 4–21 atm | Maniobra y corrientes |
| Mesopelágico | 200–1000 m | 21–100 atm | Resistencia del casco y oscuridad |
| Profundo | 1000–4000 m | 100–400 atm | Materiales caros y colapso |

### 1.5 Pruebas disponibles

| Prueba | Qué mide |
|---|---|
| Flotabilidad y trimado en superficie | Calado, inclinación, flotabilidad neta |
| Inmersión estática | Respuesta del lastre y estabilidad CG/CB |
| Profundidad de diseño | Esfuerzo del casco, factor de seguridad y colapso |
| Maniobra | Radio de giro, aceleración, velocidad terminal |
| Autonomía | Consumo de batería a velocidad crucero |
| Corriente | Deriva y capacidad de mantener rumbo |
| Emergencia | Soltar lastre, pérdida de energía, fuga |

### 1.6 Probar con un diseño incompleto

El simulador **no bloquea** la prueba: calcula con lo que hay y aplica las consecuencias reales.

| Pieza que falta | Consecuencia |
|---|---|
| Hélice | Sin empuje; solo deriva con corrientes |
| Tanque de lastre | No hay control de profundidad |
| Tapa del casco | Hay inundación y la masa aumenta |
| Batería | Sin energía: no hay propulsión ni HUD |
| Flotabilidad fija | Flotabilidad negativa: se hunde |

### 1.6.1 Estadísticas en vivo del diseño (apegadas a la realidad)

Masa total, volumen desplazado, flotabilidad neta (kg), centro de gravedad y de flotación, altura metacéntrica, coeficiente de arrastre total, empuje máximo, velocidad máxima, autonomía (Wh y horas), profundidad de colapso, factor de seguridad y costo.

Fórmulas base: peso `W = m·g`; empuje `B = ρ·g·V`; presión `P = P_atm + ρ·g·h`; esfuerzo en cilindro de pared delgada `σ = P·r/t`; en esfera `σ = P·r/(2t)`; arrastre `F_d = ½·ρ·C_d·A·v²`; potencia de propulsión `P = F·v/η`.

**Validación:** comparar el simulador con un submarino real publicado (por ejemplo Alvin o Limiting Factor): masa, profundidad nominal, velocidad y autonomía.

---

## 2. Nuevos requisitos funcionales

Se agregan a los RF-01 a RF-10 del documento.

| ID | Requisito |
|---|---|
| RF-11 | **Constructor:** el usuario arma el submarino desde cero, pieza por pieza. |
| RF-12 | **Variantes:** cada tipo de pieza tiene varias opciones con estadísticas distintas. |
| RF-13 | **Libro 1:** manual de piezas y orden de ensamblaje, consultable en la app. |
| RF-14 | **Libro 2:** manual de materiales por escenario y profundidad. |
| RF-15 | **Materiales:** cada pieza se asigna a un material que cambia masa, resistencia y costo. |
| RF-16 | **Estadísticas en vivo** del diseño mientras se arma. |
| RF-17 | **Prueba con diseño incompleto**, con consecuencias físicas realistas. |
| RF-18 | **Menú de pruebas y escenarios.** |
| RF-19 | **Dictamen:** resultado de la prueba (aprobado o falló), causas, estadísticas y gráficas. |
| RF-20 | **Guardar y cargar diseños** en JSON. |

## 3. Nuevas tarjetas Kanban (continúan después de SUB-020)

| ID | Tarjeta | Responsable |
|---|---|---|
| SUB-021 | Modelo de materiales y esfuerzo del casco (colapso) | Nayma |
| SUB-022 | Estadísticas del ensamble y efecto de piezas faltantes | Nayma |
| SUB-023 | Motor de pruebas y escenarios (física) | Nayma |
| SUB-024 | Validación con un submarino real y ajuste de constantes | Nayma |
| SUB-025 | Piezas modulares `.glb` y ensamblador visual con puntos de montaje | Zoé |
| SUB-026 | Focos, partículas y efectos de daño | Zoé |
| SUB-027 | Ambientes visuales por escenario de prueba | Zoé |
| SUB-028 | Cámaras múltiples y reinicio de exploración (RF-09 y RF-10) | Oscar |
| SUB-029 | Interfaz del constructor y catálogo | Oscar |
| SUB-030 | Visores de los Libros 1 y 2 | Oscar |
| SUB-031 | Menú de pruebas y pantalla de dictamen | Oscar |
| SUB-032 | Esquemas JSON de piezas, materiales y reglas de ensamblaje | Esteban |
| SUB-033 | Contenido de los dos libros | Esteban (con Nayma y Zoé) |
| SUB-034 | Guardado y carga de diseños (`POST /api/designs`) | Esteban |

---

## 4. Cronograma de 4 semanas

Cada integrante tiene **5 actividades por semana**. Las actividades con la etiqueta **Verificación** pasan por esa columna antes de "Terminado".

| Semana | Fechas | Tema | Hito de cierre |
|---|---|---|---|
| **1** | 26 oct – 1 nov | Cimientos y datos | El proyecto arranca con `node server.js` sin internet; escena base con submarino de prueba; esquemas JSON definidos |
| **2** | 2 – 8 nov | Física, piezas y HUD | Peso, empuje, arrastre y presión funcionando; 10 piezas `.glb`; HUD con datos reales; catálogo visible |
| **3** | 9 – 15 nov | Constructor, libros y materiales | El usuario arma un submarino (aunque incompleto), consulta los dos libros y lo prueba |
| **4** | 16 – 22 nov | Pruebas, validación y entrega | 7 pruebas con dictamen, validación con un submarino real, documentación y demo |

> Nota: el lunes 16 de noviembre es feriado por el aniversario de la Revolución (tercer lunes del mes). Si no hay clase ese día, la Semana 4 empieza el martes.

### Semana 1: Cimientos y datos (26 oct – 1 nov)

| Quién | # | Actividad | Tarjeta |
|---|---|---|---|
| **Esteban** | 1 | Crear estructura de carpetas, `package.json`, `server.js` (solo `127.0.0.1`) y `manifest.json` | SUB-001 |
| | 2 | Copiar Babylon.js 9+ a `vendor/` y verificar la versión al arrancar | SUB-002 |
| | 3 | Implementar SLog, Config y Telemetry (primer `.jsonl` en `data/telemetry/`) | SUB-003 |
| | 4 | Crear el tablero Kanban, `tarjetas.json` con SUB-001 a SUB-034 y la primera entrada de bitácora | Gestión |
| | 5 | Escribir los esquemas JSON de piezas y materiales (con Nayma) y definir las 4 misiones | SUB-032, SUB-019 |
| **Nayma** | 1 | Documentar propiedades y fórmulas físicas con datos de referencia reales en `docs/FISICA.md` | SUB-024 |
| | 2 | Definir `physics.json` (ρ, g, P_atm, densidad por profundidad) en SI | SUB-006 |
| | 3 | Implementar peso y empuje de Arquímedes en `PhysicsModule` | SUB-006 |
| | 4 | Flotabilidad parcial en superficie y prueba de flotabilidad neutra | SUB-006 |
| | 5 | Crear el catálogo de materiales en JSON con fuente de cada dato | SUB-021 |
| **Zoé** | 1 | Escena base: cámara, luz, fondo marino y niebla exponencial | SUB-004 |
| | 2 | Guía de arte y nomenclatura de nodos y puntos de montaje para los `.glb` | SUB-025 |
| | 3 | Modelar y exportar en `.glb` el casco y 2 piezas con sus pivotes | SUB-014 |
| | 4 | Cargador de `.glb` con alternativa procedural si falla la carga | SUB-014 |
| | 5 | Verificar formatos de recursos y tiempo de carga sin internet | Verificación |
| **Oscar** | 1 | Controles de teclado: avance, retroceso, lateral, subir/bajar y giro | SUB-010 |
| | 2 | Cámaras múltiples: seguimiento, órbita y de taller | SUB-028 |
| | 3 | Estructura HTML/CSS con *design tokens* y menú principal (Constructor, Pruebas, Libros) | SUB-029 |
| | 4 | Iconos SVG: batería, alerta, motor, profundidad, brújula, libro y pieza | SUB-013 |
| | 5 | Wireframes del constructor y de los dos libros, aprobados por el equipo | SUB-029, SUB-030 |

### Semana 2: Física, piezas y HUD (2 – 8 nov)

| Quién | # | Actividad | Tarjeta |
|---|---|---|---|
| **Esteban** | 1 | Bucle principal de paso fijo con tope de `dt` y pausa al perder el foco | SUB-005 |
| | 2 | Lastre base: tanques con llenado de 0 a 1 integrados a la masa | SUB-007 |
| | 3 | Escribir `parts.json` (~12 piezas con masa, volumen y puntos de conexión) con Nayma y Zoé | SUB-032 |
| | 4 | Guardado y carga de diseños en JSON (`POST /api/designs`) | SUB-034 |
| | 5 | Revisión semanal, métricas Kanban y bitácora con valores antes y después | Gestión |
| **Nayma** | 1 | Arrastre hidrodinámico por eje y velocidad terminal | SUB-008 |
| | 2 | Masa añadida e inercia por eje | SUB-009 |
| | 3 | Presión hidrostática y alertas de profundidad | SUB-012 |
| | 4 | Estabilidad CG/CB, par restaurador y altura metacéntrica | SUB-011 |
| | 5 | Verificar SUB-006, SUB-008 y SUB-012 (neutralidad, velocidad terminal, ≈ 2 atm a 10 m) | Verificación |
| **Zoé** | 1 | Modelar y exportar hasta llegar a 10 piezas `.glb` (tanques, hélice, timón, batería, domo, foco, sonar) | SUB-025 |
| | 2 | Atenuación de luz y cambio de color con la profundidad | SUB-015 |
| | 3 | Focos de exploración (SpotLight) en el submarino | SUB-026 |
| | 4 | Partículas en suspensión (sedimento y nieve marina) | SUB-026 |
| | 5 | Lecho marino en `.glb` | SUB-014 |
| **Oscar** | 1 | Hélice y aceleración con rampa y límite de empuje | SUB-010 |
| | 2 | HUD en Canvas 2D: medidor de profundidad, brújula e inclinación | SUB-013 |
| | 3 | Consumo de batería según el empuje (`P = F·v/η` más carga de equipos) | SUB-018 |
| | 4 | Sonar en Canvas 2D: barrido y distancia al fondo | SUB-013 |
| | 5 | Catálogo de piezas en la UI con filtro y ficha de estadísticas desde `parts.json` | SUB-029 |

### Semana 3: Constructor, libros y materiales (9 – 15 nov)

| Quién | # | Actividad | Tarjeta |
|---|---|---|---|
| **Esteban** | 1 | Reglas de compatibilidad en JSON: puntos de montaje, dependencias, piezas obligatorias y opcionales | SUB-032 |
| | 2 | Redactar el contenido del Libro 1 (piezas y orden de armado) | SUB-033 |
| | 3 | Redactar el contenido del Libro 2 (materiales por escenario) con datos de Nayma | SUB-033 |
| | 4 | Definir las misiones de prueba y sus criterios de aprobado en `objectives.json` | SUB-019 |
| | 5 | Revisión semanal: Definición de Terminado de las tarjetas en Verificación, bitácora y métricas | Gestión |
| **Nayma** | 1 | Estadísticas del ensamble: masa, volumen, CG, CB, flotabilidad neta y C_d total | SUB-022 |
| | 2 | Esfuerzo del casco (`σ = P·r/t`), factor de seguridad y profundidad de colapso por material | SUB-021 |
| | 3 | Efectos de piezas faltantes: sin hélice, sin lastre, tapa abierta (inundación) | SUB-022 |
| | 4 | Densidad variable y corrientes marinas | SUB-016, SUB-017 |
| | 5 | Verificar SUB-009, SUB-011, SUB-016 y SUB-017 | Verificación |
| **Zoé** | 1 | Ensamblador visual: instanciar piezas `.glb` en puntos de montaje con vista previa y ajuste | SUB-025 |
| | 2 | Cámara de taller: órbita sobre el ensamble y resaltado de la pieza elegida | SUB-025 |
| | 3 | Ilustraciones y despieces para el Libro 1 (PNG/WebP o SVG) | SUB-033 |
| | 4 | Efectos de daño: casco en rojo a presión crítica y burbujas en fuga | SUB-026 |
| | 5 | Ambientes visuales por escenario (luz y niebla para cada profundidad) | SUB-027 |
| **Oscar** | 1 | Interfaz del constructor: añadir, quitar y cambiar piezas, con validación y estadísticas en vivo | SUB-029 |
| | 2 | Visor del Libro 1 con páginas desde JSON | SUB-030 |
| | 3 | Visor del Libro 2 con tabla filtrable por profundidad y escenario | SUB-030 |
| | 4 | Menú de pruebas: elegir escenario y botón "Probar" con advertencias si el diseño está incompleto | SUB-031 |
| | 5 | Reinicio de exploración (RF-10) y verificación de que el HUD coincide con el movimiento real | SUB-028, SUB-013 |

### Semana 4: Pruebas, validación y entrega (16 – 22 nov)

| Quién | # | Actividad | Tarjeta |
|---|---|---|---|
| **Esteban** | 1 | Integración completa y prueba sin internet en Chrome, Edge y Firefox | Gestión |
| | 2 | Auditoría final de los RNF-01 a RNF-10 (formatos, frameworks, offline, versión de Babylon.js) | DoD |
| | 3 | Documentación final: README, OBJETIVOS, RUBRICAS, LECCIONES, METODOLOGIA y CREDITS | SUB-020 |
| | 4 | Cerrar la bitácora, métricas finales (lead time, cycle time, throughput) y retrospectiva | Gestión |
| | 5 | Guion de la demo y congelar la versión 1.0.0 en `manifest.json` | SUB-020 |
| **Nayma** | 1 | Motor de pruebas: ejecutar los escenarios y generar métricas | SUB-023 |
| | 2 | Prueba de emergencia (soltar lastre, pérdida de energía y fuga) con eventos en telemetría | SUB-023 |
| | 3 | Validar contra un submarino real: masa, profundidad nominal, velocidad y autonomía | SUB-024 |
| | 4 | Ajuste fino de constantes con registro antes/después en la bitácora | SUB-024 |
| | 5 | Verificación final de todas las tarjetas de física y revisión de unidades SI | Verificación |
| **Zoé** | 1 | Optimización: LOD, instancias y `freezeWorldMatrix`; meta de ≥ 30 FPS (objetivo 60) | SUB-014 |
| | 2 | Pulido visual de los escenarios: cáusticas y rayos de luz | SUB-015, SUB-027 |
| | 3 | Auditoría de formatos de todos los recursos (`.glb`/`.gltf`, PNG/JPG/WebP, SVG) | Verificación |
| | 4 | Pruebas de carga sin internet y de las alternativas ante recursos faltantes | Verificación |
| | 5 | Capturas y video corto como evidencia para bitácora y presentación | Documentación |
| **Oscar** | 1 | Pantalla de dictamen: aprobado o falló, causas, estadísticas y gráficas en Canvas 2D | SUB-031 |
| | 2 | Alertas con iconos SVG: peligro, batería baja y profundidad crítica | SUB-013 |
| | 3 | Exportar el diseño y el reporte de prueba a JSON | SUB-031, SUB-034 |
| | 4 | Prueba de usabilidad con 2 o 3 personas externas y ajustes | SUB-029 |
| | 5 | Verificación final: HUD vs física, controles y cámaras; actualizar el tablero | Verificación |

---

## 5. Dependencias críticas

| Dependencia | Quién espera | Fecha límite |
|---|---|---|
| Esquemas JSON de piezas y materiales | Todos | Fin de la Semana 1 |
| `parts.json` con masas y volúmenes reales | Nayma, Zoé, Oscar | Mitad de la Semana 2 |
| Estadísticas del ensamble (SUB-022) | Oscar (panel en vivo) | Inicio de la Semana 3 |
| Puntos de montaje en los `.glb` | Zoé, Esteban | Fin de la Semana 2 |
| Datos de materiales para el Libro 2 | Esteban | Inicio de la Semana 3 |
| Motor de pruebas (SUB-023) | Oscar (dictamen) | Inicio de la Semana 4 |

## 6. Riesgos y qué recortar primero

El alcance es grande para 4 semanas. Si el tablero se atrasa, recorten en este orden:

1. Partículas, cáusticas y rayos de luz (SUB-026 y SUB-027).
2. Densidad variable y corrientes (SUB-016 y SUB-017).
3. Prueba de corriente y prueba de emergencia.
4. Reducir el catálogo de 12 a 8 piezas y de 7 a 5 materiales.

**No se recorta:** el constructor, los dos libros, el cálculo de presión y colapso, probar con diseño incompleto, ni el cumplimiento de los RNF (formatos, offline, sin frameworks).

## 7. Ritmo Kanban durante el mes

| Cuándo | Qué | Responsable |
|---|---|---|
| Cada sesión | Revisión del tablero (5 min): bloqueos y WIP ≤ 2 por persona | Esteban |
| Cada cambio de columna | Una entrada de bitácora | Quien mueve la tarjeta |
| Viernes | Revisión semanal: demo del hito, métricas y reposición del Backlog | Todos |
| Fin de la Semana 2 | Retrospectiva corta | Todos |
| Fin de la Semana 4 | Retrospectiva final y entrega | Todos |
