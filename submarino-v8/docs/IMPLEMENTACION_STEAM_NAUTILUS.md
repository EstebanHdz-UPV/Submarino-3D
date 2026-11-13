# Documentación de implementación: aprendizaje STEAM e interfaz NAUTILUS

**Proyecto:** Simulador de Submarinos 3D  
**Versión de referencia:** `manifest.json` (0.1.0)  
**Fecha de documentación:** 12 de noviembre de 2026  
**Alcance:** currículo STEAM, ruta de cinco fases, persistencia del avance e incorporación visual NAUTILUS.

---

## 1. Propósito

Este documento registra las ampliaciones realizadas al Simulador de Submarinos 3D. El trabajo se organizó en tres bloques:

1. Transformar el contenido de aprendizaje en una secuencia educativa STEAM.
2. Incorporar una ruta práctica de cinco fases desbloqueables, conectada con el constructor 3D existente.
3. Añadir una pantalla de inicio con la identidad visual NAUTILUS, inspirada en el diseño UX/UI proporcionado.

Las ampliaciones se incorporan al proyecto existente; no sustituyen el motor 3D, los módulos de física, el constructor, los escenarios de prueba ni el piloto manual.

## 2. Tecnologías y criterios de integración

| Elemento | Implementación |
|---|---|
| Lenguaje de aplicación | JavaScript con módulos ES |
| Interfaz | HTML y CSS |
| Motor 3D | Babylon.js 9.32, distribuido localmente |
| Servidor local | Node.js 18 o superior, módulos nativos |
| Datos | Archivos JSON |
| Persistencia de la ruta | API local y `data/avance_rutas.json`; respaldo en `localStorage` |
| Metodología declarada | Kanban (Trello + GitHub) |

La referencia de diseño entregada incluía una interfaz de React/TypeScript. Para respetar las reglas técnicas descritas en el proyecto (JavaScript, HTML y CSS sin frameworks, TypeScript ni bundlers), se tomó como referencia visual y se implementó el panel NAUTILUS en HTML/CSS/JavaScript. No se incorporó el código React/TypeScript como dependencia de ejecución.

## 3. Currículo de aprendizaje STEAM

### 3.1 Archivo de contenidos

El currículo se organiza en `data/lessons.json` con seis módulos:

| Orden | Identificador | Módulo | Enfoque |
|---:|---|---|---|
| 1 | `INTRO` | Introducción | Reto, propósito y funcionamiento del proyecto |
| 2 | `M` | Matemáticas | Magnitudes, unidades, geometría y presión |
| 3 | `S` | Ciencias | Flotabilidad, empuje, fuerzas y materiales |
| 4 | `E` | Ingeniería | Diseño, selección de piezas, ensamblaje y validación |
| 5 | `T` | Tecnología | Simulación 3D, controles, HUD y telemetría |
| 6 | `A` | Arte | Apariencia, composición, texturas y experiencia de usuario |

Cada módulo contiene contenido didáctico y preguntas de opción múltiple con respuesta correcta y explicación. La página `learn.html` presenta el contenido de aprendizaje y la evaluación asociada.

### 3.2 Ficha del proyecto y objetivos

El archivo `manifest.json` concentra los metadatos de la aplicación y agrega:

- `slug` y `proyecto_id`, para identificar el proyecto.
- `portada`, con la ruta de la imagen usada en la tarjeta del proyecto.
- `mapeoSTEAM`, que relaciona las disciplinas M, S, E, T y A con el simulador.
- `objetivos_evaluables`, con objetivo, indicador y evidencia.
- `curriculoSTEAM`, con la ubicación de los datos, cantidad de módulos, orden y tipo de evaluación.

La página `proyectos.html` presenta la ficha del proyecto utilizando estos datos.

## 4. Ruta pedagógica STEAM: cinco fases desbloqueables

La ruta se implementa en `ruta-steam.html` y sigue el orden M → S → E → T → A. La persona participante debe completar los criterios de una fase para habilitar la siguiente.

### 4.1 Fase M — Matemáticas: compuerta de cálculo

**Propósito:** aplicar la relación de presión hidrostática antes de iniciar el ensamblaje.

La pantalla permite introducir:

- Densidad del fluido, \(\rho\), en kg/m³.
- Gravedad, \(g\), en m/s².
- Profundidad, \(h\), en metros.
- Estado inicial del lastre.

Calcula la presión manométrica mediante \(P = \rho \cdot g \cdot h\), presenta el resultado en pascales y su equivalencia en atmósferas manométricas. La validación comprueba que los valores sean admisibles antes de registrar la fase como completada.

**Evidencia registrada:** densidad, gravedad, profundidad, presión calculada y decisión de lastre.

### 4.2 Fase S — Ciencias: laboratorio de flotabilidad

**Propósito:** comprender y calibrar el principio de Arquímedes.

La persona participante configura densidad del fluido, volumen desplazado, masa total y gravedad. El laboratorio calcula:

- Empuje: \(E = \rho \cdot g \cdot V\).
- Peso: \(W = m \cdot g\).
- Diferencia entre empuje y peso.
- Masa correspondiente a la condición de flotabilidad neutra.

La validación acepta una diferencia relativa máxima del 5 % entre empuje y peso.

**Evidencia registrada:** densidad, volumen, masa y diferencia entre empuje y peso.

### 4.3 Fase E — Ingeniería: ensamblaje

**Propósito:** aplicar el proceso de diseño y montaje mediante el constructor 3D ya existente.

La ruta enlaza al constructor del simulador, en lugar de crear un segundo ensamblador. Cuando una pieza se coloca correctamente, el módulo de ensamblaje emite el evento `object_colocado`. El servidor registra los identificadores de los puntos de montaje para evitar contar repetidamente el mismo punto.

La fase requiere cinco puntos de montaje únicos registrados. Al volver a la ruta, se actualiza el contador y se habilita la validación cuando se alcanza el mínimo.

**Evidencia registrada:** puntos de montaje únicos y número total de objetos colocados.

### 4.4 Fase T — Tecnología: programación por bloques

**Propósito:** construir la secuencia lógica de un controlador automático de profundidad.

La interfaz presenta tres bloques que pueden reordenarse con controles de flecha:

1. Leer la profundidad actual.
2. Comparar con la profundidad objetivo.
3. Ajustar el lastre automáticamente.

Se introducen la profundidad objetivo y la profundidad actual. La ejecución comprueba que el orden sea correcto y calcula la acción de control simulada: mantener profundidad, aumentar lastre para descender o vaciar lastre para ascender.

**Criterio de validación:** secuencia correcta, ejecución realizada y valores de profundidad no negativos.

**Evidencia registrada:** objetivo, profundidad inicial y secuencia de bloques.

### 4.5 Fase A — Artes: biomimética, iluminación y entrega

**Propósito:** integrar decisiones de diseño inspiradas en organismos marinos y comunicar la solución.

La pantalla permite seleccionar una referencia biomimética (delfín, tiburón, nautilus o pulpo), elegir un enfoque de iluminación submarina y redactar una reflexión final. La entrega requiere una explicación de al menos 20 caracteres.

**Evidencia registrada:** referente biomimético, diseño de iluminación y reflexión final.

## 5. Máquina de estados y persistencia

### 5.1 Estados

El estado de avance contiene los siguientes campos:

| Campo | Función |
|---|---|
| `desbloqueada` | Identificador de la fase que se encuentra habilitada |
| `completadas` | Lista de fases validadas |
| `datos` | Evidencias y valores capturados por fase |
| `eventos.objetos_colocados` | Total de puntos de montaje únicos registrados |
| `eventos.slots_colocados` | Identificadores de puntos de montaje registrados |

El flujo previsto es:

```text
M → S → E → T → A → Ruta completada
```

La interfaz muestra las fases bloqueadas y habilitadas, así como el número de fases completadas y los objetos colocados. La función de finalización registra los datos de la fase y avanza el estado a la siguiente etapa.

### 5.2 API local

El servidor `server.js` ofrece dos operaciones para la ruta:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/avance-rutas` | Recupera el estado actual; si no existe archivo, devuelve el estado inicial |
| POST | `/api/avance-rutas` | Guarda el avance o registra un evento de colocación |

Para registrar un montaje, el cliente envía un evento `object_colocado` con `slotId` y `partId`. El servidor mantiene la lista de puntos únicos y actualiza el contador.

El archivo persistente es `data/avance_rutas.json`. La página conserva también una copia de respaldo en `localStorage` para poder recuperar el progreso del navegador cuando la API local no está disponible. El servidor es la persistencia compartida para las páginas servidas desde la misma instancia.

## 6. Diseño UX/UI NAUTILUS

### 6.1 Objetivo visual

Se añadió `nautilus/index.html` como pantalla de inicio visual del producto. La propuesta adopta una identidad de exploración submarina con:

- Barra lateral de navegación en azul marino.
- Marca NAUTILUS y etiqueta de simulador naval.
- Panel principal de misión.
- Mensaje principal “Diseña. Construye. Sumérgete.”
- Ilustración vectorial del submarino y referencias visuales de profundidad.
- Tarjetas de acceso a la ruta STEAM, constructor y biblioteca.
- Indicador de avance de las cinco fases.
- Adaptación del diseño a pantallas pequeñas.

Los estilos están separados en `nautilus/style.css` y el indicador de avance se actualiza mediante `nautilus/app.js`.

### 6.2 Navegación

| Elemento del panel NAUTILUS | Destino |
|---|---|
| Inicio | `nautilus/index.html` |
| Biblioteca STEAM | `learn.html` |
| Ensamblaje 3D | `index.html` |
| Ruta STEAM | `ruta-steam.html` |
| Pruebas y simulación | `index.html` (módulo de simulación existente) |
| Resultados del proyecto | `proyectos.html` |

La interfaz NAUTILUS es una portada/panel de acceso. Las pantallas operativas del simulador siguen residiendo en la aplicación original. No se debe interpretar la portada como una sustitución del constructor 3D o de los módulos de prueba.

## 7. Estructura de archivos relevantes

```text
submarino-v4/
├── index.html
├── server.js
├── manifest.json
├── learn.html
├── proyectos.html
├── ruta-steam.html
├── nautilus/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/
│   ├── lessons.json
│   ├── objectives.json
│   ├── rubrics.json
│   └── avance_rutas.json   (se crea al guardar el primer avance)
├── src/
│   └── modules/
│       └── submarine/
│           └── Assembly.js
└── docs/
    ├── IMPLEMENTACION_STEAM_NAUTILUS.md
    ├── RUTA_STEAM.md
    ├── LECCIONES.md
    ├── OBJETIVOS.md
    ├── FISICA.md
    ├── METODOLOGIA.md
    └── ...
```

## 8. Instalación y ejecución

### Requisitos

- Node.js 18 o superior.
- Navegador moderno con soporte WebGL2 para el simulador 3D.
- No se requiere conexión a internet para ejecutar los recursos locales incluidos.

### Iniciar

Desde la carpeta raíz `submarino-v4`:

```bash
node server.js
```

También se puede utilizar:

```bash
npm start
```

Abrir en el navegador:

| Página | URL local |
|---|---|
| Panel NAUTILUS | `http://localhost:3000/nautilus/` |
| Simulador 3D | `http://localhost:3000/` |
| Aprendizaje | `http://localhost:3000/learn.html` |
| Ruta STEAM | `http://localhost:3000/ruta-steam.html` |
| Ficha del proyecto | `http://localhost:3000/proyectos.html` |

El servidor escucha en `127.0.0.1`, por lo que está pensado para uso local.

## 9. Pruebas y verificación

Se ejecutó la suite automatizada del proyecto mediante:

```bash
node --test
```

**Resultado observado en esta versión del proyecto:**

- 75 pruebas ejecutadas.
- 75 aprobadas.
- 0 fallidas.

La suite incluye verificaciones de física (presión, peso, empuje y lastre), ensamblaje, catálogo de piezas, estadísticas, validación de componentes y comportamiento de pantallas. Este resultado confirma que las pruebas automatizadas existentes pasan; no equivale a una prueba manual de usabilidad en todos los navegadores ni a una validación física experimental del submarino real.

## 10. Procedimiento de prueba manual recomendado

1. Iniciar el servidor con `node server.js`.
2. Abrir el panel NAUTILUS y comprobar que los enlaces llevan a las páginas indicadas.
3. Abrir `learn.html` y recorrer los seis módulos y sus cuestionarios.
4. Abrir `ruta-steam.html`; comprobar que M está habilitada y las fases posteriores aparecen bloqueadas.
5. Completar M y verificar que S se habilita.
6. Completar S y verificar que E se habilita.
7. Entrar al constructor, colocar cinco componentes en puntos de montaje distintos y regresar a la ruta.
8. Actualizar el contador de eventos y validar E.
9. En T, desordenar los bloques y comprobar que el programa no se valida; ordenarlos correctamente y ejecutar.
10. Completar A con una reflexión válida y confirmar que la ruta aparece completa.
11. Recargar la página y comprobar que el avance persiste.

## 11. Consideraciones y límites conocidos

- La ruta STEAM es una capa pedagógica conectada al constructor y a la API de avance; no reemplaza el simulador.
- La fase T evalúa una secuencia de control didáctica. La acción calculada se muestra como simulación lógica y no debe confundirse con un controlador autónomo conectado al modelo físico en tiempo real.
- La fase A registra elecciones de diseño y reflexión; la selección de biomimética e iluminación constituye evidencia pedagógica y no implica que todas esas opciones modifiquen automáticamente los materiales o luces de la escena 3D.
- El panel NAUTILUS funciona como portada y punto de navegación. Las páginas originales mantienen la operación del simulador.
- El respaldo `localStorage` es propio del navegador y del origen utilizado; para que la API y el almacenamiento compartido funcionen, se debe abrir el sitio mediante `node server.js`, no como archivo `file://`.
- Los resultados de las pruebas automatizadas no sustituyen pruebas de integración visual y de interacción en dispositivos reales.

## 12. Resumen de entregables

| Entregable | Archivo o ubicación |
|---|---|
| Currículo STEAM de seis módulos | `data/lessons.json` |
| Cuestionarios por módulo | `data/lessons.json` + `learn.html` |
| Ficha, portada y objetivos evaluables | `manifest.json` + `proyectos.html` |
| Ruta pedagógica de cinco fases | `ruta-steam.html` |
| Persistencia y eventos de montaje | `server.js` + `data/avance_rutas.json` |
| Integración del evento de ensamblaje | `src/main.js` y módulo de ensamblaje |
| Panel de inicio NAUTILUS | `nautilus/index.html` |
| Estilos de NAUTILUS | `nautilus/style.css` |
| Indicador de avance NAUTILUS | `nautilus/app.js` |
| Documentación de esta entrega | `docs/IMPLEMENTACION_STEAM_NAUTILUS.md` |

---
**Fin del documento.**
