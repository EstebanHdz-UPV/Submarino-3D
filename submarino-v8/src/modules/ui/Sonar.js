// Sonar en Canvas 2D: barrido circular y ecos del fondo marino alrededor del submarino.
export class Sonar {
  constructor() { this.ang = 0; }
  /** alturaFondo(x,z) -> y del fondo (Babylon). snap/pose en coordenadas de Babylon. */
  dibujar(g, cx, cy, radio, { posB, headingRad, alcanceM, fondoY, alturaFondo, activo }) {
    g.save(); g.translate(cx, cy);
    g.fillStyle = 'rgba(5,25,20,.75)'; g.strokeStyle = 'rgba(60,220,140,.5)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, 0, radio, 0, Math.PI * 2); g.fill(); g.stroke();
    for (const k of [0.33, 0.66]) { g.beginPath(); g.arc(0, 0, radio * k, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(-radio, 0); g.lineTo(radio, 0); g.moveTo(0, -radio); g.lineTo(0, radio); g.stroke();
    g.fillStyle = '#6cf0a8'; g.font = '11px system-ui'; g.textAlign = 'center';
    if (!activo) { g.fillStyle = '#ff8a7a'; g.fillText('SIN SONAR', 0, 4); g.restore(); return; }
    this.ang = (this.ang + 0.04) % (Math.PI * 2);
    g.strokeStyle = 'rgba(100,255,170,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(this.ang) * radio, Math.sin(this.ang) * radio); g.stroke();
    // ecos: puntos del fondo dentro del alcance cuya altura sobresale (relieve), relativos al rumbo (arriba = proa)
    const paso = alcanceM / 14;
    for (let dx = -alcanceM; dx <= alcanceM; dx += paso) for (let dz = -alcanceM; dz <= alcanceM; dz += paso) {
      const d = Math.hypot(dx, dz); if (d > alcanceM) continue;
      const wx = posB.x + dx, wz = posB.z + dz, rel = alturaFondo(wx, wz) - fondoY;
      if (rel < 0.8) continue;
      const a = Math.atan2(dx, dz) - headingRad; // 0 = proa
      const rr = d / alcanceM * radio;
      g.fillStyle = `rgba(110,255,170,${Math.min(0.9, 0.2 + rel * 0.15)})`;
      g.beginPath(); g.arc(Math.sin(a) * rr, -Math.cos(a) * rr, 2.2, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#6cf0a8'; g.fillText(`${alcanceM} m`, 0, radio + 13);
    g.restore();
  }
}
