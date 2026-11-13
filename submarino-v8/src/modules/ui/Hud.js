// HUD del piloto dibujado con Canvas 2D nativo (+ iconos SVG): brújula, profundidad, inclinación, batería y alertas.
import { imagen } from './Icons.js';
import { Sonar } from './Sonar.js';
import { KN } from '../../core/Units.js';

const AZUL = '#cfe3ff', TENUE = '#8fa8c8';

export class Hud {
  constructor(canvas) { this.canvas = canvas; this.g = canvas.getContext('2d'); this.sonar = new Sonar(); this.w = 0; this.h = 0; }
  resize() {
    const dpr = window.devicePixelRatio || 1, r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height; this.canvas.width = r.width * dpr; this.canvas.height = r.height * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  limpiar() { this.g.clearRect(0, 0, this.w, this.h); }

  /** Alertas activas a partir del estado. */
  static alertas(s, stats) {
    const a = [];
    if (s.colapsado) a.push({ nivel: 'critica', texto: 'COLAPSO ESTRUCTURAL' });
    else if (stats.profundidadDisenoM > 0 && s.depthM > stats.profundidadDisenoM) a.push({ nivel: 'critica', texto: 'PROFUNDIDAD CRÍTICA' });
    else if (stats.profundidadDisenoM > 0 && s.depthM > stats.alertaProfundidadFrac * stats.profundidadDisenoM) a.push({ nivel: 'aviso', texto: 'Cerca de la profundidad de diseño' });
    if (!s.powered) a.push({ nivel: 'critica', texto: 'SIN ENERGÍA' });
    else if (s.soc < 0.2) a.push({ nivel: 'aviso', texto: 'Batería baja' });
    if (s.floodKg > 1) a.push({ nivel: 'critica', texto: 'INUNDACIÓN' });
    return a;
  }

  dibujar(s, stats, ctx) {
    const g = this.g; this.limpiar();
    if (!ctx.mostrarDatos) return;
    this._estado(g, s, stats);
    this._alertas(g, Hud.alertas(s, stats));
    const base = this.h - 84, esc = Math.min(1, this.w / 760);
    this._horizonte(g, 80 * esc + 14, base, 56 * esc, s.pitchDeg, s.rollDeg);
    this._brujula(g, 80 * esc + 14 + 124 * esc, base, 56 * esc, s.headingDeg);
    this._profundidad(g, 14 + 124 * esc * 2 + 80 * esc, base - 70 * esc, 18, 140 * esc, s.depthM, stats);
    if (this.w > 620) this.sonar.dibujar(g, this.w - 80 * esc - 14, base, 62 * esc, { ...ctx.sonar, activo: stats.alcanceSonarM > 0, alcanceM: stats.alcanceSonarM || 100 });
  }

  _chip(g, x, y, icono, texto, color = AZUL) {
    g.fillStyle = 'rgba(6,20,40,.72)'; g.beginPath(); g.roundRect(x, y, 128, 28, 8); g.fill();
    const im = imagen(icono); if (im.complete) g.drawImage(im, x + 6, y + 4, 20, 20);
    g.fillStyle = color; g.font = '600 13px system-ui'; g.textAlign = 'left'; g.fillText(texto, x + 32, y + 19);
  }
  _estado(g, s, stats) {
    this._chip(g, 12, 12, 'bateria', `${(s.soc * 100).toFixed(0)} %  ${Math.round(s.energyWh / 10) / 100} kWh`, s.soc < 0.2 ? '#ffb020' : AZUL);
    this._chip(g, 12, 46, 'velocidad', `${(s.forwardMs / KN).toFixed(1)} nudos`);
    this._chip(g, 12, 80, 'profundidad', `${s.depthM.toFixed(1)} m`);
    this._chip(g, 12, 114, 'presion', `${s.pressureAtm.toFixed(1)} atm`);
    this._chip(g, 12, 148, 'motor', `${(s.throttle * 100).toFixed(0)} %  ${(s.powerW / 1000).toFixed(1)} kW`);
    // lastre
    g.fillStyle = 'rgba(6,20,40,.72)'; g.beginPath(); g.roundRect(12, 182, 128, 28, 8); g.fill();
    g.fillStyle = TENUE; g.font = '11px system-ui'; g.fillText('Lastre', 20, 200);
    g.fillStyle = 'rgba(160,190,230,.25)'; g.fillRect(62, 192, 70, 8); g.fillStyle = '#4da3ff'; g.fillRect(62, 192, 70 * s.ballastFill, 8);
    void stats;
  }
  _alertas(g, lista) {
    let y = 14;
    for (const a of lista) {
      const w = 250, x = this.w / 2 - w / 2;
      g.fillStyle = a.nivel === 'critica' ? 'rgba(120,10,10,.85)' : 'rgba(110,70,0,.85)'; g.beginPath(); g.roundRect(x, y, w, 30, 8); g.fill();
      const im = imagen('alerta'); if (im.complete) g.drawImage(im, x + 8, y + 5, 20, 20);
      g.fillStyle = '#fff'; g.font = '700 13px system-ui'; g.textAlign = 'left'; g.fillText(a.texto, x + 36, y + 20);
      y += 36;
    }
  }
  _horizonte(g, cx, cy, r, pitch, roll) {
    g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    g.rotate(-roll * Math.PI / 180);
    const off = Math.max(-r * 1.2, Math.min(r * 1.2, pitch * r / 30));
    g.fillStyle = '#2c7fb8'; g.fillRect(-r * 2, -r * 2 + off, r * 4, r * 2);
    g.fillStyle = '#6b4a2a'; g.fillRect(-r * 2, off, r * 4, r * 2);
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r, off); g.lineTo(r, off); g.stroke();
    for (const p of [-20, -10, 10, 20]) { const yy = off - p * r / 30; g.beginPath(); g.moveTo(-r * 0.25, yy); g.lineTo(r * 0.25, yy); g.stroke(); }
    g.restore();
    g.strokeStyle = AZUL; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ffd24d'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - r * 0.5, cy); g.lineTo(cx - r * 0.15, cy); g.moveTo(cx + r * 0.15, cy); g.lineTo(cx + r * 0.5, cy); g.stroke();
    g.fillStyle = TENUE; g.font = '10px system-ui'; g.textAlign = 'center'; g.fillText(`${pitch.toFixed(0)}° / ${roll.toFixed(0)}°`, cx, cy + r + 13);
  }
  _brujula(g, cx, cy, r, rumbo) {
    g.save(); g.translate(cx, cy);
    g.fillStyle = 'rgba(6,20,40,.78)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = AZUL; g.lineWidth = 2; g.stroke();
    g.rotate(-rumbo * Math.PI / 180); // el norte (eje +x del mundo) queda donde corresponde
    for (let a = 0; a < 360; a += 30) {
      g.save(); g.rotate(a * Math.PI / 180); g.strokeStyle = TENUE; g.beginPath(); g.moveTo(0, -r + 3); g.lineTo(0, -r + (a % 90 === 0 ? 11 : 7)); g.stroke(); g.restore();
    }
    g.fillStyle = AZUL; g.font = '700 11px system-ui'; g.textAlign = 'center';
    g.fillText('0°', 0, -r + 24); g.fillText('90°', r - 18, 4); g.fillText('180°', 0, r - 14); g.fillText('270°', -r + 18, 4);
    g.restore();
    g.fillStyle = '#ffd24d'; g.beginPath(); g.moveTo(cx, cy - r - 2); g.lineTo(cx - 6, cy - r + 10); g.lineTo(cx + 6, cy - r + 10); g.fill();
    g.fillStyle = AZUL; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.fillText(`${rumbo.toFixed(0)}°`, cx, cy + 5);
  }
  _profundidad(g, x, y, w, hgt, d, stats) {
    const max = Math.max(50, (stats.profundidadColapsoM || 100) * 1.05);
    g.fillStyle = 'rgba(6,20,40,.78)'; g.beginPath(); g.roundRect(x - 8, y - 14, w + 62, hgt + 34, 8); g.fill();
    g.fillStyle = 'rgba(160,190,230,.25)'; g.fillRect(x, y, w, hgt);
    const yy = (m) => y + Math.min(1, m / max) * hgt;
    g.fillStyle = 'rgba(255,176,32,.5)'; g.fillRect(x, yy(stats.profundidadDisenoM), w, hgt - (yy(stats.profundidadDisenoM) - y));
    g.fillStyle = 'rgba(255,60,60,.7)'; g.fillRect(x, yy(stats.profundidadColapsoM), w, hgt - (yy(stats.profundidadColapsoM) - y));
    g.fillStyle = '#4da3ff'; g.fillRect(x - 4, yy(d) - 2, w + 8, 4);
    g.fillStyle = AZUL; g.font = '700 12px system-ui'; g.textAlign = 'left'; g.fillText(`${d.toFixed(0)} m`, x + w + 8, Math.min(y + hgt - 14, Math.max(y + 22, yy(d) + 4)));
    g.fillStyle = TENUE; g.font = '10px system-ui'; g.fillText('0', x + w + 8, y + 8); g.fillText(`${max.toFixed(0)}`, x + w + 8, y + hgt);
    g.fillText('Profundidad', x - 4, y - 18);
  }
}
