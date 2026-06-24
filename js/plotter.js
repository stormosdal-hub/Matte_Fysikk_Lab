"use strict";
/* Felles tegneverktøy + GraphView: interaktivt koordinatsystem med
   pan (dra), zoom (rullehjul), rutenett og kurvetegning. */

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(40, Math.round(rect.width));
  const h = Math.max(40, Math.round(rect.height));
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function formatNum(v, digits = 6) {
  if (!isFinite(v)) return v > 0 ? "∞" : v < 0 ? "−∞" : "–";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return v.toExponential(2);
  let s = v.toPrecision(digits);
  if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
  return s;
}

function niceStep(span, targetTicks) {
  const raw = span / Math.max(1, targetTicks);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function drawArrow(ctx, x0, y0, x1, y1, color, opts = {}) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(13, 5 + len * 0.1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = opts.width || 2.5;
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - ux * head * 0.6, y1 - uy * head * 0.6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * head - uy * head * 0.45, y1 - uy * head + ux * head * 0.45);
  ctx.lineTo(x1 - ux * head + uy * head * 0.45, y1 - uy * head - ux * head * 0.45);
  ctx.closePath();
  ctx.fill();
  if (opts.label) {
    ctx.font = "bold 13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lx = x1 + ux * 14 + (opts.labelOff ? opts.labelOff[0] : 0);
    const ly = y1 + uy * 14 + (opts.labelOff ? opts.labelOff[1] : 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0d1017";
    ctx.strokeText(opts.label, lx, ly);
    ctx.fillText(opts.label, lx, ly);
  }
  ctx.restore();
}

class GraphView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.xmin = opts.xmin !== undefined ? opts.xmin : -10;
    this.xmax = opts.xmax !== undefined ? opts.xmax : 10;
    this.ymin = opts.ymin !== undefined ? opts.ymin : -6;
    this.ymax = opts.ymax !== undefined ? opts.ymax : 6;
    this.home = { xmin: this.xmin, xmax: this.xmax, ymin: this.ymin, ymax: this.ymax };
    this.onDraw = opts.onDraw || null;
    this.onHover = opts.onHover || null;       // (wx, wy, px, py) — null ved utgang
    this.hitTest = opts.hitTest || null;       // (wx, wy, px, py) -> dratarget | null
    this.onDragTarget = opts.onDragTarget || null;
    this.w = 300; this.h = 150;
    this._raf = 0;
    this._drag = null;
    this._bind();
  }

  resize() {
    const r = fitCanvas(this.canvas);
    this.w = r.w; this.h = r.h;
    this.requestRender();
  }

  x2px(x) { return (x - this.xmin) / (this.xmax - this.xmin) * this.w; }
  y2px(y) { return this.h - (y - this.ymin) / (this.ymax - this.ymin) * this.h; }
  px2x(px) { return this.xmin + px / this.w * (this.xmax - this.xmin); }
  px2y(py) { return this.ymin + (this.h - py) / this.h * (this.ymax - this.ymin); }

  panBy(dxPx, dyPx) {
    const sx = (this.xmax - this.xmin) / this.w;
    const sy = (this.ymax - this.ymin) / this.h;
    this.xmin -= dxPx * sx; this.xmax -= dxPx * sx;
    this.ymin += dyPx * sy; this.ymax += dyPx * sy;
    this.requestRender();
  }

  zoomAt(px, py, f) {
    const span = this.xmax - this.xmin;
    if ((span * f < 1e-8 && f < 1) || (span * f > 1e12 && f > 1)) return;
    const wx = this.px2x(px), wy = this.px2y(py);
    this.xmin = wx - (wx - this.xmin) * f;
    this.xmax = wx + (this.xmax - wx) * f;
    this.ymin = wy - (wy - this.ymin) * f;
    this.ymax = wy + (this.ymax - wy) * f;
    this.requestRender();
  }

  zoomCenter(f) { this.zoomAt(this.w / 2, this.h / 2, f); }

  reset() {
    Object.assign(this, this.home);
    this.requestRender();
  }

  requestRender() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
  }

  render() {
    fitCanvas(this.canvas);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(40, Math.round(r.width));
    this.h = Math.max(40, Math.round(r.height));
    const ctx = this.ctx;
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, this.w, this.h);
    this._grid();
    if (this.onDraw) this.onDraw(this);
  }

  _grid() {
    const ctx = this.ctx;
    const xs = niceStep(this.xmax - this.xmin, this.w / 90);
    const ys = niceStep(this.ymax - this.ymin, this.h / 70);
    ctx.save();
    ctx.font = "11px Segoe UI, sans-serif";

    // små hjelpelinjer
    const minorX = xs / 5, minorY = ys / 5;
    if (minorX / (this.xmax - this.xmin) * this.w > 7) {
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.beginPath();
      for (let k = Math.ceil(this.xmin / minorX); k * minorX <= this.xmax; k++) {
        const px = this.x2px(k * minorX);
        ctx.moveTo(px, 0); ctx.lineTo(px, this.h);
      }
      for (let k = Math.ceil(this.ymin / minorY); k * minorY <= this.ymax; k++) {
        const py = this.y2px(k * minorY);
        ctx.moveTo(0, py); ctx.lineTo(this.w, py);
      }
      ctx.stroke();
    }

    // hovedlinjer
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    for (let k = Math.ceil(this.xmin / xs); k * xs <= this.xmax; k++) {
      if (k === 0) continue;
      const px = this.x2px(k * xs);
      ctx.moveTo(px, 0); ctx.lineTo(px, this.h);
    }
    for (let k = Math.ceil(this.ymin / ys); k * ys <= this.ymax; k++) {
      if (k === 0) continue;
      const py = this.y2px(k * ys);
      ctx.moveTo(0, py); ctx.lineTo(this.w, py);
    }
    ctx.stroke();

    // akser
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (this.ymin <= 0 && this.ymax >= 0) {
      const py = this.y2px(0);
      ctx.moveTo(0, py); ctx.lineTo(this.w, py);
    }
    if (this.xmin <= 0 && this.xmax >= 0) {
      const px = this.x2px(0);
      ctx.moveTo(px, 0); ctx.lineTo(px, this.h);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // tall-merkelapper
    ctx.fillStyle = "#8b94a7";
    const py0 = Math.min(Math.max(this.y2px(0), 12), this.h - 18);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let k = Math.ceil(this.xmin / xs); k * xs <= this.xmax; k++) {
      if (k === 0) continue;
      ctx.fillText(formatNum(k * xs), this.x2px(k * xs), py0 + 5);
    }
    const px0 = Math.min(Math.max(this.x2px(0), 26), this.w - 8);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k = Math.ceil(this.ymin / ys); k * ys <= this.ymax; k++) {
      if (k === 0) continue;
      ctx.fillText(formatNum(k * ys), px0 - 6, this.y2px(k * ys));
    }
    if (this.xmin <= 0 && this.xmax >= 0 && this.ymin <= 0 && this.ymax >= 0) {
      ctx.fillText("0", this.x2px(0) - 6, this.y2px(0) + 10);
    }
    ctx.restore();
  }

  /* Tegner y = fn(x) med brudd ved asymptoter/udefinerte områder. */
  plot(fn, color, opts = {}) {
    const ctx = this.ctx;
    const yPad = (this.ymax - this.ymin) * 0.5;
    const yLo = this.ymin - yPad, yHi = this.ymax + yPad;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = opts.width || 2;
    if (opts.dash) ctx.setLineDash(opts.dash);
    if (opts.alpha) ctx.globalAlpha = opts.alpha;
    ctx.beginPath();
    let pen = false, prevClamp = 0;
    const step = (this.xmax - this.xmin) / this.w;
    for (let i = 0; i <= this.w; i++) {
      const x = this.xmin + i * step;
      let y = fn(x);
      if (!isFinite(y)) { pen = false; prevClamp = 0; continue; }
      let clamp = 0;
      if (y < yLo) { y = yLo; clamp = -1; }
      else if (y > yHi) { y = yHi; clamp = 1; }
      if (clamp !== 0 && prevClamp !== 0 && clamp !== prevClamp) pen = false; // asymptote
      const py = this.y2px(y);
      if (pen) ctx.lineTo(i, py);
      else { ctx.moveTo(i, py); pen = true; }
      prevClamp = clamp;
    }
    ctx.stroke();
    ctx.restore();
  }

  /* Skyggelegger området mellom kurven og x-aksen fra a til b. */
  fillRegion(fn, a, b, color, alpha = 0.22) {
    if (a > b) { const t = a; a = b; b = t; }
    a = Math.max(a, this.xmin);
    b = Math.min(b, this.xmax);
    if (!(a < b)) return;
    const ctx = this.ctx;
    const yPad = (this.ymax - this.ymin) * 0.5;
    const yLo = this.ymin - yPad, yHi = this.ymax + yPad;
    const n = Math.max(8, Math.round((this.x2px(b) - this.x2px(a))));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x2px(a), this.y2px(0));
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n;
      let y = fn(x);
      if (!isFinite(y)) y = 0;
      y = Math.min(yHi, Math.max(yLo, y));
      ctx.lineTo(this.x2px(x), this.y2px(y));
    }
    ctx.lineTo(this.x2px(b), this.y2px(0));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawDot(x, y, fill, r = 4.5, ring = "#0d1017") {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x2px(x), this.y2px(y), r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.restore();
  }

  _m(e) {
    const r = this.canvas.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", e => {
      c.setPointerCapture(e.pointerId);
      const { px, py } = this._m(e);
      if (this.hitTest) {
        const t = this.hitTest(this.px2x(px), this.px2y(py), px, py);
        if (t) { this._drag = { target: t }; return; }
      }
      this._drag = { pan: true, px, py };
    });
    c.addEventListener("pointermove", e => {
      const { px, py } = this._m(e);
      if (this._drag) {
        if (this._drag.target) {
          if (this.onDragTarget) this.onDragTarget(this._drag.target, this.px2x(px), this.px2y(py));
        } else {
          this.panBy(px - this._drag.px, py - this._drag.py);
          this._drag.px = px; this._drag.py = py;
        }
      } else if (this.onHover) {
        this.onHover(this.px2x(px), this.px2y(py), px, py);
      }
    });
    const end = () => { this._drag = null; };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("pointerleave", () => {
      if (!this._drag && this.onHover) this.onHover(null);
    });
    c.addEventListener("wheel", e => {
      e.preventDefault();
      const { px, py } = this._m(e);
      this.zoomAt(px, py, Math.exp(e.deltaY * 0.0012));
    }, { passive: false });
  }
}
