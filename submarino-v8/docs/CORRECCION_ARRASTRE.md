# Corrección del arrastre de piezas

## Causa principal

El helper `h()` convertía cualquier propiedad booleana `true` en un atributo HTML vacío. Esto es válido para atributos booleanos como `disabled`, pero `draggable` es un atributo enumerado: el navegador espera literalmente `draggable="true"` o `draggable="false"`. Al recibir `draggable=""`, los botones del catálogo quedaban en modo automático y no iniciaban el arrastre HTML5.

## Cambios

- El helper DOM serializa `draggable` como `true`/`false` explícitos.
- Las 88 tarjetas del catálogo conservan su miniatura SVG individual y usan esa imagen como imagen de arrastre.
- Las imágenes de las tarjetas no interceptan el gesto del ratón.
- Las 11 categorías mantienen su catálogo de ocho piezas cada una.
- El área 3D acepta `dragenter`, `dragover` y `drop`.
- Las piezas ya instaladas pueden arrastrarse desde su punto del menú; al soltarlas se actualiza su posición o se trasladan a otro punto compatible.
- Los límites siguen definidos por los puntos de montaje de `assembly-rules.json`. Reemplazar una pieza en un punto ocupado no aumenta la cantidad instalada; retirar una pieza sigue disponible desde su detalle.

## Verificación

Ejecutar `npm test`. La suite cubre el catálogo de 88 piezas/11 categorías, la conexión del flujo de arrastre y las reglas de capacidad del ensamblaje.
