// Gráficas de líneas con Canvas 2D nativo.
/** series: [{ y: number[], color, etiqueta }], x: number[] */
export function graficar(canvas, { x, series, xEtiqueta = '', yEtiqueta = '', invertirY = false, yMin = null, yMax = null }) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 400, H = canvas.clientHeight || 200;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext('2d'); g.scale(dpr, dpr);
  g.clearRect(0, 0, W, H);
  const m = { l: 52, r: 14, t: 14, b: 34 };
  const todos = series.flatMap((s) => s.y).filter(Number.isFinite);
  if (!x.length || !todos.length) { g.fillStyle = '#8fa8c8'; g.font = '13px system-ui'; g.fillText('Sin datos', 12, 24); return; }
  let y0 = yMin ?? Math.min(...todos), y1 = yMax ?? Math.max(...todos);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.06; if (yMin === null) y0 -= pad; if (yMax === null) y1 += pad;
  const x0 = x[0], x1 = x[x.length - 1] || 1;
  const px = (v) => m.l + (v - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
  const py = (v) => { const t = (v - y0) / (y1 - y0); return invertirY ? m.t + t * (H - m.t - m.b) : H - m.b - t * (H - m.t - m.b); };
  g.strokeStyle = 'rgba(160,190,230,.18)'; g.fillStyle = '#9fb7d6'; g.font = '11px system-ui'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = y0 + (y1 - y0) * i / 4, yy = py(v);
    g.beginPath(); g.moveTo(m.l, yy); g.lineTo(W - m.r, yy); g.stroke();
    g.textAlign = 'right'; g.fillText(Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1), m.l - 6, yy + 4);
  }
  g.textAlign = 'center';
  for (let i = 0; i <= 4; i++) { const v = x0 + (x1 - x0) * i / 4; g.fillText(v >= 600 ? (v / 60).toFixed(0) : v.toFixed(0), px(v), H - m.b + 15); }
  g.fillText(xEtiqueta, (m.l + W - m.r) / 2, H - 4);
  g.save(); g.translate(12, (m.t + H - m.b) / 2); g.rotate(-Math.PI / 2); g.fillText(yEtiqueta, 0, 0); g.restore();
  for (const s of series) {
    g.strokeStyle = s.color; g.lineWidth = 2; g.beginPath();
    let first = true;
    s.y.forEach((v, i) => { if (!Number.isFinite(v)) return; const X = px(x[i]), Y = py(v); if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y); });
    g.stroke();
  }
}
