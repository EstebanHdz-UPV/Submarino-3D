// Contacto del casco con el lecho (terreno) y las rocas. Solo corrige posición y velocidad del cuerpo físico;
// no cambia las ecuaciones de flotación. El casco se aproxima con esferas a lo largo de su eje.
// puntos del disco (fracciones del radio) donde se mide la altura del terreno bajo/alrededor de cada esfera
const DISCO = [[0, 0]];
for (const rho of [0.45, 0.8, 1]) for (let k = 0; k < 8; k++) DISCO.push([rho * Math.cos(k * Math.PI / 4 + rho), rho * Math.sin(k * Math.PI / 4 + rho)]);
const norm3 = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };

/**
 * @param {PhysicsModule} phys  cuerpo (ejes físicos: x adelante, y izquierda, z arriba)
 * @param {{alturaFondo:(x:number,z:number)=>number, elipsoides:object[], techoY:number}} mundo  coordenadas de Babylon (x derecha, y arriba, z adelante)
 * @param {number} dt
 * @returns {?{impacto:number, normal:number[], punto:number[]}} velocidad de choque contra la superficie (m/s) o null si no hubo contacto
 */
export function resolverContacto(phys, mundo, dt) {
  const s = phys.s, r = Math.max(0.25, s.radioM || 0.5), L = Math.max(s.largoM || 2 * r, 2 * r);
  const R = phys.R, f = R[0], fb = [-f[1], f[2], f[0]];
  const c = [-phys.pos[1], phys.pos[2], phys.pos[0]];
  if (c[1] - r - L > mundo.techoY) return null;                       // muy por encima del relieve
  // Muestras: esferas del casco a lo largo del eje + puntos de las esquinas de toda la silueta (popa, aletas, domo, torre…).
  const n = Math.max(3, Math.ceil(L / (r * 1.2))), largo = Math.max(0, L - r * 1.2), muestras = [];
  for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5) * largo; muestras.push({ P: [c[0] + fb[0] * t, c[1] + fb[1] * t, c[2] + fb[2] * t], r }); }
  if (phys.puntosContacto?.length) {
    const der = [R[1][1], -R[1][2], -R[1][0]], arr = [-R[2][1], R[2][2], R[2][0]], ade = fb;      // ejes locales (derecha, arriba, proa) en el mundo de Babylon
    for (const [lx, ly, lz, rp] of phys.puntosContacto) muestras.push({ P: [c[0] + lx * der[0] + ly * arr[0] + lz * ade[0], c[1] + lx * der[1] + ly * arr[1] + lz * ade[1], c[2] + lx * der[2] + ly * arr[2] + lz * ade[2]], r: rp });
  }
  const empuje = [0, 0, 0], normal = [0, 0, 0]; let contactos = 0, punto = c;
  const apuntar = (nrm, pen, P) => { empuje[0] += nrm[0] * pen; empuje[1] += nrm[1] * pen; empuje[2] += nrm[2] * pen; normal[0] += nrm[0]; normal[1] += nrm[1]; normal[2] += nrm[2]; contactos++; punto = P; };
  for (const { P, r: rm } of muestras) {
    // terreno
    const h = mundo.alturaFondo(P[0], P[2]), pen = h - (P[1] - rm);
    if (pen > 0) {
      const e = 1, hx = (mundo.alturaFondo(P[0] + e, P[2]) - mundo.alturaFondo(P[0] - e, P[2])) / (2 * e), hz = (mundo.alturaFondo(P[0], P[2] + e) - mundo.alturaFondo(P[0], P[2] - e)) / (2 * e);
      const nrm = norm3([-hx, 1, -hz]); apuntar(nrm, pen * nrm[1], P);
    }
    // rocas y pilares (elipsoides inflados por el radio de la muestra)
    for (const el of mundo.elipsoides) {
      const dx = P[0] - el.x, dy = P[1] - el.y, dz = P[2] - el.z, M = Math.max(el.ax, el.ay, el.az) + rm;
      if (Math.abs(dx) > M || Math.abs(dy) > M || Math.abs(dz) > M) continue;
      const cs = Math.cos(el.rot), sn = Math.sin(el.rot), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const ax = el.ax + rm, ay = el.ay + rm, az = el.az + rm, q = (lx / ax) ** 2 + (dy / ay) ** 2 + (lz / az) ** 2;
      if (q >= 1) continue;
      const dist = Math.hypot(dx, dy, dz) || 1e-6, d = Math.max(Math.sqrt(q), 0.05), pen = Math.min(2 * rm, dist * (1 / d - 1));
      const gx = lx / (ax * ax), gy = dy / (ay * ay), gz = lz / (az * az), g = norm3([gx, gy, gz]);
      apuntar(norm3([g[0] * cs + g[2] * sn, g[1], -g[0] * sn + g[2] * cs]), pen, P);
    }
  }
  if (!contactos) return null;
  // a ejes físicos: (x,y,z)_babylon → (z, -x, y)
  const aFis = (v) => [v[2], -v[0], v[1]];
  const e = aFis(empuje), nf = norm3(aFis(normal));
  // varios puntos en contacto: se aplica la corrección mayor (no la media) para que ningún punto quede dentro
  const kc = contactos > 1 ? 0.7 : 1;
  phys.pos = [phys.pos[0] + e[0] * kc, phys.pos[1] + e[1] * kc, phys.pos[2] + e[2] * kc];
  const vn = phys.vel[0] * nf[0] + phys.vel[1] * nf[1] + phys.vel[2] * nf[2];
  let impacto = 0;
  if (vn < 0) {
    impacto = -vn;
    const rebote = 1 + 0.12;                                           // casi sin rebote: arena y roca absorben
    phys.vel = [phys.vel[0] - rebote * vn * nf[0], phys.vel[1] - rebote * vn * nf[1], phys.vel[2] - rebote * vn * nf[2]];
  }
  const k = Math.min(1, 2.5 * dt);                                       // fricción: el casco se frena al rozar
  const vn2 = phys.vel[0] * nf[0] + phys.vel[1] * nf[1] + phys.vel[2] * nf[2];
  phys.vel = phys.vel.map((v, i) => v - (v - vn2 * nf[i]) * k);
  for (let i = 0; i < 3; i++) phys.omega[i] *= 1 - Math.min(1, 1.5 * dt); // y deja de girar
  return { impacto, normal: nf, punto };
}
