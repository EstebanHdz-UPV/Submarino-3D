/**
 * telemetria.js
 * Fachada y conector en español para el módulo de Telemetría del Core.
 * Integra la emisión de muestras, eventos estandarizados y el motor de evaluación (D4).
 */
import { Telemetry, EVENTOS_ESTANDARIZADOS } from './Telemetry.js';
import { Evaluacion, generarPuntajes, evaluarTelemetria, calcularObjetivos } from './evaluacion.js';

export const Telemetria = Telemetry;
export { Telemetry, EVENTOS_ESTANDARIZADOS, Evaluacion, generarPuntajes, evaluarTelemetria, calcularObjetivos };
export default Telemetry;
