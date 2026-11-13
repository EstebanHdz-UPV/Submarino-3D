# Objetivos del proyecto

Fuente de datos: `data/objectives.json`.

| ID | Objetivo | Cómo se mide | Requisitos |
|---|---|---|---|
| OBJ-01 | **Ejecución local sin internet**: El simulador arranca con un solo comando (node server.js) y funciona 100 % sin conexión. | Con la red desactivada, la app carga en ≤ 5 s y no hay peticiones a dominios externos. | RNF-01, RNF-03, RNF-04, RF-01 |
| OBJ-02 | **Armar el submarino desde cero**: El usuario arma el submarino pieza por pieza, eligiendo variantes y materiales. | 11 puntos de montaje, 29+ piezas y 7 materiales; estadísticas en vivo al cambiar cualquier pieza. | RF-11, RF-12, RF-15, RF-16 |
| OBJ-03 | **Dos libros de consulta**: Libro 1 (piezas y ensamblaje) y Libro 2 (materiales por escenario y profundidad), consultables en la app. | Ambos libros cargan desde JSON y sus tablas coinciden con los cálculos del simulador. | RF-13, RF-14 |
| OBJ-04 | **Física realista**: Peso, empuje, presión, arrastre, masa añadida, estabilidad, corrientes, densidad variable, batería y colapso en unidades SI. | Flotabilidad neutra con deriva < 0,05 m/s; ≈ 10,9 atm absolutas a 100 m; velocidad terminal estable; se endereza tras una perturbación. | RNF-07, RNF-08, RF-06, RF-07, RF-08 |
| OBJ-05 | **Pruebas con dictamen**: 7 escenarios de prueba y un piloto manual; las pruebas funcionan aunque el diseño esté incompleto. | Cada prueba entrega aprobado/no aprobado con causas, estadísticas y gráficas. | RF-17, RF-18, RF-19 |
| OBJ-06 | **Piloto y HUD**: Manejo con teclado (avance, giro, lastre, lateral, cámaras, reinicio) y HUD en Canvas 2D con iconos SVG. | Los datos del HUD coinciden con los de la física; alertas de profundidad, batería e inundación. | RF-02, RF-03, RF-04, RF-05, RF-09, RF-10 |
| OBJ-07 | **Trazabilidad**: SLog, telemetría en JSONL y bitácora desde cero, enlazadas a las tarjetas de Trello y a los commits de GitHub. | Cada tarjeta terminada tiene entrada de bitácora; existe un .jsonl tras cada sesión. | RNF-09, RNF-10, RF-20 |
