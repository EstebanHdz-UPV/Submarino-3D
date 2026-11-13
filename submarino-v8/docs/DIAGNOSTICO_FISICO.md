# Diagnóstico físico y fallas de ensamblaje

## Alcance añadido

- Cada variante del catálogo incluye `propiedadesFisicas`: masa seca de referencia, volumen desplazado, densidad, área de arrastre, profundidad de operación y centro de masa relativo.
- `Stats.computeStats` consolida masa, volumen exterior desplazado, centro de gravedad y contribuciones de masa por componente.
- Se calculan márgenes metacéntricos longitudinal y transversal (`gmLongM`, `gmTransM`) además de BG y trimado.
- El taller muestra alertas de flotabilidad, llenado neutro imposible, centro de gravedad elevado, trimado, desplazamiento lateral, piezas limitantes y componentes obligatorios ausentes.
- La prueba comparativa ejecuta el motor dinámico en condición nominal y con una falla inducida (fuga y velocidad angular inicial de balanceo/cabeceo). El agua acumulada aumenta la masa y desplaza el centro de gravedad hacia la zona inferior del casco.

## Uso

En **Ensamblaje**, abre el panel **Diagnóstico y simulación de seguridad**:
1. `Simular fuga y desbalance` ejecuta 20 s con fallas inducidas.
2. `Probar condición nominal` ejecuta 20 s sin esas fallas.
3. Corrige el montaje y vuelve a ejecutar la condición nominal para comparar los resultados.

## Hipótesis y límites

Los valores de catálogo que no existían se estiman a partir de la envolvente visual (factor geométrico 0,28); las densidades faltantes se derivan de masa/volumen cuando es posible. Las masas de casco se recalculan con material y geometría seleccionados. La prueba de fuga usa una tasa de referencia de 0,45 kg/s, limitada por la capacidad de inundación del modelo. Las velocidades angulares iniciales son perturbaciones didácticas.

Este módulo es una simulación educativa de ingeniería con parámetros aproximados, no un análisis CFD/FEA ni una certificación de seguridad de un submarino real. Antes de usar valores para diseño físico, deben calibrarse con geometría, materiales, ensayos y normas aplicables.
