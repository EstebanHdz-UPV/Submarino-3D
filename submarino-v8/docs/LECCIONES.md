# Lecciones para aprender a crear el proyecto

Fuente de datos: `data/lessons.json`. Se recomienda seguirlas en orden.

## L01 · Fundamentos de Babylon.js
- **Objetivo:** Entender Engine, Scene, cámaras, luces y niebla.
- **Código relacionado:** `src/modules/scene/SceneModule.js`
- **Actividad:** Cambia la densidad de la niebla y el color del agua y observa el efecto.

## L02 · Módulos ES sin bundler
- **Objetivo:** Organizar el código con import/export y cargar un script de tipo module.
- **Código relacionado:** `src/main.js, src/core/`
- **Actividad:** Crea un módulo nuevo y súmalo al manifest.json.

## L03 · Modelos .glb
- **Objetivo:** Cargar glTF binario, escalarlo a medidas reales y tener una alternativa si falla.
- **Código relacionado:** `src/modules/scene/ModelLoader.js`
- **Actividad:** Reemplaza un .glb marcador por uno exportado desde Blender.

## L04 · Fuerzas y empuje de Arquímedes
- **Objetivo:** Calcular peso y empuje y lograr flotabilidad neutra.
- **Código relacionado:** `src/modules/physics/Buoyancy.js, PhysicsModule.js`
- **Actividad:** Calcula a mano el llenado neutro del diseño de ejemplo y compáralo con el simulador.

## L05 · Arrastre y masa añadida
- **Objetivo:** Entender la velocidad terminal y por qué el agua 'pesa' al acelerar.
- **Código relacionado:** `src/modules/physics/Drag.js, AddedMass.js`
- **Actividad:** Duplica el área frontal y mide cuánto cambia la velocidad máxima.

## L06 · Presión y colapso del casco
- **Objetivo:** Calcular presión hidrostática, esfuerzo, pandeo y factor de seguridad.
- **Código relacionado:** `src/modules/physics/Pressure.js, HullStress.js`
- **Actividad:** Compara la profundidad de colapso de un cilindro y una esfera del mismo material.

## L07 · Estabilidad CG/CB y trimado
- **Objetivo:** Relacionar la posición de las masas con el equilibrio.
- **Código relacionado:** `src/modules/physics/Stability.js, submarine/Stats.js`
- **Actividad:** Mueve la batería de lugar y observa el ángulo de trimado.

## L08 · HUD con Canvas 2D y SVG
- **Objetivo:** Dibujar instrumentos con Canvas 2D e iconos vectoriales.
- **Código relacionado:** `src/modules/ui/Hud.js, Sonar.js, Charts.js`
- **Actividad:** Agrega un indicador nuevo (por ejemplo, empuje) al HUD.

## L09 · SLog y telemetría
- **Objetivo:** Registrar eventos y datos de la sesión y analizarlos.
- **Código relacionado:** `src/core/SLog.js, Telemetry.js`
- **Actividad:** Abre un .jsonl de data/telemetry/ y grafica la profundidad contra el tiempo.

## L10 · Kanban con Trello y GitHub
- **Objetivo:** Llevar el trabajo con WIP, DoD, PR y bitácora.
- **Código relacionado:** `docs/METODOLOGIA.md`
- **Actividad:** Mueve una tarjeta por todas las columnas y enlaza su PR.

