# Créditos y licencias

| Recurso | Fuente | Licencia |
|---|---|---|
| Babylon.js 9.32.0 (`vendor/babylon/babylon.js`) | https://www.babylonjs.com · paquete npm `babylonjs` | Apache 2.0 (`vendor/babylon/LICENSE.md`) |
| Loader glTF 9.32.0 (`vendor/babylon/babylon.glTFFileLoader.min.js`) | paquete npm `babylonjs-loaders` | Apache 2.0 |
| Iconos SVG (`assets/icons/`) | Dibujados por el equipo (trazos propios) | Propios |
| Modelos `.glb` (`assets/models/`, 18 archivos) | Modelados por el equipo con `tools/generar_assets.py` (geometría procedural en `tools/piezas.py`, texturas en `tools/texturas.py`). Ninguno es marcador: lo comprueba `tests/assets/modelos-propios.test.js` | Propios |
| Portada del catálogo (`assets/images/submarino-portada.png`) | Captura del propio simulador (diseño de ejemplo en el escenario submarino) | Propia |
| Aluminio 6061-T6 y 7075-T6 | ASM Aerospace Specification Metals, fichas de material (asm.matweb.com, `ma6061t6` y `ma7075t6`) | Datos técnicos citados |
| Acero HY-80 | MIL-S-16216 (fluencia mínima 80 ksi = 552 MPa); tabla de propiedades en Wikipedia, artículo "HY-80" | Datos técnicos citados |
| Titanio Ti-6Al-4V | ASM Aerospace Specification Metals, ficha "Titanium Ti-6Al-4V (Grade 5), Annealed" | Datos técnicos citados |
| Espuma sintáctica | Patente US 6,153,294 (≈ 0,5 g/cm³ para 3000 m); Alseamar, bloque HP4000 (430 kg/m³ para 4000 m) | Datos técnicos citados |
| Densidad del agua de mar con la profundidad | Encyclopaedia Britannica, "Seawater: density of seawater and pressure" | Datos técnicos citados |
| HOV Alvin (validación física) | WHOI: ndsf.whoi.edu/alvin/specifications; hoja "Alvin One Sheet" (2022); comunicado "Newly Upgraded Alvin Sub Heads for West Coast" | Datos técnicos citados |
| Compuesto de carbono, acrílico PMMA, piezas y costos | Valores de referencia del equipo | **Sin validar** (ver `docs/FISICA.md`) |
| Código base y documentación inicial | Generado con ayuda de Claude (Anthropic) y revisado por el equipo | Ver `docs/bitacora/BITACORA.md` |

Agregar aquí cada modelo, textura o dato externo con su fuente y licencia.
