# Metodología: Kanban

Proyecto: **Submarino de exploración** (Babylon.js 9+, JS puro, offline)
Ubicación en el repo: `docs/METODOLOGIA.md`

---

## 1. ¿Por qué Kanban?

Kanban es un método de flujo continuo: el trabajo se visualiza en un tablero, se limita la cantidad de tareas en progreso y se mejora el proceso con métricas. Encaja con este proyecto porque:

- El trabajo es incremental: cada módulo (física, controles, HUD, océano) se puede entregar por separado.
- Se aprende mientras se construye, así que el orden de las tareas puede cambiar.
- La bitácora y la telemetría ya generan datos de flujo y evidencia.

## 2. Los 6 principios aplicados

| Principio | Cómo se aplica aquí |
|---|---|
| Visualizar el trabajo | Tablero Kanban en `docs/kanban/TABLERO.md` (o `tablero.json`) |
| Limitar el trabajo en curso (WIP) | Máximo 2 tarjetas en "En progreso" |
| Gestionar el flujo | Se miden lead time, cycle time y throughput |
| Hacer explícitas las políticas | Sección 5 y Definición de Terminado (sección 6) |
| Ciclos de retroalimentación | Revisión semanal y retrospectiva (sección 8) |
| Mejora continua | Los ajustes de proceso se registran en la bitácora |

## 3. Tablero

### Columnas

| Columna | Significado | Límite WIP |
|---|---|---|
| **Backlog** | Todas las ideas y requisitos sin priorizar | Sin límite |
| **Listo** | Tarjeta definida, con criterios de aceptación y priorizada | 5 |
| **En progreso** | Se está desarrollando | **2** |
| **Verificación** | Se prueba contra criterios, rúbrica y física esperada | 2 |
| **Terminado** | Cumple la Definición de Terminado | Sin límite |

### Ejemplo de tablero

```
| Backlog         | Listo           | En progreso     | Verificación    | Terminado       |
|-----------------|-----------------|-----------------|-----------------|-----------------|
| SUB-012 Corrien | SUB-004 Lastre  | SUB-003 Arrastr | SUB-002 Arquím. | SUB-001 Estruct |
| SUB-013 Luz     | SUB-005 Controls| SUB-006 Modelo  |                 |                 |
| SUB-014 Batería | SUB-007 HUD     |                 |                 |                 |
```

## 4. Tarjetas

Cada tarjeta lleva un ID `SUB-###` y se guarda en `data/kanban/tarjetas.json`:

```json
{
  "id": "SUB-002",
  "titulo": "Empuje de Arquímedes",
  "tipo": "funcionalidad",
  "clase": "estandar",
  "modulo": "physics",
  "descripcion": "Calcular B = rho * g * V_desplazado en cada paso fijo.",
  "criteriosAceptacion": [
    "Con lastre neutro el submarino se mantiene a profundidad constante",
    "En superficie el volumen desplazado es parcial"
  ],
  "propiedadFisica": "Empuje",
  "creada": "2026-10-23",
  "iniciada": null,
  "terminada": null,
  "bitacora": []
}
```

### Tipos de tarjeta
- **funcionalidad**: algo nuevo (módulo, control, efecto)
- **fisica**: implementación o ajuste de una propiedad física
- **defecto**: error encontrado
- **documentacion**: objetivos, rúbricas, lecciones, bitácora
- **aprendizaje**: estudiar una lección antes de implementar

### Clases de servicio
| Clase | Uso | Regla |
|---|---|---|
| **Urgente** | Bloquea todo (el proyecto no arranca) | Salta la fila, puede exceder WIP en 1 |
| **Fecha límite** | Entrega con fecha del profesor | Se prioriza según la fecha |
| **Estándar** | Trabajo normal | Orden FIFO / prioridad |
| **Mejora** | Pulido sin prisa | Solo si no hay otra cosa |

## 5. Políticas explícitas

1. No se empieza una tarjeta nueva si "En progreso" está en su límite.
2. Se termina antes de empezar: primero se ayuda a cerrar lo abierto.
3. Una tarjeta pasa a "Listo" solo con criterios de aceptación escritos.
4. Cada tarjeta que cambia de columna genera **una entrada en la bitácora**.
5. Toda tarjeta de física indica qué propiedad cubre y qué valores de `physics.json` o `submarine.json` usa.
6. Los defectos se registran como tarjetas, con su causa y solución.
7. Cualquier bloqueo se marca en la tarjeta con la etiqueta `BLOQUEADA` y el motivo.

## 6. Definición de Terminado (DoD)

Una tarjeta pasa a "Terminado" solo si:

- [ ] Cumple todos sus criterios de aceptación.
- [ ] Funciona **sin internet**, solo con `node server.js`.
- [ ] Usa únicamente el stack permitido: JS puro con módulos ES, Babylon.js 9+, sin frameworks ni TypeScript.
- [ ] Modelos solo en `.glb`/`.gltf`, imágenes en `.png`/`.jpg`/`.webp`, iconos en `.svg`.
- [ ] Los datos configurables están en JSON, no escritos en el código.
- [ ] Registra eventos con `SLog` y emite telemetría cuando aplica.
- [ ] Se probó el comportamiento físico (ver sección 7).
- [ ] La entrada de bitácora está escrita con antes/después de los valores ajustados.
- [ ] Se actualizó `manifest.json` si se agregó un módulo.
- [ ] Se revisó contra la rúbrica correspondiente en `docs/RUBRICAS.md`.

## 7. Verificación física (columna "Verificación")

Pruebas mínimas que deben pasar antes de cerrar tarjetas de física:

| Propiedad | Prueba esperada |
|---|---|
| Peso y empuje | Con masa total = densidad × volumen, el submarino queda en flotabilidad neutra |
| Lastre | Llenar tanques lo hace descender; vaciarlos lo hace subir |
| Arrastre | La velocidad terminal se estabiliza; no crece sin límite |
| Hélice | El empuje respeta límite y rampa |
| Masa añadida | La aceleración es menor que sin masa añadida |
| Estabilidad | El submarino vuelve a la horizontal (CG por debajo de CB) |
| Presión | Aumenta linealmente con la profundidad; HUD coincide con la fórmula |
| Profundidad de colapso | Al superar `maxDepthM` se activa daño o fin de misión |
| Luz y densidad | Atenuación y densidad cambian con la profundidad |
| Batería | El consumo crece con el empuje; la telemetría lo confirma |

## 8. Cadencias (reuniones y revisiones)

| Cadencia | Frecuencia | Qué se hace |
|---|---|---|
| Revisión del tablero | Cada sesión de trabajo | Revisar bloqueos, mover tarjetas, respetar WIP |
| Reposición del Backlog | Semanal | Priorizar y pasar tarjetas a "Listo" |
| Revisión de entrega | Al cerrar un módulo | Demostrar al profesor / equipo |
| Retrospectiva | Cada 2 semanas | Qué funcionó, qué no, qué cambiar en el proceso |

## 9. Métricas de flujo

Se calculan a partir de `iniciada` y `terminada` en las tarjetas:

- **Lead time**: desde que se crea la tarjeta hasta que se termina.
- **Cycle time**: desde que entra a "En progreso" hasta "Terminado".
- **Throughput**: tarjetas terminadas por semana.
- **WIP promedio**: tarjetas en progreso en promedio.
- **Tasa de defectos**: tarjetas tipo `defecto` / total terminadas.

Se anotan en `docs/kanban/METRICAS.md` al final de cada semana. Un cuello de botella se detecta cuando una columna se llena y la siguiente se vacía.

## 10. Relación con la bitácora

Cada movimiento en el tablero produce una fila en `docs/bitacora/BITACORA.md` y un objeto en `docs/bitacora/entradas.json`:

```json
{
  "n": 7,
  "fecha": "2026-10-23",
  "tarjeta": "SUB-002",
  "movimiento": "En progreso -> Verificación",
  "queHice": "Implementé el empuje de Arquímedes en PhysicsModule",
  "porQue": "Necesario para flotabilidad",
  "resultado": "El submarino flota a profundidad constante con lastre 0.5",
  "valores": { "ballastFill": { "antes": 0.4, "despues": 0.5 } },
  "evidencia": "captura-0007.png"
}
```

## 11. Backlog inicial

| ID | Tarjeta | Módulo | Clase | Propiedad física |
|---|---|---|---|---|
| SUB-001 | Estructura de carpetas, `package.json`, `server.js` | núcleo | Urgente | — |
| SUB-002 | Cargar Babylon.js 9+ localmente en `vendor/` | núcleo | Urgente | — |
| SUB-003 | `SLog`, `Config` y `Telemetry` | núcleo | Estándar | — |
| SUB-004 | Escena base: cámara, luz, niebla | scene | Estándar | Luz |
| SUB-005 | Bucle de paso fijo | núcleo | Estándar | — |
| SUB-006 | Peso y empuje de Arquímedes | physics | Estándar | Peso, empuje |
| SUB-007 | Tanques de lastre y flotabilidad neutra | submarine | Estándar | Lastre |
| SUB-008 | Arrastre hidrodinámico | physics | Estándar | Arrastre |
| SUB-009 | Masa añadida | physics | Estándar | Masa añadida |
| SUB-010 | Hélice con límite y rampa | controls | Estándar | Empuje de hélice |
| SUB-011 | Rotación: inercia, torque, estabilidad CG/CB | physics | Estándar | Inercia, torque |
| SUB-012 | Presión y profundidad de colapso | physics | Estándar | Presión |
| SUB-013 | HUD con canvas 2D e iconos SVG | ui | Estándar | — |
| SUB-014 | Modelo 3D del submarino en `.glb` | submarine | Estándar | — |
| SUB-015 | Atenuación de luz y color con la profundidad | environment | Estándar | Luz |
| SUB-016 | Densidad variable (temperatura/profundidad) | environment | Mejora | Densidad |
| SUB-017 | Corrientes marinas | environment | Mejora | Corrientes |
| SUB-018 | Batería y consumo | submarine | Estándar | Batería |
| SUB-019 | Objetivos de misión en `objectives.json` | núcleo | Fecha límite | — |
| SUB-020 | Documentar objetivos, rúbricas y lecciones | docs | Fecha límite | — |

## 12. Archivos Kanban dentro del proyecto

```
docs/
├── METODOLOGIA.md          ← este documento
└── kanban/
    ├── TABLERO.md          ← estado actual del tablero
    └── METRICAS.md         ← lead time, cycle time, throughput
data/
└── kanban/
    └── tarjetas.json       ← todas las tarjetas
```

Añadir también `"methodology": "Kanban"` en `manifest.json`.
