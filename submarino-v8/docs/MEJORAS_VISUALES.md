# Mejoras visuales (solo aspecto; física y datos intactos)

- **Piezas y submarino**: los 18 tipos de pieza tienen modelo `.glb` con materiales PBR y texturas embebidas (albedo, normales, oclusión/rugosidad/metal). Se añadieron `controles`, `controles-navegacion`, `periscopio`, `portillas` y `escotilla` (con bisagra animable). Si un `.glb` falta se usa la pieza procedural de antes.
- **Entorno** (`environment/Visuals.js`): iluminación por imagen (`entorno_agua.png`), tonemapping ACES, bloom, brillo de luces, sombras suaves y rayos de sol que se atenúan con la profundidad.
- **Mar** (`OceanModule.js`): superficie PBR con mapa de normales animado. **Fondo** (`Seabed.js`): arena y rocas PBR con silueta irregular. **Plantas** (`Plants.js`): algas que se mecen y corales (instancias, bajo coste).
- **Interior** (`scene/Interior.js`): forro de paneles, cuadernas, tuberías, tiras de luz, pasarela y luz propia; visible con el casco translúcido y fuera de la zona donde se colocan las piezas internas.
- **Implosión** (`Implosion.js`): al colapsar, el casco se arruga hacia dentro (morph target en GPU), las piezas son chupadas hacia el centro y hay destello, onda de choque y burbujas. `reset()` restaura todo al detener o reiniciar.
- **Colocación** (`submarine/Placement.js`, `ui/PlacementDrop.js`): zonas interior/exterior, sin atravesarse entre piezas (las piezas internas como timón, baterías y pesos se pueden soltar dentro del casco).
- **Regenerar recursos**: `python3 tools/generar_assets.py` (requiere numpy y Pillow). `tools/visor.html` muestra un `.glb`.

## Segunda ronda
- **Agua**: rayos de sol como columnas finas que miran a la cámara (ya no parecen nubes), superficie con menos ruido, niebla más clara cerca de la superficie. La luz, el ambiente y el reflejo caen con la profundidad: de día en superficie a casi negro hacia los 200 m, donde destacan las luces propias y la flora luminosa.
- **Ventanillas** (`Interior.js`): tres por lado con marco, vidrio y vista a una cabina iluminada. Se ven con el casco opaco.
- **Ver el interior**: en el montaje el casco ahora sí es translúcido (los GLB fijaban el material como opaco y se ignoraba la transparencia). En el pilotaje, la tecla **X** alterna un corte transparente del casco.
- **Vida marina** (`Fauna.js`): bancos de peces (azules, naranjas con franjas, abisales), medusas luminosas pulsantes y flora bioluminiscente en el fondo; además más algas y más altas. Los animales se reciclan alrededor de la cámara para tener siempre vida a la vista con bajo coste.

## Cabina y casco transparente
- **Cámara de proa = cabina**: el piloto queda dentro del casco, mirando al gran ventanal frontal y con ventanillas a los lados. Se ve el forro de paneles, las luces del techo y las piezas internas; el domo exterior se oculta mientras tanto. El color del mar tras el cristal oscurece con la profundidad.
- **Botón "Casco: opaco/transparente"** arriba a la derecha durante el pilotaje (también tecla **X**).
- El botón **Casco: opaco/transparente** está disponible tanto en el montaje como en el pilotaje (y con la tecla X).
- El submarino de ejemplo (`data/designs/ejemplo.json`) ahora incluye el timón y panel de navegación (`controles-navegacion`) además de batería y pesos, para que el interior no esté vacío.

## Mando de cabina y casco sólido
- Casco **opaco** ahora es realmente sólido (prepasada de profundidad): no se ven aletas ni ventanas del otro lado a través de él.
- Piezas de interior (batería, pesos, timón/panel) dibujadas al 62 % (`Placement.js`, solo aspecto) para dejar pasillo y vista libre.
- **Mando de cabina** (panel arriba a la derecha): aparece solo con la cámara de proa (V) y con timón/controles instalados. Botones mantenibles para acelerar, frenar, timón, subir y bajar, y **Luces** (también tecla L) que apaga/enciende foco, luz interior y tiras del techo.

## Ajustes de la última ronda
- **Cielo** (`Cielo.js`): cúpula con degradado azul, nubes y sol; solo se ve sobre el agua. El mar se ve oscuro y azul (no blanco): sin reflejo rasante, sin rayos de luz ni bloom del horizonte sobre la superficie, y el fondo (250 m) se oculta mientras la cámara está sobre el agua.
- **Cabina en primera persona**: arrastra el ratón para mirar; **F** (o el botón «Caminar por dentro») alterna caminar/pilotar. Caminando: **W A S D** mueven a la persona, **flechas** giran la vista; el submarino conserva su empuje y se sigue pilotando con los botones del mando. No se atraviesa el casco ni las piezas a la altura de los ojos; las piezas que invaden la cabeza o el pasillo de visión se ocultan.
- **Rendimiento / avance**: si los fps bajan de 24 durante 3 s, la calidad baja sola (sombras y brillo → bloom y escala → fauna). El paso máximo de la simulación subió a 0,5 s por fotograma para que, con pocos fps, el submarino avance y descienda a velocidad real (antes iba a cámara lenta).
- **Descenso**: **E** (o «Bajar») llena el lastre; el submarino empieza a hundirse a los ~20–30 s simulados (bomba lenta, como en la física original).

## Fondo marino y luces (ronda 3)
- **Relieve** (`Seabed.js`): mesetas con acantilados casi verticales, dorsales de arrecife, un cañón, bloques de roca al pie de los acantilados y pilares/agujas. El suelo se tiñe por pendiente (arena → roca oscura → arrecife) y las paredes empinadas proyectan la textura de lado para que no se estire.
- **Arrecife** (`Plants.js`): 520 matas de alga y 150 racimos de coral (ramas, cúpulas y abanicos en cinco tonos), concentrados donde `arrecifeAt()` es alto.
- **Fauna**: se eliminó la flora bioluminiscente del fondo (los puntos que parecían luces). Quedan peces y medusas.
- **Focos**: haz principal más potente y de bordes suaves, luz de relleno alrededor del submarino y un cono de luz visible con partículas; se apagan juntos con **L**. Las luces del fondo solo se ven donde alcanza el foco.

## Choques con el fondo (ronda 4)
- `physics/ContactoFondo.js`: el casco (esferas a lo largo de su eje) ya no atraviesa el terreno, los bloques ni los pilares; se corrige posición y velocidad, con casi nada de rebote y algo de fricción. La física de flotación no cambia.
- Choque **fuerte** (≥ 1,0 m/s contra la superficie): se daña un componente instalado al azar (propulsor −50 % de empuje, aletas −60 % de área, sonar −65 % de alcance, focos al 35 % de luz, bomba de lastre −50 %), los **focos y la luz de cabina parpadean 5 s**, hay sacudida con destello rojo, aviso y evento de telemetría `choque`. Roces de 0,5–1,0 m/s solo sacuden la pantalla. Un mismo golpe no cuenta dos veces (2,5 s de margen).
- **Corrección**: el choque ya no usa solo el centro del casco; también comprueba 19 puntos de la silueta completa (popa con propulsor, aletas, domo, torre, base de cada pieza exterior). Medido con 3 aterrizajes (llano, con avance y en pendiente), ninguna pieza queda bajo el suelo. Fuera de los 800 m del terreno se usa el borde como suelo.
