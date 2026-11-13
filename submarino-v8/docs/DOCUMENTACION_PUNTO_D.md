# Documentación Técnica — Persistencia, Espejo Docente, Telemetría y Evaluación (Puntos C y D)

> **Proyecto:** Simulador de Submarino de Exploración 3D
> **Versión:** 0.1.0 (`submarino-v6`)
> **Archivo:** `docs/DOCUMENTACION_TECNICA.md`

---

## 1. Resumen de Implementación — Punto C: Persistencia y Espejo Docente (C1 – C5)

- **C1 (`iniciarAutoguardado`)**: Implementado en `src/core/guardado.js` (y re-exportado en `guardado.js`) y conectado en `src/main.js` pasando `obtenerSnapshot` y `{ proyecto_id }`.
- **C2 (`cargar()`)**: Implementado en `src/core/guardado.js` y `app.cargar()` en `src/main.js`, con soporte de servidor (`GET /api/guardado`) y respaldo local (`localStorage`), restaurando el diseño al iniciar y desde el botón *Restaurar guardado* en Ensamblaje.
- **C3 (`sendBeacon` al cerrar pestaña)**: Garantizado en `enviarBeaconSnapshot()` (`src/core/guardado.js`) y `telemetry.flushBeacon()` (`src/core/Telemetry.js`) mediante los eventos `pagehide`, `beforeunload` y `visibilitychange`.
- **C4 (Modo solo lectura del profesor `?alumno=ID`)**: Detecta `?alumno=ID`, carga el diseño del alumno correspondiente, despliega el banner **ESPEJO DOCENTE · SOLO LECTURA**, desactiva el autoguardado/`sendBeacon` y bloquea cualquier modificación en UI y servidor (`HTTP 403`).
- **C5 (`proyecto_id` en todo guardado)**: Incluido en `Assembly.toJSON()`, `guardado.js` (`guardar`, `iniciarAutoguardado`, `enviarBeaconSnapshot`), `/api/guardado`, `/api/designs`, `/api/avance-rutas`, reportes, ajustes y telemetría.

---

## 2. Resumen de Implementación — Punto D: Telemetría y Evaluación STEAM (D1 – D4)

### D1. Emitir eventos estandarizados: `matematicas_intento`, `ciencia_intento`, `objeto_colocado`, `programa_ejecutado`

- **Definición de constantes y métodos auxiliares**: En `src/core/Telemetry.js` se formalizó `EVENTOS_ESTANDARIZADOS` y se implementaron los métodos `matematicasIntento()`, `cienciaIntento()`, `objetoColocado()` y `programaEjecutado()`.
- **Canalización central mediante EventBus**: En `src/main.js` se centralizó la escucha de los eventos para registrarlos en telemetría y persistirlos en `POST /api/avance-rutas`, manteniendo total retrocompatibilidad con `object_colocado`.
- **Integración en la interfaz de usuario**:
  - **Fase M (Matemáticas)** en `RouteScreen.js`: Emite `matematicas_intento` al presionar *Calcular* y al *Validar*, incluyendo densidad ρ, gravedad g, profundidad h, presión P (Pa), selección de lastre y estado de éxito/validez.
  - **Fase S (Ciencias)** en `RouteScreen.js`: Emite `ciencia_intento` al presionar *Calibrar* y al *Validar*, registrando empuje B, peso W, diferencia Δ, volumen y masa con verificación de flotabilidad neutra (≤ 5 %).
  - **Fase E (Ingeniería)** en `AssemblyScreen.js`: Emite `objeto_colocado` cada vez que se instala un componente por clic o por arrastrar y soltar (`slotId`, `partId`).
  - **Fase T (Tecnología)** en `RouteScreen.js`: Emite `programa_ejecutado` al ordenar y ejecutar los bloques de control (`read -> compare -> ballast`), registrando secuencia, profundidad objetivo, error y éxito.
  - **Cuestionarios STEAM** en `LibraryScreen.js`: Emite `matematicas_intento` y `ciencia_intento` al evaluar respuestas de los módulos temáticos.

### D2. Añadir `proyecto_id` + dimensión STEAM a cada muestra

- **Garantía en el núcleo**: En `src/core/Telemetry.js`, el buffer y el método `record` aseguran que **cada muestra y cada evento** incluyan obligatoriamente `proyecto_id` y `dimension_steam` (con alias `dimensionSTEAM`).
- **Conmutación dinámica**: Se implementó el método `setDimensionSTEAM(dimension)` en `Telemetry`.
- **Sincronización por pantalla**: En `src/main.js` (`alCambiar`), la telemetría conmuta la dimensión según la navegación activa:
  - `M` (Ruta STEAM / Compuerta de cálculo)
  - `S` (Ciencias / Laboratorio de Arquímedes y Libros)
  - `E` (Ingeniería / Ensamblaje 3D)
  - `T` (Tecnología / Pruebas, simulación física y programación)
  - `A` (Artes y Diseño / Biomimética y visuales)

### D3. Registrar aciertos/fallos, inactividad, coordenadas (X, Y, Z) y cámara

- **Aciertos y fallos**:
  - `Telemetry.js` mantiene los contadores `aciertos` y `fallos`, gestionados por `registrarAcierto()` y `registrarFallo()`.
  - Las acciones correctas (ensambles válidos, cálculos precisos de presión, calibraciones neutras y secuencias correctas de programación) incrementan `aciertos`.
  - Los incidentes físicos (choques contra el lecho en `alChocar`, sobrepresión crítica o colapso) y las validaciones erróneas incrementan `fallos`.
  - Cada muestra periódica incluye los valores acumulados de `aciertos` y `fallos`.
- **Inactividad**:
  - Monitoreo de actividad de usuario en `src/main.js` (`pointerdown`, `keydown`, `wheel`) a través de `telemetry.registrarActividad()`.
  - Cada muestra calcula `inactividadS` (segundos transcurridos desde el último input) y la bandera booleana `inactivo` (umbral ≥ 10 s).
- **Coordenadas espaciales (X, Y, Z)**:
  - En cada paso del bucle de simulación física (`Loop.js` / `main.js`), se extrae la posición tridimensional del submarino (`m.phys.pos`) y se registra en cada muestra como `x`, `y`, `z` y `coordenadas: { x, y, z }`.
- **Modo de cámara**:
  - Se registra el modo actual de la cámara (`camara`: `'taller'`, `'seguimiento'`, `'orbita'`, `'proa'`) en cada muestra periódica, actualizándose dinámicamente al presionar la tecla `V` o cambiar de vista.
- **Validación de esquema**: Documentado y tipado en `data/telemetry.schema.json`.

### D4. Conectar con `telemetria.js` del Core para que `evaluacion.js` genere puntajes

- **Fachada en español `src/core/telemetria.js`**:
  - Exporta `Telemetria` (alias de `Telemetry`), `EVENTOS_ESTANDARIZADOS`, `Evaluacion` y `generarPuntajes`, unificando el acceso para el resto del simulador.
- **Motor de Evaluación `src/core/evaluacion.js`**:
  - Analiza muestras periódicas y eventos de telemetría para generar puntajes de 0 a 100:
    - **M (Matemáticas)**: Éxito en compuerta de cálculo hidrostático (P = ρgh) y precisión numérica.
    - **S (Ciencias)**: Precisión en equilibrio de Arquímedes (Δ ≤ 5 %), navegación sin sobrepasar el límite de colapso y control de presión.
    - **E (Ingeniería)**: Cantidad y variedad de componentes instalados (≥ 5 piezas para puntaje máximo) y estabilidad del diseño.
    - **T (Tecnología)**: Secuencia de programación por bloques, desplazamiento en coordenadas 3D y tasa de actividad frente a inactividad.
    - **A (Artes y Diseño)**: Exploración visual utilizando múltiples modos de cámara (≥ 3 modos), cobertura espacial y entrega reflexiva.
    - **Puntaje Global y Nivel**: Ponderación multivariada clasificada en los niveles de la rúbrica oficial:
      - ≥ 85: *Excelente* (Nivel 4)
      - ≥ 70: *Bueno* (Nivel 3)
      - ≥ 50: *Suficiente* (Nivel 2)
      - < 50: *Insuficiente* (Nivel 1)
  - **Métricas estadísticas**: Distancia euclidiana recorrida (mm), profundidad máxima, tasa de aciertos (%) y recomendaciones formativas contextuales ante fallos.
- **Integración en la interfaz (`ResultsScreen.js`)**:
  - Despliega en la pantalla de Resultados la tarjeta de **Evaluación y Puntajes STEAM**, mostrando el puntaje global, nivel cualitativo, desglose por disciplina y sugerencias pedagógicas de mejora.

---

## 3. Cobertura de Pruebas Automatizadas

- **Suite de pruebas de núcleo (`tests/core/`)**:
  - `telemetry.test.js`: Validación de buffer, muestras, sendBeacon, eventos estándar (D1), metadatos obligatorios (D2), variables extendidas (D3) y conexión de evaluación (D4).
  - `evaluacion.test.js`: Verificación de cálculo de puntajes STEAM, asignación de niveles, métricas de trayectoria/inactividad y penalizaciones por colisión.
  - `d1-eventos-estandarizados.test.js`: Validación de emisión en EventBus y almacenamiento con firma completa.
  - `guardado.test.js`: Pruebas de autoguardado, snapshot y espejo docente (C1–C5).
- **Total ejecutado: 86/86 pruebas aprobadas** con 0 fallos (18 en `tests/core/`, 68 en física, submarino y UI).
