# Rúbrica oficial — Simulador de Submarinos 3D (STEAM)

Versión 1.0.0 · 2026-11-10 · archivo de datos: `data/rubrics.json`

Rúbrica analítica con la que evaluacion.js califica a cada alumno (0–100) a partir de la telemetría de la Ruta STEAM y del simulador. Sustituye a la plantilla R1–R8.

**Cómo se usa:** src/core/evaluacion.js toma de aquí los pesos por dimensión (pesosDesdeRubrica): si el profesor cambia un peso, basta con editar este archivo. Los umbrales de nivel deben coincidir con NIVELES_DESEMPENO de evaluacion.js; tests/core/rubrica.test.js falla si se desalinean.

## Niveles

| Nivel | Nombre | Puntaje mínimo | Significado |
|---|---|---|---|
| 4 | Excelente | 85 | Domina el criterio y lo aplica sin ayuda; la evidencia es completa y correcta. |
| 3 | Bueno | 70 | Cumple el criterio con errores menores que no afectan el resultado. |
| 2 | Suficiente | 50 | Cumple lo esencial, con errores o evidencia incompleta. |
| 1 | Insuficiente | 0 | No cumple el criterio o no hay evidencia. |

Aprobatorio: 50 / 100. Puntaje global = Σ (puntaje de la dimensión × peso / 100). El nivel se asigna con los umbrales de `niveles`.

## Criterios

| ID | Dimensión | Criterio | Peso (%) | Objetivos | Evidencia |
|---|---|---|---|---|---|
| R-M | M | Matemáticas: cálculo hidrostático y lastre | 20 | OE-01, OE-02 | Eventos matematicas_intento de la Fase M (compuerta de cálculo) y cuestionario del módulo M. |
| R-S | S | Ciencias: flotabilidad (Arquímedes) y límites de presión | 20 | OE-01, OE-02 | Eventos ciencia_intento de la Fase S (|B − W| ≤ 5 %), colapsos y choques registrados en el simulador. |
| R-E | E | Ingeniería: ensamblaje y validación del prototipo | 25 | OE-01, OE-03 | Eventos objeto_colocado (piezas distintas en el ensamblaje 3D) y dictamen de las pruebas. |
| R-T | T | Tecnología: control automático por bloques y pilotaje | 20 | OE-01, OE-04 | Eventos programa_ejecutado (orden leer → comparar → ajustar), recorrido en coordenadas X, Y, Z y actividad. |
| R-A | A | Arte y diseño: exploración visual, biomimética y entrega | 15 | OE-01, OE-05 | Modos de cámara usados (registrados en cada muestra) y evento biomimetica_completada con la reflexión final. |

Total: 100 %

## Descriptores por nivel

### R-M · Matemáticas: cálculo hidrostático y lastre

| Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |
|---|---|---|---|
| Calcula P = ρ·g·h correctamente al primer intento, con unidades SI, y elige un lastre coherente con la profundidad. | Calcula la presión correctamente tras algún intento fallido; el lastre elegido es razonable. | Llega al resultado con varios errores o con unidades mezcladas. | No completa el cálculo o el resultado es incorrecto. |

### R-S · Ciencias: flotabilidad (Arquímedes) y límites de presión

| Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |
|---|---|---|---|
| Calibra la flotabilidad neutra (|B − W| ≤ 5 %) y navega sin colapsos ni choques repetidos. | Logra la flotabilidad neutra con ayuda de varios intentos; sin colapsos. | Entiende la relación empuje-peso pero no logra el equilibrio o tiene un colapso. | No relaciona empuje, peso y presión; colapsos o choques frecuentes. |

### R-E · Ingeniería: ensamblaje y validación del prototipo

| Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |
|---|---|---|---|
| Ensambla 5 o más subsistemas compatibles y corrige el diseño a partir del dictamen de prueba. | Ensambla 4 subsistemas compatibles y ejecuta al menos una prueba. | Ensambla 3 subsistemas; el diseño no se valida con pruebas. | Menos de 3 subsistemas o diseño sin piezas obligatorias. |

### R-T · Tecnología: control automático por bloques y pilotaje

| Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |
|---|---|---|---|
| Programa el control de profundidad en el orden correcto y pilota el submarino con actividad constante. | Programa correctamente tras algún intento y recorre el escenario. | El programa tiene el orden incorrecto o el pilotaje es mínimo. | No ejecuta el programa ni pilota. |

### R-A · Arte y diseño: exploración visual, biomimética y entrega

| Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |
|---|---|---|---|
| Usa 3 o más modos de cámara, justifica la inspiración biomimética y la iluminación, y entrega la reflexión. | Usa 2 modos de cámara y entrega la reflexión. | Usa un solo modo de cámara; la reflexión es superficial. | No entrega la reflexión final. |

## Criterios del entregable del equipo (R1–R8)

Se conservan para revisar el software del equipo; no intervienen en la calificación del alumno.

| ID | Criterio | Qué se evalúa | Peso (%) |
|---|---|---|---|
| R1 | Stack tecnológico | Babylon.js ≥ 9, JS puro con módulos ES, sin frameworks, sin TypeScript, Node ≥ 18 solo para ejecutar. | 15 |
| R2 | Formatos y recursos | Solo .glb/.gltf, PNG/JPG/WebP y SVG; datos en JSON; manifest.json. | 10 |
| R3 | Funcionamiento sin conexión | Todo se sirve localmente. | 10 |
| R4 | Fidelidad física | Propiedades físicas implementadas en SI y validadas. | 20 |
| R5 | Funcionalidad del simulador | Constructor, libros, pruebas, dictamen, piloto y HUD. | 20 |
| R6 | Trazabilidad | SLog, telemetría y bitácora completas, con uso de IA documentado. | 10 |
| R7 | Metodología Kanban | Tablero en Trello, WIP, DoD, métricas y PR en GitHub. | 10 |
| R8 | Documentación | README, objetivos, rúbricas, lecciones y créditos. | 5 |
