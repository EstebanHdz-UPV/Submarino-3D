# Física del simulador

Todas las constantes están en **unidades SI** y viven en `data/physics.json`, `data/materials.json` y `data/parts.json`. El código de la física no depende de Babylon.js (`src/modules/physics/`), así que se puede probar por separado.

## Ejes y convenciones

- Mundo físico: **x** = avance inicial, **y** = izquierda, **z** = arriba (profundidad = −z).
- Cuerpo: **[adelante, izquierda, arriba]**. La orientación es una matriz de rotación que se integra con la velocidad angular.
- Babylon.js (izquierda-derecha, Y arriba, Z adelante): se convierte en `AssemblyView.aBabylon` → `(−y, z, x)`.

## Propiedades implementadas

| Propiedad | Fórmula | Archivo |
|---|---|---|
| Peso | W = m·g | `Buoyancy.js` |
| Empuje (Arquímedes) | B = ρ·g·V·f_sumergida | `Buoyancy.js` |
| Flotabilidad parcial en superficie | f = (profundidad + semialtura) / (2·semialtura), acotada a 0..1 | `Buoyancy.js` |
| Lastre variable | m = m_seco + llenado·V_tanque·ρ | `Ballast.js`, `PhysicsModule.js` |
| Llenado neutro | (ρ·V − m_sin_lastre) / (ρ·V_tanque) | `PhysicsModule.neutralFill()` |
| Presión | P = P_atm + ρ_prom·g·h | `Pressure.js` |
| Densidad variable | perfil por profundidad + corrección térmica (2,1·10⁻⁴ /°C) | `Pressure.js` |
| Arrastre | F = −½·ρ·C_d·A·v·\|v\| por eje del cuerpo | `Drag.js` |
| Masa añadida | m + k·ρ·V con k = 0,1 (avance), 0,9 (lateral y vertical) | `AddedMass.js` |
| Inercia | suma de masas puntuales + cáscara del casco + inercia añadida | `Stats.js` |
| Estabilidad | τ = (r_CB − r_CG) × F_b en ejes del cuerpo; plano de flotación (BM) en superficie | `Stability.js` |
| Timón | τ = −½·ρ·C_L·A·v·\|v\|·δ·brazo | `PhysicsModule.js` |
| Corrientes | velocidad del agua restada a la del casco en el arrastre | `Currents.js` |
| Propulsión | empuje con rampa; potencia P = máx(P_nom·(T/T_max)^1,5 , T·v/η) | `PhysicsModule.js` |
| Batería | energía útil reducida por el frío (plomo 0,8 %/°C, litio 0,4 %/°C bajo 20 °C) | `Battery.js` |
| Colapso del casco | mín(fluencia, pandeo); profundidad de diseño = colapso / 1,5 | `HullStress.js` |
| Inundación | si falta el domo entra agua hasta 50 % del volumen interior | `PhysicsModule.js`, `MissingParts.js` |

### Esfuerzo y colapso del casco (modelo simplificado)

- Cilindro, fluencia: σ = P·r / t → P_fl = σ_y·t / r
- Esfera, fluencia: σ = P·r / (2t) → P_fl = 2·σ_y·t / r
- Cilindro, pandeo elástico (von Mises, sin refuerzos): P_cr = 2,42·E·(t/D)^2,5 / [(1−ν²)^0,75·(L/D − 0,45·√(t/D))], multiplicado por 0,8 (imperfecciones)
- Esfera, pandeo elástico: P_cr = 2·E·(t/r)² / √(3(1−ν²)), multiplicado por 0,25 (imperfecciones)
- El mapa de colores por secciones aplica un factor simplificado de concentración en extremos y uniones. **No es un análisis de elementos finitos.**

## Simplificaciones conocidas

1. No hay sustentación hidrodinámica del casco ni de las aletas más allá del par del timón.
2. El casco no se comprime con la profundidad (la flotabilidad solo cambia por la densidad del agua).
3. No hay oleaje; en superficie hay un amortiguamiento de radiación de olas aproximado.
4. El arrastre se calcula por componentes en los ejes del cuerpo, sin acoplar las direcciones.
5. Los cilindros se tratan sin anillos de refuerzo (por eso colapsan más superficiales que un casco real).
6. Los materiales metálicos y el agua de mar ya están citados (ver la sección de validación y `CREDITS.md`); costos, compuesto de carbono y PMMA siguen siendo valores de referencia.

## Diseño de ejemplo (`data/designs/ejemplo.json`)

Casco cilíndrico corto de acero HY-80, propulsor medio, lastre grande, domo de 300 m, aletas pequeñas, torre baja, batería plomo-ácido de 10 kWh, pesos de 2 000 kg, focos de 100 W y sonar básico.

| Dato | Valor |
|---|---|
| Masa en seco | ≈ 4 908 kg |
| Volumen desplazado | ≈ 5,01 m³ |
| Flotabilidad neta (lastre vacío) | ≈ +226 kg (flota) |
| Llenado neutro | ≈ 18 % |
| Profundidad de diseño / colapso | 300 m / 450 m (pieza limitante: domo de 300 m) |
| Estabilidad BG | ≈ 0,36 m |
| Trimado estimado | ≈ 4,8° |
| Autonomía a 1,5 m/s | ≈ 3,7 h |
| Costo | ≈ $86 000 USD |

## Verificación realizada con el diseño de ejemplo

| Escenario | Resultado |
|---|---|
| Flotabilidad | flota con ≈ 0,55 m de calado y ≈ 4° de inclinación |
| Inmersión (20 m) | llega y se mantiene en ±0,1 m |
| Profundidad (100 m) | llega sin sobreimpulso; factor de seguridad ≈ 4,5 |
| Maniobra (3 nudos) | radio de giro ≈ 4 m (1,4 veces el largo) |
| Autonomía (2 nudos, 2 h) | termina con ≈ 77 % de batería |
| Corriente (0,8 m/s) | mantiene la posición |
| Emergencia (50 m) | suelta pesos, sopla el lastre y emerge |

Nota sobre la emergencia: al soltar los 2 000 kg de pesos el centro de gravedad sube por encima del de flotación y el submarino asciende muy rápido (≈ 7 m/s) y se inclina (≈ 60°). Es una consecuencia de la física del diseño, no un error; un diseño real corregiría el reparto de masas.

Fallas esperadas: sin lastre se hunde y colapsa; sin batería no puede sumergirse; sin domo se inunda; sin propulsor deriva con la corriente.

## Validación con un submarino real (SUB-024, punto F2)

Se comparó el modelo con el **HOV Alvin** de Woods Hole Oceanographic Institution (versión certificada a 6500 m). La prueba automática es `tests/physics/validacion-alvin.test.js` y usa las mismas funciones del simulador (`Pressure.js`, `HullStress.js`) y los mismos JSON.

### Datos de referencia

| Dato del Alvin | Valor publicado | Fuente |
|---|---|---|
| Profundidad de operación | 6500 m | WHOI, ficha "Alvin specifications" (ndsf.whoi.edu/alvin/specifications) |
| Esfera de personal | Ti-6Al-4V, paredes de 3 in (76,2 mm), volumen interior 4,8 m³ | WHOI, comunicado "Newly Upgraded Alvin Sub Heads for West Coast"; ficha de especificaciones |
| Presión a 6500 m | "casi 10 000 psi" (≈ 68,9 MPa) | WHOI, mismo comunicado |
| Prueba hidrostática de la esfera | equivalente a 8000 m, sin fallar | WHOI, mismo comunicado |
| Velocidad máxima de avance | 1,5 nudos | WHOI, hoja "Alvin One Sheet" (2022) |
| Propulsión | 6 propulsores de 113 N | WHOI, hoja "Alvin One Sheet" (2022) |
| Manga × alto | 2,6 m × 3,68 m | WHOI, hoja "Alvin One Sheet" (2022) |
| Densidad del agua de mar con la profundidad (35 psu, 0 °C) | 1028,1 (0 m) · 1046,4 (4000 m) · 1055,0 (6000 m) · 1063,2 (8000 m) · 1071,0 (10 000 m) kg/m³ | Encyclopaedia Britannica, "Seawater: density of seawater and pressure" |

### Resultados

| Comparación | Simulador | Referencia | Diferencia | Resultado |
|---|---|---|---|---|
| Presión manométrica a 6500 m | 66,4 MPa (9629 psi) | casi 10 000 psi | −3,7 % | ✓ (tolerancia 5 %) |
| Presión integrando la densidad de Britannica (1000–10 000 m) | — | — | ≤ 0,21 % | ✓ (tolerancia 1 %) |
| Colapso de la esfera del Alvin (modo) | fluencia, 11 989 m | resistió la prueba a 8000 m | — | ✓ colapso > 8000 m |
| Profundidad de diseño de la esfera (colapso / 1,5) | 7993 m | 6500 m | +23 % | ✓ (tolerancia 25 %) |
| Velocidad con 6 × 113 N y C_d de avance 0,35 | 1,38 nudos | 1,5 nudos | −8 % | ✓ (tolerancia 25 %) |

Lectura de los resultados:

- **Presión:** el modelo P = P_atm + ρ_prom·g·h con el perfil de densidad reproduce la presión real con error menor a 0,3 % en todo el rango oceánico.
- **Casco:** la fórmula de fluencia de la esfera (P = 2·σ_y·t / r) da un colapso por encima de la prueba real de 8000 m, como debe ser. La profundidad de diseño sale 23 % más profunda que la nominal porque el simulador solo considera la fluencia de membrana con un factor de 1,5; una certificación real también toma en cuenta ventanas, penetraciones, soldaduras y fatiga, que bajan la profundidad nominal. Con el límite elástico del grado ELI (790 MPa) la profundidad de diseño sería 7187 m (+11 %).
- **Arrastre:** la velocidad de crucero estimada con el C_d de cilindro queda 8 % por debajo de la real. Supone que los seis propulsores empujan hacia delante; el Alvin real los orienta en distintas direcciones, así que el dato es una cota.

### Constantes ajustadas (antes → después)

| Constante | Antes | Después | Motivo |
|---|---|---|---|
| `perfilMar` (physics.json) | terminaba en 4000 m (1045 kg/m³ constante a más profundidad) | se agregaron 6000, 8000 y 10 000 m: 1053,5 · 1061,8 · 1069,6 kg/m³ | la densidad sigue creciendo por compresión (Britannica) |
| Densidad HY-80 | 7850 kg/m³ | 7746 kg/m³ | tabla de propiedades de HY-80 |
| Módulo E HY-80 | 205 GPa | 207 GPa | tabla de propiedades de HY-80 |
| Módulo E Ti-6Al-4V | 114 GPa | 113,8 GPa | ficha ASM |
| Poisson Ti-6Al-4V | 0,34 | 0,342 | ficha ASM |

Efecto medido de los cambios:

| Profundidad | Presión de referencia | Antes | Error antes | Después | Error después |
|---|---|---|---|---|---|
| 1000 m | 10,11 MPa | 10,09 MPa | −0,21 % | 10,09 MPa | −0,21 % |
| 4000 m | 40,71 MPa | 40,64 MPa | −0,17 % | 40,64 MPa | −0,17 % |
| 6500 m | 66,50 MPa | 66,28 MPa | −0,33 % | 66,39 MPa | −0,17 % |
| 8000 m | 82,10 MPa | 81,75 MPa | −0,43 % | 81,97 MPa | −0,16 % |
| 10 000 m | 103,04 MPa | 102,19 MPa | −0,82 % | 102,87 MPa | −0,16 % |

Diseño de ejemplo: la masa en seco pasa de 4936 kg a 4908 kg (−0,6 %, por la densidad del HY-80); profundidad de diseño (300 m) y de colapso (450 m) sin cambio, porque la pieza limitante es el domo.

### Lo que sigue sin validar

- Compuesto de carbono y acrílico PMMA: valores de referencia sin ficha técnica (marcados `SIN validar` en `materials.json`).
- El pandeo de cilindros sin anillos de refuerzo es conservador (simplificación 5); no se comparó con un casco cilíndrico real.
- Respuesta dinámica (aceleraciones, radio de giro, consumo): falta comparar curvas con mediciones de un vehículo.

## Validaciones automáticas añadidas (fase SUB-036)

- Las profundidades no finitas se normalizan a superficie en las funciones de presión y densidad; una presión inversa no positiva o no finita devuelve 0 m.
- Los cálculos de presión crítica rechazan dimensiones no positivas, propiedades de material no finitas y un coeficiente de Poisson fuera del intervalo físicamente admisible empleado por este modelo.
- La masa efectiva rechaza masas, densidades, volúmenes o coeficientes inválidos.
- Pruebas de regresión comprueban que la inversión presión-profundidad recupera profundidades de referencia y que los casos inválidos no producen resultados numéricos silenciosamente.

Estas protecciones no validan por sí solas la exactitud del modelo estructural. Las ecuaciones de pandeo y los parámetros de materiales deben contrastarse con referencias técnicas y con las condiciones de diseño reales.


## Validación automatizada de navegación (fase SUB-037)

Se añadieron pruebas de integración que cargan el diseño de ejemplo desde los JSON del proyecto y ejecutan la misma clase `PhysicsModule` utilizada por el simulador. Las pruebas verifican que los pilotos de profundidad, rumbo, velocidad, maniobra y corriente generen órdenes finitas y acotadas; que una corrida de 60 s conserve valores físicos finitos; que acelerador y timón produzcan movimiento y cambio observable de rumbo; y que la liberación de pesos no duplique eventos.

Resultado de esta fase: 21 pruebas automatizadas aprobadas. Es una verificación de regresión del software, no una certificación de que la respuesta dinámica represente con exactitud un submarino real. Sigue pendiente comparar curvas de profundidad, velocidad, giro y consumo con datos publicados o mediciones.

## Validación de la secuencia de emergencia (fase SUB-038)

Se incorporaron pruebas de integración para comprobar que el piloto no activa la emergencia antes de 30 s y que, una vez activada, registra el evento de inicio, libera los pesos una sola vez y refleja el agotamiento de energía sin contaminar los estados numéricos. Estas pruebas verifican la lógica y la trazabilidad del escenario, pero no certifican una velocidad de ascenso segura ni una distancia de parada realista. Para ello hacen falta criterios de aceptación y datos de referencia del vehículo y sus actuadores.

## Diagnóstico de estado físico (fase SUB-039)

El módulo `src/modules/trials/StateValidation.js` exporta `validarEstadoFisico(snapshot, limits)`. Revisa que las magnitudes principales sean finitas, que la masa sea positiva, que la presión absoluta no caiga por debajo de aproximadamente 1 atm, y que el llenado de lastre y el estado de carga estén entre 0 y 1. También acepta límites opcionales de profundidad, velocidad, cabeceo y balanceo. Devuelve `ok`, una lista de `errors` y una lista de `warnings`, para que una prueba pueda presentar varios problemas de una vez.

Las pruebas automatizadas ejecutan una simulación de navegación de 30 s y verifican diagnósticos para límites excedidos y datos inválidos. Resultado: 26 pruebas aprobadas. Este diagnóstico es una herramienta de depuración y control de regresiones; los umbrales deben configurarse según cada misión y validarse contra datos de referencia antes de interpretar sus resultados como realistas.

## Informes agregados de misión (SUB-040)

`src/modules/trials/MissionReport.js` resume resultados de `TrialRunner` por escenario, totaliza pruebas completadas/aprobadas, conserva criterios fallidos y errores de ejecución, y genera recomendaciones de revisión. `informeComoJSON` produce un JSON legible y `informeComoCSV` escapa comillas y saltos de línea para exportar una fila por prueba. El estado `aprobada_segun_criterios` significa únicamente que pasaron los criterios configurados; no es una certificación ni sustituye la calibración del modelo con datos experimentales.


## Fase de corrección del piloto WASD (SUB-040)

Se añadió un indicador visual superpuesto durante el piloto manual con velocidad, profundidad, empuje, rumbo, batería, timón y teclas activas. Esto permite distinguir entre una tecla que no se registra y una orden que sí llega a la simulación. El indicador desaparece al detener el piloto.

Los controles ahora evitan el desplazamiento de la página con WASD y las flechas durante la conducción; el manejador de pérdida de foco se registra y elimina correctamente. La rampa de empuje sube de 0.5 a 1.0 unidades de acelerador por segundo para que la respuesta inicial sea más perceptible. W aumenta el empuje hacia delante, S lo reduce (si se mantiene hasta cruzar cero, permite invertirlo), A/D accionan el timón y Z/C el propulsor lateral.

Se añadieron pruebas para el mapeo de teclado, estado de teclas, órdenes de timón y desplazamiento medible durante ocho segundos. Las pruebas de software no sustituyen una prueba visual en navegador ni la calibración con datos de un vehículo real.


## Materiales visuales integrados (SUB-042)

Los 13 modelos de `assets/models/*.glb` ahora incluyen texturas PNG embebidas y coordenadas UV generadas para la malla. Se aplicaron estilos de pintura amarilla con marcas de advertencia al casco, materiales metálicos a propulsión y aletas, acabado naranja a tanques de lastre, tonos verdes a baterías, azul oscuro al sonar/cabina y acabado claro a focos. Las texturas se guardan dentro de cada GLB: no se requieren imágenes externas ni conexión de red. La asignación UV se generó automáticamente a partir de la geometría; conviene revisar visualmente en navegador la continuidad de las costuras y la orientación en cada pieza.


## Texturas de los ambientes de prueba

El ambiente visual de las pruebas utiliza texturas procedurales generadas en tiempo de ejecución mediante `BABYLON.DynamicTexture`: el fondo tiene variación de sedimento, granos y vetas; las rocas reciben un patrón mineral con relieve; y la superficie del agua muestra ondas y destellos. Se aplican como texturas de material y mapas de relieve, con repetición UV para cubrir las superficies. No se cargan imágenes desde Internet ni se añaden archivos de textura externos, por lo que se conserva el funcionamiento local/offline. Estas texturas mejoran la presentación visual, pero no modifican las ecuaciones físicas ni representan una calibración óptica del océano real.
