# Documentación Técnica — Punto C: Persistencia y Espejo Docente

> Copia de referencia dentro de `submarino-v5/`. El documento principal también se encuentra en `../DOCUMENTACION_PUNTO_C_PERSISTENCIA_Y_ESPEJO_DOCENTE.md`.

## Resumen de Implementación (C1 – C5)

- **C1 (`iniciarAutoguardado`)**: Implementado en `src/core/guardado.js` (y re-exportado en `guardado.js`) y conectado en `src/main.js` pasando `obtenerSnapshot` y `{ proyecto_id }`.
- **C2 (`cargar()`)**: Implementado en `src/core/guardado.js` y `app.cargar()` en `src/main.js`, con soporte de servidor (`GET /api/guardado`) y respaldo local (`localStorage`), restaurando el diseño al iniciar y desde el botón *Restaurar guardado* en Ensamblaje.
- **C3 (`sendBeacon` al cerrar pestaña)**: Garantizado en `enviarBeaconSnapshot()` (`src/core/guardado.js`) y `telemetry.flushBeacon()` (`src/core/Telemetry.js`) mediante los eventos `pagehide`, `beforeunload` y `visibilitychange`.
- **C4 (Modo solo lectura del profesor `?alumno=ID`)**: Detecta `?alumno=ID`, carga el diseño del alumno correspondiente, despliega el banner **ESPEJO DOCENTE · SOLO LECTURA**, desactiva el autoguardado/`sendBeacon` y bloquea cualquier modificación en UI y servidor (`HTTP 403`).
- **C5 (`proyecto_id` en todo guardado)**: Incluido en `Assembly.toJSON()`, `guardado.js` (`guardar`, `iniciarAutoguardado`, `enviarBeaconSnapshot`), `/api/guardado`, `/api/designs`, `/api/avance-rutas`, reportes, ajustes y telemetría.

