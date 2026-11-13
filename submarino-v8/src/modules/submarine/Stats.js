// Estadísticas del diseño (masa, volumen, CG/CB, flotabilidad, colapso, energía, costo).
// Ejes del cuerpo: [adelante, izquierda, arriba]. posRel en data/assembly-rules.json: x derecha, y arriba, z proa.
import { densidadAgua } from '../physics/Pressure.js';
import { profundidadesCasco } from '../physics/HullStress.js';
import { inerciaAnadida } from '../physics/AddedMass.js';

const add3 = (a, b, k = 1) => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/**
 * Contrato de `stats`: lo producen `computeStats` y lo consumen la física, el dictamen, el HUD y las pantallas.
 * Vectores en ejes del cuerpo [adelante, izquierda, arriba] (m). SI en todo (m, kg, N, W, Wh), salvo `costoUsd`.
 * Si falta el casco, `casco` es null y casi todo lo demás queda en su valor inicial.
 *
 * @typedef {object} Stats
 * @property {boolean} completo               true si no falta ninguna pieza obligatoria
 * @property {Array<{slot:string,nombre:string,obligatorio:boolean,mensaje:string}>} faltantes
 * @property {string[]} advertencias          textos para mostrar al usuario
 * @property {{sinCasco:boolean,sinEmpuje:boolean,sinLastre:boolean,sinEnergia:boolean,inundacion:boolean,sinAletas:boolean}} efectos
 * @property {?object} casco                  { id, forma, radioM, largoM, espesorM, material, masaKg, volumenM3, fluencia, pandeo, colapso (Pa), modo, colapsoM, disenoM }
 * @property {number} masaSecaKg              masa de todas las piezas (sin agua de lastre)
 * @property {number} masaPesosSoltablesKg    parte de la masa que se puede soltar en emergencia
 * @property {number} volumenEnvolventeM3     volumen que desplaza el submarino sumergido
 * @property {number} costoUsd
 * @property {number} largoM @property {number} radioM @property {number} anchoM @property {number} semialturaM  geometría del casco
 * @property {number} tanqueM3 @property {number} bombaM3s @property {number} consumoBombaW  lastre variable
 * @property {number[]} tanquePosM            posición del tanque (cuerpo)
 * @property {?number[]} posAletasM           posición de las aletas (null si no hay)
 * @property {number} empujeMaxN @property {number} potenciaNominalW @property {number} eficiencia  propulsión
 * @property {number} capacidadWh @property {number} coefTempCapacidad  batería
 * @property {number} consumoBaseW            equipos permanentes (base + aletas + focos + sonar)
 * @property {number} areaAletasM2 @property {number} alcanceSonarM @property {number} alcanceLuzM
 * @property {number} cdaF @property {number} cdaL @property {number} cdaU  Cd·A por eje (m²)
 * @property {number[]} momentoSecoM          Σ m·r de las piezas sin el casco (kg·m)
 * @property {number[]} momentoPesosM         Σ m·r de los pesos soltables (kg·m)
 * @property {number[]} cgM @property {number[]} cbM  centros de gravedad y de flotación (m)
 * @property {number} rhoSuperficie           densidad del agua en superficie (kg/m³)
 * @property {number} flotabilidadNetaKg      con los tanques vacíos (< 0: se hunde)
 * @property {?number} llenadoNeutro          fracción de tanque para flotabilidad neutra (null sin tanque)
 * @property {number} bgM                     CB − CG vertical (> 0: estable)
 * @property {?number} trimadoDeg             inclinación estática estimada (null si BG ≤ 0)
 * @property {{roll:number,pitch:number,yaw:number}} inercia  kg·m², incluye masa añadida
 * @property {Array<{slot:string,nombre:string,disenoM:number,colapsoM:number}>} limites
 * @property {number} profundidadColapsoM @property {number} profundidadDisenoM @property {string} limitante @property {number} factorSeguridad
 * @property {number} alertaProfundidadFrac   fracción de la profundidad de diseño que dispara la alerta
 * @property {?{velocidadMs:number,potenciaW:number,horas:number}} autonomiaCrucero
 */

/** Stats con todos los campos en su valor inicial: única lista de campos del contrato. @returns {Stats} */
export function crearStatsVacias(world) {
  return {
    completo: false, faltantes: [], advertencias: [], componentesFisicos: [],
    efectos: { sinCasco: true, sinEmpuje: true, sinLastre: true, sinEnergia: true, inundacion: true, sinAletas: true },
    casco: null,
    masaSecaKg: 0, masaPesosSoltablesKg: 0, volumenEnvolventeM3: 0, costoUsd: 0,
    largoM: 0, radioM: 0, anchoM: 0, semialturaM: 0,
    tanqueM3: 0, bombaM3s: 0, consumoBombaW: 0, tanquePosM: [0, 0, 0], posAletasM: null,
    empujeMaxN: 0, potenciaNominalW: 0, eficiencia: 0.5, capacidadWh: 0, coefTempCapacidad: 0,
    consumoBaseW: world.potenciaEquiposBaseW, areaAletasM2: 0, alcanceSonarM: 0, alcanceLuzM: 0,
    cdaF: 0, cdaL: 0, cdaU: 0,
    momentoSecoM: [0, 0, 0], momentoPesosM: [0, 0, 0], cgM: [0, 0, 0], cbM: [0, 0, 0], gmLongM: 0, gmTransM: 0,
    rhoSuperficie: 0, flotabilidadNetaKg: 0, llenadoNeutro: null, bgM: 0, trimadoDeg: null,
    inercia: { roll: 0, pitch: 0, yaw: 0 },
    limites: [], profundidadColapsoM: 0, profundidadDisenoM: 0, limitante: '', factorSeguridad: world.factorSeguridad,
    alertaProfundidadFrac: world.modelo.alertaProfundidadFrac, autonomiaCrucero: null
  };
}

export function geometriaCasco(casco) {
  const r = casco.radioM, L = casco.forma === 'esfera' ? 2 * r : casco.largoM;
  return { r, L, halfL: L / 2 };
}

export function posicionSlot(slot, casco) {
  const { r, halfL } = geometriaCasco(casco ?? { radioM: 0.6, largoM: 3, forma: 'cilindro' });
  return [slot.posRel.z * halfL, -slot.posRel.x * r, slot.posRel.y * r];
}

/** Calcula todas las estadísticas del ensamble. @returns {Stats} */
export function computeStats(assembly, world, env) {
  const rho0 = densidadAgua(world, env, 0);
  const s = crearStatsVacias(world);
  const placed = piezasColocadas(assembly, s);
  const hullP = placed.find((p) => p.slot.tipo === 'casco');
  const find = (tipo) => placed.find((p) => p.slot.tipo === tipo);
  s.completo = s.faltantes.every((f) => !f.obligatorio);
  s.efectos = { sinCasco: !hullP, sinEmpuje: !find('propulsion'), sinLastre: !find('lastre'), sinEnergia: !find('bateria'), inundacion: !find('cabina'), sinAletas: !find('aletas') };
  if (!hullP) { s.advertencias.push('Falta el casco: no se puede calcular el resto.'); return s; }

  const acc = statsCasco(s, hullP, world, env);
  acumularPiezas(s, placed, hullP.part, world, acc);
  cerrarAcumuladores(s, acc);
  statsFlotabilidad(s, rho0);
  statsInercia(s, hullP.part, acc, rho0, world);
  statsLimites(s, world);
  statsAutonomia(s, rho0);
  generarAdvertencias(s, hullP.material);
  return s;
}

// ---------- fases de computeStats ----------

/** Piezas puestas en cada punto de montaje; rellena `s.faltantes`. */
function piezasColocadas(assembly, s) {
  const placed = [];
  for (const slot of assembly.rules.slots) {
    const it = assembly.get(slot.id);
    if (it) placed.push({ slot: it.posRel ? { ...slot, posRel: it.posRel } : slot, part: it.part, material: it.material });
    else s.faltantes.push({ slot: slot.id, nombre: slot.nombre, obligatorio: slot.obligatorio, mensaje: slot.faltante });
  }
  return placed;
}

/** Geometría, masa, resistencia y arrastre del casco. Devuelve los acumuladores iniciales. */
function statsCasco(s, hullP, world, env) {
  const c = hullP.part, mat = hullP.material;
  const { r, L } = geometriaCasco(c);
  const shellVol = c.forma === 'esfera' ? 4 * Math.PI * r * r * c.espesorM : 2 * Math.PI * r * L * c.espesorM + 2 * Math.PI * r * r * c.espesorM;
  const hullMass = mat.densidadKgM3 * shellVol;
  const hullVol = c.forma === 'esfera' ? 4 / 3 * Math.PI * r ** 3 : Math.PI * r * r * L;
  const crit = profundidadesCasco(c, mat, world, env);
  s.casco = { id: c.id, forma: c.forma, radioM: r, largoM: L, espesorM: c.espesorM, material: mat.id, masaKg: hullMass, volumenM3: hullVol, ...crit };
  s.largoM = L; s.radioM = r; s.anchoM = 2 * r; s.semialturaM = r;
  const cd = world.cdCuerpo[c.forma === 'esfera' ? 'esfera' : 'cilindro'];
  const areaFrontal = Math.PI * r * r;
  const areaPlanta = c.forma === 'esfera' ? Math.PI * r * r : 2 * r * L;
  s.costoUsd += hullMass * mat.costoUsdKg * (c.factorCostoFabricacion ?? 3);
  s.limites.push({ slot: 'casco', nombre: c.nombre, disenoM: crit.disenoM, colapsoM: crit.colapsoM });
  s.componentesFisicos.push({ slot: 'casco', id: c.id, nombre: c.nombre, tipo: 'casco', masaKg: hullMass, volumenM3: hullVol, densidadKgM3: mat.densidadKgM3, cdaM2: 0, profundidadDisenoM: crit.disenoM, posicionM: [0, 0, 0], centroMasaKgM: [0, 0, 0] });
  return {
    hullMass, mass: hullMass, mom: [0, 0, 0], vol: hullVol, volMom: [0, 0, 0], pesosMom: [0, 0, 0],
    massPts: [{ m: hullMass, r: [0, 0, 0], hull: true }],
    cdaF: cd.avance * areaFrontal, cdaL: cd.lateral * areaPlanta, cdaU: cd.vertical * areaPlanta
  };
}

/** Suma masa, momento, volumen externo, arrastre, costo y especificaciones de cada pieza no casco. */
function acumularPiezas(s, placed, casco, world, acc) {
  for (const p of placed) {
    if (p.slot.tipo === 'casco') continue;
    const pt = p.part, pos = posicionSlot(p.slot, casco);
    const fis = pt.propiedadesFisicas ?? {};
    const m = pt.masaKg ?? fis.masaSecaKg ?? 0;
    const vFis = pt.volumenM3 ?? fis.volumenDesplazadoM3 ?? 0;
    const rhoFis = pt.densidadKgM3 ?? (vFis > 0 && m > 0 ? m / vFis : fis.densidadKgM3 ?? null);
    s.componentesFisicos.push({ slot: p.slot.id, id: pt.id, nombre: pt.nombre, tipo: p.slot.tipo, masaKg: m, volumenM3: vFis, densidadKgM3: rhoFis, cdaM2: pt.cdaM2 ?? fis.coeficienteArrastreAreaM2 ?? 0, profundidadDisenoM: pt.profundidadDisenoM ?? fis.profundidadOperacionM ?? null, posicionM: [...pos], centroMasaKgM: pos.map(v => v * m) });
    acc.mass += m; acc.mom = add3(acc.mom, pos, m); acc.massPts.push({ m, r: pos });
    s.costoUsd += pt.costoUsd ?? 0;
    if (vFis && p.slot.externo) { acc.vol += vFis; acc.volMom = add3(acc.volMom, pos, vFis); }
    const cdaPart = pt.cdaM2 ?? fis.coeficienteArrastreAreaM2 ?? 0;
    if (cdaPart) { acc.cdaF += cdaPart * world.cdApendices; const lat = (pt.areaLateralM2 ?? cdaPart * 4) * world.cdApendices; acc.cdaL += lat; acc.cdaU += lat; }
    const profundidadPieza = pt.profundidadDisenoM ?? fis.profundidadOperacionM;
    if (profundidadPieza) s.limites.push({ slot: p.slot.id, nombre: pt.nombre, disenoM: profundidadPieza, colapsoM: profundidadPieza * world.factorSeguridad });
    switch (p.slot.tipo) {
      case 'propulsion': s.empujeMaxN += pt.empujeMaxN ?? 0; s.potenciaNominalW += pt.potenciaNominalW ?? 0; s.eficiencia = Math.max(s.eficiencia, pt.eficiencia ?? 0); break;
      case 'lastre': { const previo = s.tanqueM3; s.tanqueM3 += pt.volumenM3 ?? 0; s.bombaM3s += pt.bombaM3s ?? 0; s.consumoBombaW += pt.consumoBombaW ?? 0; s.tanquePosM = previo + (pt.volumenM3 ?? 0) > 0 ? s.tanquePosM.map((v,i) => (v * previo + pos[i] * (pt.volumenM3 ?? 0)) / (previo + (pt.volumenM3 ?? 0))) : pos; acc.tanqueUbicado = true; break; }
      case 'bateria': s.capacidadWh += pt.capacidadWh ?? 0; s.coefTempCapacidad = Math.max(s.coefTempCapacidad, pt.coefTempCapacidad ?? 0); break;
      case 'aletas': s.areaAletasM2 += pt.areaAletasM2 ?? 0; s.consumoBaseW += pt.consumoW ?? 0; s.posAletasM = pos; break;
      case 'lastreFijo': s.masaPesosSoltablesKg += m; acc.pesosMom = add3(acc.pesosMom, pos, m); break;
      case 'focos': s.consumoBaseW += pt.consumoW ?? 0; s.alcanceLuzM = Math.max(s.alcanceLuzM, pt.alcanceLuzM ?? 0); break;
      case 'sonar': s.consumoBaseW += pt.consumoW ?? 0; s.alcanceSonarM = Math.max(s.alcanceSonarM, pt.alcanceM ?? 0); break;
      default: break;
    }
  }
  // Sin tanque de lastre, el "tanque" vacío se ubica en el fondo del casco.
  if (!acc.tanqueUbicado) s.tanquePosM = [0, 0, -s.radioM];
}

/** Vuelca los acumuladores en `s` y calcula CG y CB. */
function cerrarAcumuladores(s, acc) {
  const { mass, mom, vol, volMom } = acc;
  s.masaSecaKg = mass; s.volumenEnvolventeM3 = vol; s.cdaF = acc.cdaF; s.cdaL = acc.cdaL; s.cdaU = acc.cdaU;
  s.momentoSecoM = [...mom]; // Σ m·r de las piezas (sin el casco, que está en el origen)
  s.momentoPesosM = acc.pesosMom;
  s.cgM = mass > 0 ? mom.map((x) => x / mass) : [0, 0, 0];
  s.cbM = vol > 0 ? volMom.map((x) => x / vol) : [0, 0, 0];
}

/** Flotabilidad con tanques vacíos, llenado neutro, estabilidad vertical y trimado. */
function statsFlotabilidad(s, rho0) {
  s.rhoSuperficie = rho0;
  s.flotabilidadNetaKg = rho0 * s.volumenEnvolventeM3 - s.masaSecaKg;
  s.llenadoNeutro = s.tanqueM3 > 0 ? s.flotabilidadNetaKg / (rho0 * s.tanqueM3) : null;
  s.bgM = s.cbM[2] - s.cgM[2];
  // Trimado estático estimado: ángulo al que el CG queda bajo el CB (tan = desfase longitudinal / BG)
  s.trimadoDeg = s.bgM > 0 ? Math.atan((s.cbM[0] - s.cgM[0]) / s.bgM) * 180 / Math.PI : null;
}

/** Inercia: masas puntuales + casco como cáscara + inercia añadida. */
function statsInercia(s, c, acc, rho0, world) {
  const { r, L } = geometriaCasco(c), hullMass = acc.hullMass;
  const shellRoll = c.forma === 'esfera' ? 2 / 3 * hullMass * r * r : hullMass * r * r;
  const shellPY = c.forma === 'esfera' ? 2 / 3 * hullMass * r * r : hullMass * (r * r / 2 + L * L / 12);
  let Ir = shellRoll, Ip = shellPY, Iy = shellPY;
  for (const q of acc.massPts) {
    if (q.hull) continue;
    Ir += q.m * (q.r[1] ** 2 + q.r[2] ** 2); Ip += q.m * (q.r[0] ** 2 + q.r[2] ** 2); Iy += q.m * (q.r[0] ** 2 + q.r[1] ** 2);
  }
  const ia = inerciaAnadida(rho0, s.volumenEnvolventeM3, world.masaAnadida, L, r);
  s.inercia = { roll: Ir + ia.roll, pitch: Ip + ia.pitch, yaw: Iy + ia.yaw };
}

/** Pieza limitante: la de menor profundidad de colapso. */
function statsLimites(s, world) {
  const lim = s.limites.reduce((a, b) => (b.colapsoM < a.colapsoM ? b : a));
  s.profundidadColapsoM = lim.colapsoM; s.profundidadDisenoM = Math.min(...s.limites.map((l) => l.disenoM)); s.limitante = lim.nombre;
  s.factorSeguridad = world.factorSeguridad;
}

/** Consumo y autonomía a velocidad crucero (1,5 m/s). */
function statsAutonomia(s, rho0) {
  if (!s.capacidadWh || !s.empujeMaxN) { s.autonomiaCrucero = null; return; }
  const v = 1.5;
  const T = 0.5 * rho0 * s.cdaF * v * v; // N para 1,5 m/s
  const pw = Math.max(s.potenciaNominalW * Math.pow(Math.min(1, T / s.empujeMaxN), 1.5), T * v / s.eficiencia) + s.consumoBaseW;
  s.autonomiaCrucero = { velocidadMs: v, potenciaW: pw, horas: s.capacidadWh / pw };
}

function generarAdvertencias(s, mat) {
  if (s.flotabilidadNetaKg < 0) s.advertencias.push(`Con los tanques vacíos el submarino se hunde (${s.flotabilidadNetaKg.toFixed(0)} kg de flotabilidad).`);
  if (s.llenadoNeutro !== null && (s.llenadoNeutro < 0 || s.llenadoNeutro > 1)) s.advertencias.push(`No se logra flotabilidad neutra con el lastre (se requeriría un llenado de ${(s.llenadoNeutro * 100).toFixed(0)} %).`);
  if (s.bgM <= 0 || s.gmTransM <= 0 || s.gmLongM <= 0) s.advertencias.push('Inestable: margen metacéntrico no positivo; revisar distribución de masas y montaje.');
  else if (Math.abs(s.trimadoDeg) > 5) s.advertencias.push(`Desequilibrio longitudinal: el submarino quedará inclinado unos ${Math.abs(s.trimadoDeg).toFixed(0)}° (mueve peso o batería, o cambia piezas).`);
  if (mat.profundidadRecomendadaM && s.casco.disenoM > mat.profundidadRecomendadaM[1] * 3) s.advertencias.push(`El material ${mat.nombre} es mayor a lo necesario para esa profundidad (costo innecesario).`);
}
