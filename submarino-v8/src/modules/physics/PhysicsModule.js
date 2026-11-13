// Física del submarino: 6 grados de libertad con paso fijo. JS puro, sin dependencias (se puede probar en Node).
// Mundo: x = avance inicial, y = izquierda, z = arriba (profundidad = -z).
// Cuerpo: [f, l, u] = adelante, izquierda, arriba (columnas de la matriz de orientación R).
import { densidadAgua, presionManometricaPa } from './Pressure.js';
import { peso, fraccionSumergida } from './Buoyancy.js';
import { arrastre, kArrastreGuinada } from './Drag.js';
import { masaEfectiva } from './AddedMass.js';
import { parEmpuje, alturaMetacentrica } from './Stability.js';
import { corrienteEn } from './Currents.js';
import { Ballast } from '../submarine/Ballast.js';
import { Battery } from '../submarine/Battery.js';
import { inundacionMaxKg } from '../submarine/MissingParts.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// Entradas inválidas nunca deben contaminar el estado físico con NaN.
const clamp = (x, lo, hi) => Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : 0;

export class PhysicsModule {
  /**
   * @param {object} world physics.json  @param {object} env { tipoAgua, temperaturaC, corrienteMs, corrienteDirRad, modoSimplificado }
   * @param {object} stats resultado de computeStats  @param {object} opts { startDepthM, fill }
   */
  constructor(world, env, stats, opts = {}) {
    if (!stats.casco) throw new Error('No se puede simular sin casco');
    if (!world.modelo) throw new Error('physics.json: falta el bloque "modelo" con los coeficientes del modelo físico');
    this.w = world; this.k = world.modelo; this.env = env; this.s = stats;
    this.t = 0;
    this.pos = [0, 0, -(opts.startDepthM ?? 0)];
    this.vel = [0, 0, 0];
    this.R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // f, l, u en ejes del mundo
    this.omega = [opts.faults?.rollRateRadS ?? 0, opts.faults?.pitchRateRadS ?? 0, 0]; // [p, q, r]
    this.faults = opts.faults ?? {};
    this.ballast = new Ballast(stats.tanqueM3, stats.bombaM3s, stats.consumoBombaW);
    this.ballast.fill = clamp(opts.fill ?? 0, 0, 1);
    this.battery = new Battery(stats.capacidadWh, stats.coefTempCapacidad, env.temperaturaC ?? 15, world.modoSimplificado || env.modoSimplificado);
    this.throttle = 0; this.thrustN = 0; this.powerW = 0; this.rudder = 0;
    this.floodKg = 0; this.pesosSoltados = false; this.fallaEnergia = false; this.colapsado = false; this.alertaProfundidad = false;
    this.events = []; this.distanceM = 0; this.maxDepthM = 0; this.maxSpeedMs = 0; this.maxPitchDeg = 0;
    this.ky = kArrastreGuinada(densidadAgua(world, env, 0), world.cdCuerpo.cilindro.lateral, stats.anchoM, stats.largoM);
  }

  // ---------- magnitudes derivadas ----------
  get depth() { return -this.pos[2]; }
  get mDry() { return this.s.masaSecaKg - (this.pesosSoltados ? this.s.masaPesosSoltablesKg : 0); }
  rho(depth = this.depth) { return densidadAgua(this.w, this.env, depth); }
  waterBallastKg(rho) { return this.ballast.fill * this.s.tanqueM3 * rho; }
  get mass() { return this.mDry + this.waterBallastKg(this.rho()) + this.floodKg; }
  get heading() { return Math.atan2(this.R[0][1], this.R[0][0]); }
  get pitch() { return Math.asin(clamp(this.R[0][2], -1, 1)); }
  get roll() { return Math.atan2(this.R[1][2], this.R[2][2]); }
  get forwardSpeed() { return dot(this.vel, this.R[0]); }
  get speed() { return Math.hypot(...this.vel); }
  /** Llenado de lastre para flotabilidad neutra con las condiciones actuales (puede salir de 0..1). */
  neutralFill() {
    const rho = this.rho();
    if (this.s.tanqueM3 <= 0) return null;
    return (rho * this.s.volumenEnvolventeM3 - (this.mDry + this.floodKg)) / (rho * this.s.tanqueM3);
  }
  meffVertical() { return masaEfectiva(this.mass, this.rho(), this.s.volumenEnvolventeM3, this.w.masaAnadida).vertical; }
  meffForward() { return masaEfectiva(this.mass, this.rho(), this.s.volumenEnvolventeM3, this.w.masaAnadida).avance; }
  dragForward(vRel) { return arrastre(this.rho(), this.s.cdaF, vRel); }
  /** Velocidad del agua (corriente) en el punto actual (mundo). */
  waterVelocity() { return corrienteEn(this.env, this.depth); }
  get powered() { return this.s.capacidadWh > 0 && !this.battery.empty; }

  /**
   * Inyecta un suceso externo (lo programa el escenario, no el piloto). Acciones: 'falla-energia', 'soltar-pesos'.
   * @param {string} accion
   */
  inject(accion) {
    switch (accion) {
      case 'falla-energia': this.battery.agotar(); this.fallaEnergia = true; this.events.push({ t: this.t, tipo: 'falla-energia' }); break;
      case 'soltar-pesos': this.releaseWeights(); break;
      default: throw new RangeError(`Acción de evento desconocida: ${accion}`);
    }
  }

  /** Suelta los pesos de compensación (emergencia). */
  releaseWeights() {
    if (this.pesosSoltados || this.s.masaPesosSoltablesKg <= 0) return;
    this.pesosSoltados = true; this.events.push({ t: this.t, tipo: 'pesos-soltados' });
  }

  /**
   * Un paso de simulación. Orden fijo: actuadores → inundación → energía → traslación → rotación → orientación → límites.
   * @param {number} dt segundos
   * @param {object} input { throttle -1..1, rudder -1..1 (+ = derecha), ballastCmd -1..1 (+ = llenar), ballastTarget 0..1, blow, power:boolean }
   */
  step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) {
      throw new RangeError('El paso de simulación dt debe ser un número finito mayor que cero.');
    }
    if (this.colapsado) return this.snapshot();
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const depth = this.depth;
    // Contexto del paso: valores medidos al INICIO del paso y resultados intermedios que comparten las fases.
    const c = { dt, input, depth, rho: this.rho(depth), frac: fraccionSumergida(depth, this.s.semialturaM), powered: this.powered && input.power !== false };
    this.#actuadores(c);
    this.#inundacion(c);
    this.#energia(c);
    this.#traslacion(c);
    this.#rotacion(c);
    this.#orientacion(dt);
    this.#limitesYEventos(dt);
    return this.snapshot();
  }

  /** Empuje con rampa, timón, hélice sumergida y bomba de lastre. Rellena c.prop y c.pumpW. */
  #actuadores(c) {
    const { w, s, k } = this, { dt, input, frac, powered } = c;
    const targetThr = powered ? clamp(input.throttle ?? 0, -1, 1) : 0;
    const dThr = w.rampaEmpuje * dt;
    this.throttle += clamp(targetThr - this.throttle, -dThr, dThr);
    this.rudder = powered && s.areaAletasM2 > 0 ? clamp(input.rudder ?? 0, -1, 1) : 0;
    c.prop = frac > k.fraccionMinimaHelice && s.empujeMaxN > 0;
    this.thrustN = c.prop ? this.throttle * s.empujeMaxN : 0;

    let ballastCmd = input.ballastCmd ?? 0;
    if (input.ballastTarget != null) ballastCmd = clamp((input.ballastTarget - this.ballast.fill) / Math.max(1e-9, this.ballast.rate * dt), -1, 1);
    c.pumpW = this.ballast.step(dt, ballastCmd, powered, !!input.blow);
  }

  /** Entrada de agua si falta el domo (cabina). */
  #inundacion({ dt, depth, rho }) {
    const { w, s, env, k } = this;
    const fuga = Math.max(0, this.faults.fugaKgS ?? 0);
    if (!(depth > 0) || (!(s.efectos.inundacion) && fuga <= 0)) return;
    const max = inundacionMaxKg(s, rho);
    const tasa = (s.efectos.inundacion ? k.tasaInundacionKgS : 0) + fuga;
    this.floodKg = Math.min(max, this.floodKg + tasa * Math.sqrt(presionManometricaPa(w, env, depth) / 1e5 + 1e-3) * dt);
  }

  /** Potencia instantánea y descarga de la batería. */
  #energia({ dt, input, powered, pumpW }) {
    const { s, k } = this;
    const vf0 = this.forwardSpeed;
    const pThrust = Math.abs(this.thrustN) > 0 ? Math.max(s.potenciaNominalW * Math.pow(Math.abs(this.throttle), k.exponentePotenciaEmpuje), Math.abs(this.thrustN * vf0) / s.eficiencia) : 0;
    const pLateral = Math.abs(input.lateral ?? 0) > 0 && powered ? k.potenciaLateralRel * s.potenciaNominalW * Math.pow(Math.abs(input.lateral), k.exponentePotenciaEmpuje) : 0;
    this.powerW = (powered ? s.consumoBaseW : 0) + pumpW + pThrust + pLateral;
    this.battery.drain(this.powerW, dt);
  }

  /** Fuerzas lineales (peso, empuje, arrastre, propulsión) e integración de velocidad y posición. Rellena c.m, c.Fb, c.vf. */
  #traslacion(c) {
    const { w, s, env, k } = this, { dt, input, depth, rho, frac, powered, prop } = c, g = w.gravedad;
    const m = this.mass;
    const [f, l, u] = this.R;
    const cur = frac > 0 ? corrienteEn(env, depth) : [0, 0, 0];
    const vRel = [this.vel[0] - cur[0], this.vel[1] - cur[1], this.vel[2] - cur[2]];
    const vf = dot(vRel, f), vl = dot(vRel, l), vu = dot(vRel, u);
    const Fb = rho * g * s.volumenEnvolventeM3 * frac;
    const surfH = 4 * frac * (1 - frac); // amortiguamiento por radiación de olas al flotar en superficie
    const cSurf = 2 * k.razonAmortiguamientoOlas * Math.sqrt(rho * g * s.anchoM * s.largoM * (s.masaSecaKg + 1)) * surfH;
    const Fworld = [0, 0, Fb - peso(m, g) - cSurf * this.vel[2]];
    const latN = prop && powered ? clamp(input.lateral ?? 0, -1, 1) * k.empujeLateralRel * s.empujeMaxN : 0; // propulsor lateral pequeño
    this.lateralN = latN;
    const Fbody = [
      dot(Fworld, f) + this.thrustN + frac * arrastre(rho, s.cdaF, vf),
      dot(Fworld, l) + latN + frac * arrastre(rho, s.cdaL, vl),
      dot(Fworld, u) + frac * arrastre(rho, s.cdaU, vu)
    ];
    const me = masaEfectiva(m, rho, s.volumenEnvolventeM3 * Math.max(frac, k.fraccionMinimaVolumen), w.masaAnadida);
    const aBody = [Fbody[0] / me.avance, Fbody[1] / me.lateral, Fbody[2] / me.vertical];
    const aWorld = addv(addv(sc(f, aBody[0]), sc(l, aBody[1])), sc(u, aBody[2]));
    this.vel = addv(this.vel, sc(aWorld, dt));
    const dx = sc(this.vel, dt);
    this.pos = addv(this.pos, dx);
    this.distanceM += Math.hypot(dx[0], dx[1], dx[2]);
    c.m = m; c.Fb = Fb; c.vf = vf;
  }

  /** Centro de gravedad en ejes del cuerpo (piezas + agua del tanque − pesos soltados). */
  #centroGravedad(m, rho) {
    const s = this.s;
    let momCg = sc(s.momentoSecoM, 1); // Σ m·r de las piezas (casco en el origen)
    if (this.pesosSoltados) momCg = addv(momCg, sc(s.momentoPesosM, -1));
    if (this.floodKg > 0) momCg = addv(momCg, sc([0, 0, -s.radioM * 0.55], this.floodKg));
    momCg = addv(momCg, sc(s.tanquePosM, this.waterBallastKg(rho)));
    return sc(momCg, 1 / m);
  }

  /** Momentos (cuerpo): par de flotación, restauración en superficie, amortiguamiento y timón. Actualiza this.omega. */
  #rotacion({ dt, rho, frac, m, Fb, vf }) {
    const { w, s, k } = this, g = w.gravedad;
    const [f, l, u] = this.R;
    const cg = this.#centroGravedad(m, rho);
    const FbBody = [dot([0, 0, Fb], f), dot([0, 0, Fb], l), dot([0, 0, Fb], u)];
    const tau = parEmpuje(s.cbM, cg, FbBody);

    const roll = this.roll, pitch = this.pitch;
    const surf = 4 * frac * (1 - frac);
    if (surf > 0) { // flotación en superficie: aporta el plano de flotación (BM)
      const Vs = s.volumenEnvolventeM3 * Math.max(frac, k.fraccionMinimaVolumen);
      const bmT = (s.largoM * Math.pow(s.anchoM, 3) / 12) / Vs, bmL = (s.anchoM * Math.pow(s.largoM, 3) / 12) / Vs;
      tau[0] += -m * g * bmT * Math.sin(roll) * surf * k.factorRestauracionSuperficie;
      tau[1] += m * g * bmL * Math.sin(pitch) * surf * k.factorRestauracionSuperficie;
    }
    const gm = Math.max(k.gmMinimoM, Math.abs(alturaMetacentrica({ bgM: s.cbM[2] - cg[2], largoM: s.largoM, anchoM: s.anchoM, volumenSumergidoM3: s.volumenEnvolventeM3 * frac, fraccion: frac })));
    const kStiff = m * g * gm;
    const z = w.razonAmortiguamientoAngular;
    const [Ir, Ip, Iy] = [s.inercia.roll, s.inercia.pitch, s.inercia.yaw];
    tau[0] -= 2 * z * Math.sqrt(kStiff * Ir) * this.omega[0];
    tau[1] -= 2 * z * Math.sqrt(kStiff * Ip) * this.omega[1];
    // guiñada: aletas (timón) y arrastre rotacional
    const armLen = w.brazoAletasRel * s.largoM / 2;
    tau[2] += -0.5 * rho * w.clAletas * s.areaAletasM2 * vf * Math.abs(vf) * this.rudder * armLen * frac;
    tau[2] -= this.ky * Math.abs(this.omega[2]) * this.omega[2] * (rho / k.densidadReferenciaKgM3) * frac;
    tau[2] -= k.amortiguamientoGuinadaLineal * Math.sqrt(kStiff * Iy) * this.omega[2]; // amortiguamiento lineal pequeño

    this.omega[0] = clamp(this.omega[0] + tau[0] / Ir * dt, -k.omegaMaxRadS, k.omegaMaxRadS);
    this.omega[1] = clamp(this.omega[1] + tau[1] / Ip * dt, -k.omegaMaxRadS, k.omegaMaxRadS);
    this.omega[2] = clamp(this.omega[2] + tau[2] / Iy * dt, -k.omegaMaxRadS, k.omegaMaxRadS);
  }

  /** Orientación: df/dt = -q·u + r·l ; dl/dt = p·u - r·f ; du/dt = -p·l + q·f (con re-ortonormalización). */
  #orientacion(dt) {
    const [f, l, u] = this.R;
    const [p, q, r] = this.omega;
    let nf = addv(f, sc(addv(sc(u, -q), sc(l, r)), dt));
    let nl = addv(l, sc(addv(sc(u, p), sc(f, -r)), dt));
    nf = norm(nf); nl = norm(addv(nl, sc(nf, -dot(nl, nf))));
    this.R = [nf, nl, cross(nf, nl)];
  }

  /** Avanza el reloj, actualiza máximos y emite eventos (alerta, colapso, energía agotada). */
  #limitesYEventos(dt) {
    const s = this.s;
    this.t += dt;
    const d = this.depth;
    this.maxDepthM = Math.max(this.maxDepthM, d);
    this.maxSpeedMs = Math.max(this.maxSpeedMs, this.speed);
    this.maxPitchDeg = Math.max(this.maxPitchDeg, Math.abs(this.pitch) * 180 / Math.PI);
    if (!this.alertaProfundidad && d > s.alertaProfundidadFrac * s.profundidadDisenoM && s.profundidadDisenoM > 0) {
      this.alertaProfundidad = true; this.events.push({ t: this.t, tipo: 'alerta-profundidad', depthM: d });
    }
    if (d > s.profundidadColapsoM) {
      this.colapsado = true; this.events.push({ t: this.t, tipo: 'colapso', depthM: d, pieza: s.limitante });
    }
    if (this.battery.empty && !this._sinEnergia && s.capacidadWh > 0) { this._sinEnergia = true; this.events.push({ t: this.t, tipo: 'energia-agotada' }); }
  }

  /** Estado para HUD, telemetría y gráficas. */
  snapshot() {
    const rho = this.rho();
    const Pabs = this.w.presionAtmosfericaPa + presionManometricaPa(this.w, this.env, this.depth);
    return {
      t: this.t, pos: [...this.pos], depthM: this.depth, speedMs: this.speed, forwardMs: this.forwardSpeed,
      headingDeg: ((this.heading * 180 / Math.PI) % 360 + 360) % 360, pitchDeg: this.pitch * 180 / Math.PI, rollDeg: this.roll * 180 / Math.PI,
      yawRateDegS: this.omega[2] * 180 / Math.PI, ballastFill: this.ballast.fill, ballastKg: this.waterBallastKg(rho), floodKg: this.floodKg,
      pressureAtm: Pabs / 101325, throttle: this.throttle, thrustN: this.thrustN, powerW: this.powerW,
      energyWh: this.battery.energyWh, soc: this.battery.soc, massKg: this.mass, colapsado: this.colapsado, powered: this.powered
    };
  }
}
