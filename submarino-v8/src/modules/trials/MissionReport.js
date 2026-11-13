// Construye informes reproducibles a partir de resultados de TrialRunner.
// No ejecuta maniobras ni declara seguridad real: resume los criterios configurados.
const iso = (value) => {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new RangeError('La fecha del informe no es válida.');
  return date.toISOString();
};

const safeText = (value, fallback = 'Sin nombre') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

/** Genera un resumen agregado a partir de una lista de resultados de ejecutarPrueba. */
export function generarInformeMision(resultados, { nombre = 'Misión de exploración', fecha = new Date() } = {}) {
  if (!Array.isArray(resultados)) throw new TypeError('resultados debe ser un arreglo.');
  const pruebas = resultados.map((resultado, index) => {
    if (!resultado || typeof resultado !== 'object') throw new TypeError(`Resultado ${index + 1} inválido.`);
    const escenario = resultado.escenario ?? {};
    const dictamen = resultado.dictamen ?? {};
    const checks = Array.isArray(dictamen.checks) ? dictamen.checks : [];
    const fallos = checks.filter((check) => check?.ok !== true).map((check) => ({
      id: safeText(check?.id, 'desconocido'),
      criterio: safeText(check?.texto, safeText(check?.id, 'Criterio desconocido')),
      detalle: safeText(check?.detalle, 'Sin detalle')
    }));
    const completada = resultado.ok === true && !resultado.error;
    const aprobada = completada && dictamen.aprobado === true && checks.length > 0 && fallos.length === 0;
    return {
      indice: index + 1,
      escenario: safeText(escenario.nombre ?? escenario.titulo ?? escenario.tipo, `Prueba ${index + 1}`),
      tipo: safeText(escenario.tipo, 'desconocido'),
      completada,
      aprobada,
      error: resultado.error ? safeText(String(resultado.error)) : null,
      criteriosEvaluados: checks.length,
      criteriosFallidos: fallos,
      resumen: resultado.resumen && typeof resultado.resumen === 'object' ? { ...resultado.resumen } : null
    };
  });
  const aprobadas = pruebas.filter((p) => p.aprobada).length;
  const completadas = pruebas.filter((p) => p.completada).length;
  const fallos = pruebas.flatMap((p) => p.criteriosFallidos.map((f) => ({ escenario: p.escenario, ...f })));
  const errores = pruebas.filter((p) => !p.completada).map((p) => ({ escenario: p.escenario, error: p.error ?? 'La prueba no se completó.' }));
  const recomendaciones = [];
  if (pruebas.length === 0) recomendaciones.push('Ejecutar al menos una prueba antes de emitir conclusiones.');
  if (errores.length) recomendaciones.push('Revisar los errores de ejecución y repetir las pruebas incompletas.');
  if (fallos.length) recomendaciones.push('Investigar los criterios fallidos; revisar entradas, diseño y parámetros físicos.');
  if (aprobadas !== pruebas.length) recomendaciones.push('No considerar la misión aprobada mientras exista una prueba fallida o incompleta.');
  if (pruebas.length > 0 && aprobadas === pruebas.length) recomendaciones.push('Todos los criterios configurados pasaron; validar el modelo con datos de referencia antes de atribuir realismo físico.');
  return {
    version: 1,
    nombre: safeText(nombre, 'Misión de exploración'),
    generadoEn: iso(fecha),
    estado: pruebas.length > 0 && aprobadas === pruebas.length ? 'aprobada_segun_criterios' : 'requiere_revision',
    totales: { pruebas: pruebas.length, completadas, aprobadas, fallidas: pruebas.length - aprobadas, criteriosFallidos: fallos.length, erroresEjecucion: errores.length },
    pruebas,
    recomendaciones,
    nota: 'Este informe resume criterios de software configurados; no constituye certificación ni garantiza seguridad en un vehículo real.'
  };
}

/** Serialización JSON estable para guardar o descargar desde la interfaz. */
export function informeComoJSON(informe) {
  if (!informe || typeof informe !== 'object' || !informe.totales || !Array.isArray(informe.pruebas)) {
    throw new TypeError('Informe de misión inválido.');
  }
  return `${JSON.stringify(informe, null, 2)}\n`;
}

/** Exporta una fila por prueba en CSV con escape de comillas y saltos de línea. */
export function informeComoCSV(informe) {
  if (!informe || !Array.isArray(informe.pruebas)) throw new TypeError('Informe de misión inválido.');
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rows = [['Misión', 'Generado en', 'Escenario', 'Tipo', 'Completada', 'Aprobada', 'Criterios evaluados', 'Criterios fallidos', 'Error']];
  for (const prueba of informe.pruebas) {
    rows.push([informe.nombre, informe.generadoEn, prueba.escenario, prueba.tipo, prueba.completada, prueba.aprobada,
      prueba.criteriosEvaluados, prueba.criteriosFallidos.map((f) => `${f.criterio}: ${f.detalle}`).join('; '), prueba.error ?? '']);
  }
  return `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}
