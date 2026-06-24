"use strict";
/* Lineær algebra-fanen: interaktive vektorer, 2×2-transformasjoner med
   egenvektorer, Gauss-eliminasjon med radoperasjoner, og en generell
   matriseregner (determinant, invers, rang, egenverdier, kvadratrot m.m.). */
const LinAlgTab = (() => {

  const $ = id => document.getElementById(id);
  const C_U = "#4fc3f7", C_V = "#ffa726", C_SUM = "#aed581", C_DIFF = "#f06292",
        C_PROJ = "#ba68c8", C_I = "#8bc34a", C_J = "#ff7043", C_W = "#ba68c8",
        C_EIG1 = "#ffd54f", C_EIG2 = "#4dd0e1";

  /* ================= matrise-numerikk ================= */

  const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));
  const ident = n => { const I = zeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  const clone = A => A.map(row => row.slice());

  function matAdd(A, B, sign = 1) {
    return A.map((row, i) => row.map((v, j) => v + sign * B[i][j]));
  }
  function matScale(k, A) { return A.map(row => row.map(v => k * v)); }
  function transpose(A) {
    return Array.from({ length: A[0].length }, (_, j) => A.map(row => row[j]));
  }
  function matMul(A, B) {
    const n = A.length, m = B[0].length, p = B.length;
    const C = zeros(n, m);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < p; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        for (let j = 0; j < m; j++) C[i][j] += a * B[k][j];
      }
    return C;
  }
  function maxAbs(A) {
    let m = 0;
    for (const row of A) for (const v of row) m = Math.max(m, Math.abs(v));
    return m;
  }

  function det(Ain) {
    const A = clone(Ain), n = A.length;
    let d = 1;
    for (let k = 0; k < n; k++) {
      let piv = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[piv][k])) piv = i;
      if (Math.abs(A[piv][k]) < 1e-13) return 0;
      if (piv !== k) { const t = A[piv]; A[piv] = A[k]; A[k] = t; d = -d; }
      d *= A[k][k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / A[k][k];
        for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      }
    }
    return d;
  }

  function matInv(Ain) {
    const n = Ain.length;
    const A = Ain.map((row, i) => row.concat(ident(n)[i]));
    for (let k = 0; k < n; k++) {
      let piv = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[piv][k])) piv = i;
      if (Math.abs(A[piv][k]) < 1e-12) return null;
      if (piv !== k) { const t = A[piv]; A[piv] = A[k]; A[k] = t; }
      const p = A[k][k];
      for (let j = 0; j < 2 * n; j++) A[k][j] /= p;
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        const f = A[i][k];
        if (f === 0) continue;
        for (let j = 0; j < 2 * n; j++) A[i][j] -= f * A[k][j];
      }
    }
    return A.map(row => row.slice(n));
  }

  function rref(Ain, tol) {
    const A = clone(Ain);
    const rows = A.length, cols = A[0].length;
    tol = tol || 1e-10 * Math.max(1, maxAbs(A));
    const pivots = [];
    let r = 0;
    for (let c = 0; c < cols && r < rows; c++) {
      let piv = r;
      for (let i = r + 1; i < rows; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i;
      if (Math.abs(A[piv][c]) < tol) continue;
      const t = A[piv]; A[piv] = A[r]; A[r] = t;
      const p = A[r][c];
      for (let j = 0; j < cols; j++) A[r][j] /= p;
      for (let i = 0; i < rows; i++) {
        if (i === r) continue;
        const f = A[i][c];
        if (Math.abs(f) < tol) continue;
        for (let j = 0; j < cols; j++) A[i][j] -= f * A[r][j];
      }
      pivots.push(c);
      r++;
    }
    return { R: A, pivots };
  }

  const rank = A => rref(A).pivots.length;

  // én vektor (≠0) i nullrommet til M, eller null hvis full rang
  function nullVec(M) {
    const n = M[0].length;
    const { R, pivots } = rref(M, 1e-7 * Math.max(1, maxAbs(M)));
    let free = -1;
    for (let c = 0; c < n; c++) if (pivots.indexOf(c) < 0) { free = c; break; }
    if (free < 0) return null;
    const v = Array(n).fill(0);
    v[free] = 1;
    for (let i = 0; i < pivots.length; i++) v[pivots[i]] = -R[i][free];
    return v;
  }

  function normalize(v) {
    const len = Math.hypot(...v);
    return len > 1e-12 ? v.map(x => x / len) : v;
  }

  // røtter av x³ + ax² + bx + c (Cardano)
  function solveCubic(a, b, c) {
    const p = b - a * a / 3;
    const q = 2 * a * a * a / 27 - a * b / 3 + c;
    const off = -a / 3;
    const scale = Math.max(Math.abs(p), Math.abs(q), 1);
    const D = q * q / 4 + p * p * p / 27;
    if (Math.abs(D) < 1e-13 * scale * scale) {
      if (Math.abs(q) < 1e-13 * scale) return [{ re: off, im: 0 }, { re: off, im: 0 }, { re: off, im: 0 }];
      const u = Math.cbrt(-q / 2);
      return [{ re: off + 2 * u, im: 0 }, { re: off - u, im: 0 }, { re: off - u, im: 0 }];
    }
    if (D > 0) {
      const s = Math.sqrt(D);
      const u = Math.cbrt(-q / 2 + s), w = Math.cbrt(-q / 2 - s);
      return [
        { re: off + u + w, im: 0 },
        { re: off - (u + w) / 2, im: Math.sqrt(3) / 2 * (u - w) },
        { re: off - (u + w) / 2, im: -Math.sqrt(3) / 2 * (u - w) }
      ];
    }
    const r = Math.sqrt(-p * p * p / 27);
    const phi = Math.acos(Math.min(1, Math.max(-1, -q / 2 / r)));
    const m = 2 * Math.sqrt(-p / 3);
    return [0, 1, 2].map(k => ({ re: off + m * Math.cos((phi + 2 * Math.PI * k) / 3), im: 0 }));
  }

  // egenverdier (og -vektorer for reelle λ) for 2×2 og 3×3
  function eigen(A) {
    const n = A.length;
    let lambdas;
    if (n === 2) {
      const tr = A[0][0] + A[1][1], dt = det(A);
      const disc = tr * tr / 4 - dt;
      if (disc >= -1e-12 * Math.max(1, tr * tr)) {
        const s = Math.sqrt(Math.max(0, disc));
        lambdas = [{ re: tr / 2 + s, im: 0 }, { re: tr / 2 - s, im: 0 }];
      } else {
        const s = Math.sqrt(-disc);
        lambdas = [{ re: tr / 2, im: s }, { re: tr / 2, im: -s }];
      }
    } else if (n === 3) {
      const tr = A[0][0] + A[1][1] + A[2][2];
      const m2 =
        A[1][1] * A[2][2] - A[1][2] * A[2][1] +
        A[0][0] * A[2][2] - A[0][2] * A[2][0] +
        A[0][0] * A[1][1] - A[0][1] * A[1][0];
      lambdas = solveCubic(-tr, m2, -det(A));
    } else {
      return null;
    }
    // egenvektorer for de reelle egenverdiene
    const out = lambdas.map(l => ({ re: l.re, im: l.im, vec: null }));
    for (const e of out) {
      if (Math.abs(e.im) > 1e-9) continue;
      const M = clone(A);
      for (let i = 0; i < n; i++) M[i][i] -= e.re;
      const v = nullVec(M);
      if (v) e.vec = normalize(v);
    }
    return out;
  }

  // kvadratrot av kvadratisk matrise via Denman–Beavers-iterasjon
  function sqrtm(A) {
    const n = A.length;
    let Y = clone(A), Z = ident(n);
    for (let it = 0; it < 80; it++) {
      const Yi = matInv(Y), Zi = matInv(Z);
      if (!Yi || !Zi) return null;
      const Yn = matScale(0.5, matAdd(Y, Zi));
      const Zn = matScale(0.5, matAdd(Z, Yi));
      let diff = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) diff = Math.max(diff, Math.abs(Yn[i][j] - Y[i][j]));
      Y = Yn; Z = Zn;
      if (diff < 1e-13 * Math.max(1, maxAbs(Y))) break;
    }
    // kontroller at Y·Y faktisk er A
    const E = matAdd(matMul(Y, Y), A, -1);
    if (!(maxAbs(E) < 1e-6 * Math.max(1, maxAbs(A)))) return null;
    return Y;
  }

  /* ================= visning av matriser ================= */

  function fm(v) {
    if (!isFinite(v)) return "–";
    if (Math.abs(v) < 1e-11) v = 0;
    return formatNum(v, 5);
  }

  function matHtml(A) {
    const cols = A[0].length;
    let h = '<span class="mat-disp" style="grid-template-columns:repeat(' + cols + ',auto)">';
    for (const row of A) for (const v of row) h += "<span>" + fm(v) + "</span>";
    return h + "</span>";
  }

  /* ================= vektor-kortet ================= */

  const vec = { u: { x: 3, y: 1 }, v: { x: 1, y: 2 } };
  let vecView = null;

  function fixAspect(view) {
    const r = view.canvas.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return;
    const yspan = (view.xmax - view.xmin) * r.height / r.width;
    const yc = (view.ymin + view.ymax) / 2;
    view.ymin = yc - yspan / 2;
    view.ymax = yc + yspan / 2;
  }

  function vArrow(view, x, y, color, label, opts) {
    drawArrow(view.ctx, view.x2px(0), view.y2px(0), view.x2px(x), view.y2px(y), color,
      Object.assign({ width: 3, label }, opts || {}));
  }

  function drawVec(view) {
    const { u, v } = vec;
    const ctx = view.ctx;
    if ($("la-show-sum").checked) {
      // parallellogram
      ctx.save();
      ctx.strokeStyle = "rgba(174,213,129,0.45)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(view.x2px(u.x), view.y2px(u.y));
      ctx.lineTo(view.x2px(u.x + v.x), view.y2px(u.y + v.y));
      ctx.lineTo(view.x2px(v.x), view.y2px(v.y));
      ctx.stroke();
      ctx.restore();
      vArrow(view, u.x + v.x, u.y + v.y, C_SUM, "u+v", { dash: [8, 5], width: 2.5 });
    }
    if ($("la-show-diff").checked) {
      vArrow(view, u.x - v.x, u.y - v.y, C_DIFF, "u−v", { dash: [8, 5], width: 2.5 });
      ctx.save();
      ctx.strokeStyle = "rgba(240,98,146,0.4)";
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(view.x2px(v.x), view.y2px(v.y));
      ctx.lineTo(view.x2px(u.x), view.y2px(u.y));
      ctx.stroke();
      ctx.restore();
    }
    if ($("la-show-proj").checked) {
      const vv = v.x * v.x + v.y * v.y;
      if (vv > 1e-12) {
        const k = (u.x * v.x + u.y * v.y) / vv;
        const px = k * v.x, py = k * v.y;
        vArrow(view, px, py, C_PROJ, "proj", { width: 4 });
        ctx.save();
        ctx.strokeStyle = "rgba(186,104,200,0.5)";
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(view.x2px(u.x), view.y2px(u.y));
        ctx.lineTo(view.x2px(px), view.y2px(py));
        ctx.stroke();
        ctx.restore();
      }
    }
    vArrow(view, u.x, u.y, C_U, "u");
    vArrow(view, v.x, v.y, C_V, "v");
    updateVecInfo();
  }

  function updateVecInfo() {
    const { u, v } = vec;
    const lu = Math.hypot(u.x, u.y), lv = Math.hypot(v.x, v.y);
    const dot = u.x * v.x + u.y * v.y;
    const cross = u.x * v.y - u.y * v.x;
    let ang = "–";
    if (lu > 1e-12 && lv > 1e-12) {
      const a = Math.acos(Math.min(1, Math.max(-1, dot / (lu * lv))));
      ang = fm(a * 180 / Math.PI) + "° (" + fm(a) + " rad)";
    }
    let proj = "–";
    if (lv > 1e-12) {
      const k = dot / (lv * lv);
      proj = "(" + fm(k * v.x) + ", " + fm(k * v.y) + ")";
    }
    $("la-vec-info").innerHTML =
      "|u| = <b>" + fm(lu) + "</b> &nbsp;·&nbsp; |v| = <b>" + fm(lv) + "</b><br>" +
      "u · v = u<sub>x</sub>v<sub>x</sub> + u<sub>y</sub>v<sub>y</sub> = <b>" + fm(dot) + "</b>" +
      " &nbsp;·&nbsp; vinkel: <b>" + ang + "</b>" +
      (Math.abs(dot) < 1e-9 && lu > 0 && lv > 0 ? " <span class='good'>⟂ ortogonale!</span>" : "") + "<br>" +
      "u × v (z) = <b>" + fm(cross) + "</b> → parallellogramareal = <b>" + fm(Math.abs(cross)) + "</b><br>" +
      "proj<sub>v</sub>(u) = (u·v/|v|²)·v = <b>" + proj + "</b>";
  }

  function syncVecInputs() {
    $("la-ux").value = +vec.u.x.toFixed(2);
    $("la-uy").value = +vec.u.y.toFixed(2);
    $("la-vx").value = +vec.v.x.toFixed(2);
    $("la-vy").value = +vec.v.y.toFixed(2);
  }

  function initVec() {
    vecView = new GraphView($("la-vec-canvas"), {
      xmin: -6, xmax: 6, ymin: -4, ymax: 4,
      onDraw: drawVec,
      hitTest: (wx, wy, px, py) => {
        const hit = (p, kind) =>
          Math.hypot(px - vecView.x2px(p.x), py - vecView.y2px(p.y)) < 13 ? { kind } : null;
        return hit(vec.u, "u") || hit(vec.v, "v");
      },
      onDragTarget: (t, wx, wy) => {
        vec[t.kind].x = Math.round(wx * 20) / 20;
        vec[t.kind].y = Math.round(wy * 20) / 20;
        syncVecInputs();
        vecView.requestRender();
      }
    });
    const bind = (id, ref, key) => {
      $(id).addEventListener("input", () => {
        const val = parseFloat($(id).value);
        if (isFinite(val)) { vec[ref][key] = val; vecView.requestRender(); }
      });
    };
    bind("la-ux", "u", "x"); bind("la-uy", "u", "y");
    bind("la-vx", "v", "x"); bind("la-vy", "v", "y");
    for (const id of ["la-show-sum", "la-show-diff", "la-show-proj"])
      $(id).addEventListener("change", () => vecView.requestRender());
  }

  /* ================= transformasjons-kortet ================= */

  const tr = { M: [[2, 1], [1, 2]], t: 1, w: { x: 1.5, y: 0.5 } };
  let trView = null, trAnimRaf = 0;

  const PRESETS = {
    rot45: [[0.7071, -0.7071], [0.7071, 0.7071]],
    rot90: [[0, -1], [1, 0]],
    scale: [[2, 0], [0, 0.5]],
    mirx: [[1, 0], [0, -1]],
    miryx: [[0, 1], [1, 0]],
    shear: [[1, 1], [0, 1]],
    projx: [[1, 0], [0, 0]],
    sym: [[2, 1], [1, 2]]
  };

  function Mt() {
    const t = tr.t, M = tr.M;
    return [
      [(1 - t) + t * M[0][0], t * M[0][1]],
      [t * M[1][0], (1 - t) + t * M[1][1]]
    ];
  }

  function apply(M, x, y) { return [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y]; }

  function drawTrans(view) {
    const M = Mt();
    const ctx = view.ctx;
    const L = 24;

    // transformert rutenett
    ctx.save();
    for (let k = -L; k <= L; k++) {
      const main = k === 0;
      ctx.strokeStyle = main ? "rgba(79,195,247,0.85)" : "rgba(79,195,247,0.16)";
      ctx.lineWidth = main ? 1.6 : 1;
      let p0 = apply(M, k, -L), p1 = apply(M, k, L);
      ctx.beginPath();
      ctx.moveTo(view.x2px(p0[0]), view.y2px(p0[1]));
      ctx.lineTo(view.x2px(p1[0]), view.y2px(p1[1]));
      ctx.stroke();
      p0 = apply(M, -L, k); p1 = apply(M, L, k);
      ctx.beginPath();
      ctx.moveTo(view.x2px(p0[0]), view.y2px(p0[1]));
      ctx.lineTo(view.x2px(p1[0]), view.y2px(p1[1]));
      ctx.stroke();
    }

    // enhetskvadratet
    const d = det(tr.M);
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(p => apply(M, p[0], p[1]));
    ctx.fillStyle = d >= 0 ? "rgba(79,195,247,0.22)" : "rgba(239,83,80,0.25)";
    ctx.strokeStyle = d >= 0 ? "rgba(79,195,247,0.8)" : "rgba(239,83,80,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(view.x2px(sq[0][0]), view.y2px(sq[0][1]));
    for (let i = 1; i < 4; i++) ctx.lineTo(view.x2px(sq[i][0]), view.y2px(sq[i][1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // egenvektor-retninger (for hele A)
    if ($("la-show-eig").checked) {
      const eg = eigen(tr.M);
      const cols = [C_EIG1, C_EIG2];
      let ci = 0;
      for (const e of eg) {
        if (!e.vec || ci > 1) continue;
        const c = cols[ci++];
        ctx.save();
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.8;
        ctx.setLineDash([9, 6]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(view.x2px(-e.vec[0] * 40), view.y2px(-e.vec[1] * 40));
        ctx.lineTo(view.x2px(e.vec[0] * 40), view.y2px(e.vec[1] * 40));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "bold 12px Segoe UI, sans-serif";
        ctx.fillStyle = c;
        const lx = view.x2px(e.vec[0] * 2.6), ly = view.y2px(e.vec[1] * 2.6);
        ctx.fillText("λ=" + fm(e.re), lx + 6, ly - 6);
        ctx.restore();
      }
    }

    // basisvektorer og testvektor
    const i1 = apply(M, 1, 0), j1 = apply(M, 0, 1);
    vArrowT(view, i1, C_I, "î");
    vArrowT(view, j1, C_J, "ĵ");
    if ($("la-show-w").checked) {
      const w1 = apply(M, tr.w.x, tr.w.y);
      vArrowT(view, [tr.w.x, tr.w.y], C_W, "w", { width: 2.2, dash: [4, 4] });
      vArrowT(view, w1, "#e1bee7", "Aw", { width: 3 });
    }
    updateTransInfo();
  }

  function vArrowT(view, p, color, label, opts) {
    drawArrow(view.ctx, view.x2px(0), view.y2px(0), view.x2px(p[0]), view.y2px(p[1]), color,
      Object.assign({ width: 3, label }, opts || {}));
  }

  function updateTransInfo() {
    const M = tr.M;
    const d = det(M), trace = M[0][0] + M[1][1];
    const sgn = v => (v < 0 ? "− " : "+ ") + fm(Math.abs(v));
    let html = "det(A) = <b>" + fm(d) + "</b> → areal skaleres med |det| = <b>" + fm(Math.abs(d)) + "</b>" +
      (d < 0 ? " <span class='bad'>(orienteringen speilvendes)</span>" : "") +
      (Math.abs(d) < 1e-10 ? " <span class='err-text'>(singulær — planet klemmes til en linje/punkt!)</span>" : "") + "<br>" +
      "Karakteristisk polynom: λ² " + sgn(-trace) + "λ " + sgn(d) + " = 0<br>";
    const eg = eigen(M);
    if (Math.abs(eg[0].im) > 1e-9) {
      html += "Egenverdier: λ = " + fm(eg[0].re) + " ± " + fm(Math.abs(eg[0].im)) +
        "i — komplekse, ingen reelle egenretninger (rotasjon)";
    } else {
      html += eg.map((e, i) =>
        "λ" + (i + 1) + " = <b>" + fm(e.re) + "</b>" +
        (e.vec ? ", v" + (i + 1) + " ≈ (" + fm(e.vec[0]) + ", " + fm(e.vec[1]) + ")" : "")
      ).join(" &nbsp;·&nbsp; ");
      html += "<br><span class='muted'>Vektorer langs egenretningene skaleres bare med λ — de roterer ikke.</span>";
    }
    $("la-trans-info").innerHTML = html;
  }

  function readMatInputs() {
    const g = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
    tr.M = [[g("la-m11"), g("la-m12")], [g("la-m21"), g("la-m22")]];
  }

  function setMatInputs(M) {
    $("la-m11").value = M[0][0]; $("la-m12").value = M[0][1];
    $("la-m21").value = M[1][0]; $("la-m22").value = M[1][1];
  }

  function initTrans() {
    trView = new GraphView($("la-trans-canvas"), {
      xmin: -5, xmax: 5, ymin: -3.5, ymax: 3.5,
      onDraw: drawTrans,
      hitTest: (wx, wy, px, py) =>
        $("la-show-w").checked &&
        Math.hypot(px - trView.x2px(tr.w.x), py - trView.y2px(tr.w.y)) < 13 ? { kind: "w" } : null,
      onDragTarget: (t, wx, wy) => {
        tr.w.x = Math.round(wx * 20) / 20;
        tr.w.y = Math.round(wy * 20) / 20;
        trView.requestRender();
      }
    });
    for (const id of ["la-m11", "la-m12", "la-m21", "la-m22"]) {
      $(id).addEventListener("input", () => {
        readMatInputs();
        $("la-preset").value = "";
        trView.requestRender();
      });
    }
    $("la-preset").addEventListener("change", e => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      tr.M = clone(p);
      setMatInputs(tr.M);
      trView.requestRender();
    });
    $("la-anim").addEventListener("input", e => {
      tr.t = parseFloat(e.target.value);
      $("la-anim-out").textContent = tr.t.toFixed(2);
      trView.requestRender();
    });
    $("la-anim-play").onclick = () => {
      cancelAnimationFrame(trAnimRaf);
      const t0 = performance.now();
      const tick = now => {
        const u = Math.min(1, (now - t0) / 1600);
        tr.t = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // easeInOut
        $("la-anim").value = tr.t;
        $("la-anim-out").textContent = tr.t.toFixed(2);
        trView.requestRender();
        if (u < 1) trAnimRaf = requestAnimationFrame(tick);
      };
      tr.t = 0;
      trAnimRaf = requestAnimationFrame(tick);
    };
    for (const id of ["la-show-eig", "la-show-w"])
      $(id).addEventListener("change", () => trView.requestRender());
  }

  /* ================= ligningssystem-kortet ================= */

  const VARS = ["x", "y", "z", "w"];
  let sysEls = [];   // [rad][kolonne] av input-elementer
  let sysView = null;
  let sysSolution = null;

  const SYS_DEFAULTS = {
    2: [[2, 1, 5], [1, -1, 1]],
    3: [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]],
    4: [[1, 1, 1, 1, 10], [2, -1, 3, 0, 5], [0, 1, -1, 2, 3], [1, 0, 2, -1, 2]]
  };

  function buildSysInputs(n, values) {
    const wrap = $("la-sys-inputs");
    wrap.innerHTML = "";
    sysEls = [];
    const vals = values || SYS_DEFAULTS[n];
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div");
      row.className = "sys-row";
      const rowEls = [];
      for (let j = 0; j <= n; j++) {
        if (j === n) {
          const eq = document.createElement("span");
          eq.textContent = "=";
          row.appendChild(eq);
        } else if (j > 0) {
          const pl = document.createElement("span");
          pl.textContent = "+";
          row.appendChild(pl);
        }
        const inp = document.createElement("input");
        inp.type = "number";
        inp.step = "0.5";
        inp.value = (vals && vals[i] && isFinite(vals[i][j])) ? vals[i][j] : 0;
        inp.addEventListener("input", () => { sysSolution = null; if (sysView) sysView.requestRender(); });
        row.appendChild(inp);
        rowEls.push(inp);
        if (j < n) {
          const v = document.createElement("span");
          v.textContent = VARS[j];
          v.style.color = "#8b94a7";
          row.appendChild(v);
        }
      }
      wrap.appendChild(row);
      sysEls.push(rowEls);
    }
    $("la-sys-canvas").style.display = n === 2 ? "" : "none";
    if (n === 2 && sysView) { fixAspect(sysView); sysView.requestRender(); }
  }

  function readSys() {
    const n = sysEls.length;
    const aug = sysEls.map(row => row.map(inp => {
      const v = parseFloat(inp.value);
      return isFinite(v) ? v : 0;
    }));
    return { n, aug };
  }

  function fmtRowOp(s) { return '<div class="step-desc">' + s + "</div>"; }

  function augHtml(M) {
    const n = M.length;
    let h = '<table class="aug-table">';
    for (const row of M) {
      h += "<tr>";
      row.forEach((v, j) => {
        h += '<td class="' + (j === n ? "aug-bar" : "") + '">' + fm(v) + "</td>";
      });
      h += "</tr>";
    }
    return h + "</table>";
  }

  function solveSystem() {
    const { n, aug } = readSys();
    const showSteps = $("la-sys-steps").checked;
    const A = clone(aug);
    let html = "";
    if (showSteps) html += fmtRowOp("Utvidet matrise [A | b]:") + augHtml(A);

    // forover-eliminasjon med delvis pivotering
    let r = 0;
    const pivCols = [];
    for (let c = 0; c < n && r < n; c++) {
      let piv = r;
      for (let i = r + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i;
      if (Math.abs(A[piv][c]) < 1e-11) continue;
      if (piv !== r) {
        const t = A[piv]; A[piv] = A[r]; A[r] = t;
        if (showSteps) html += fmtRowOp("Bytt rad: R" + (r + 1) + " ↔ R" + (piv + 1)) + augHtml(A);
      }
      for (let i = r + 1; i < n; i++) {
        const f = A[i][c] / A[r][c];
        if (Math.abs(f) < 1e-13) continue;
        for (let j = c; j <= n; j++) A[i][j] -= f * A[r][j];
        if (showSteps) html += fmtRowOp("R" + (i + 1) + " ← R" + (i + 1) + " − (" + fm(f) + ")·R" + (r + 1)) + augHtml(A);
      }
      pivCols.push(c);
      r++;
    }

    // klassifisering
    let inconsistent = false;
    for (let i = r; i < n; i++) {
      if (Math.abs(A[i][n]) > 1e-9) { inconsistent = true; break; }
    }
    sysSolution = null;
    if (inconsistent) {
      html += '<div class="result-title err-text">Ingen løsning</div>' +
        "<div>Én av radene gir 0 = " + "tall ≠ 0 — ligningene motsier hverandre " +
        (n === 2 ? "(linjene er parallelle)." : "(planene har ingen felles punkter).") + "</div>";
    } else if (r < n) {
      html += '<div class="result-title">Uendelig mange løsninger</div>' +
        "<div>Rangen er " + r + " &lt; " + n + " — " + (n - r) + " fri(e) variab(el/ler). " +
        (n === 2 ? "Linjene er sammenfallende." : "Ligningene beskriver samme geometriske objekt(er).") + "</div>";
    } else {
      // tilbakeinnsetting
      const x = Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let s = A[i][n];
        for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
        x[i] = s / A[i][i];
      }
      sysSolution = x;
      if (showSteps) html += fmtRowOp("Tilbakeinnsetting nedenfra og opp:");
      html += '<div class="result-title">Entydig løsning</div><div class="mono">' +
        x.map((v, i) => VARS[i] + " = " + fm(v)).join(" &nbsp;·&nbsp; ") + "</div>";
    }
    $("la-sys-out").innerHTML = html;
    if (sysView) sysView.requestRender();
  }

  function drawSys(view) {
    if (sysEls.length !== 2) return;
    const { aug } = readSys();
    const cols = [C_U, C_V];
    aug.forEach((row, i) => {
      const [a, b, c] = row;
      if (Math.abs(b) > 1e-12) {
        view.plot(x => (c - a * x) / b, cols[i], { width: 2.2 });
      } else if (Math.abs(a) > 1e-12) {
        const px = view.x2px(c / a);
        const ctx = view.ctx;
        ctx.save();
        ctx.strokeStyle = cols[i];
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(px, 0); ctx.lineTo(px, view.h);
        ctx.stroke();
        ctx.restore();
      }
    });
    if (sysSolution && sysSolution.length === 2) {
      view.drawDot(sysSolution[0], sysSolution[1], "#ffffff", 5.5, "#0d1017");
    }
  }

  function initSys() {
    sysView = new GraphView($("la-sys-canvas"), {
      xmin: -6, xmax: 6, ymin: -4, ymax: 4, onDraw: drawSys
    });
    $("la-sys-n").addEventListener("change", e => {
      buildSysInputs(parseInt(e.target.value, 10));
      $("la-sys-out").innerHTML = "";
      sysSolution = null;
    });
    $("la-sys-solve").onclick = solveSystem;
    buildSysInputs(2);
  }

  /* ================= matriseregner-kortet ================= */

  const calc = {
    A: { r: 2, c: 2, d: [[1, 2], [3, 4]] },
    B: { r: 2, c: 2, d: [[0, 1], [1, 0]] }
  };
  let calcEls = { A: [], B: [] };

  function buildMatEditor(key) {
    const m = calc[key];
    const wrap = $(key === "A" ? "la-a-edit" : "la-b-edit");
    wrap.innerHTML = "";
    wrap.style.gridTemplateColumns = "repeat(" + m.c + ", 62px)";
    calcEls[key] = [];
    for (let i = 0; i < m.r; i++) {
      const rowEls = [];
      for (let j = 0; j < m.c; j++) {
        const inp = document.createElement("input");
        inp.type = "number";
        inp.step = "0.5";
        inp.className = "num-s";
        inp.value = (m.d[i] && isFinite(m.d[i][j])) ? m.d[i][j] : 0;
        inp.addEventListener("input", () => {
          const v = parseFloat(inp.value);
          m.d[i][j] = isFinite(v) ? v : 0;
        });
        wrap.appendChild(inp);
        rowEls.push(inp);
      }
      calcEls[key].push(rowEls);
    }
  }

  function resizeMat(key, r, c) {
    const m = calc[key];
    const nd = zeros(r, c);
    for (let i = 0; i < Math.min(r, m.r); i++)
      for (let j = 0; j < Math.min(c, m.c); j++) nd[i][j] = m.d[i][j];
    m.r = r; m.c = c; m.d = nd;
    buildMatEditor(key);
  }

  function matOut(title, body) {
    $("la-mat-out").innerHTML = '<div class="result-title">' + title + "</div>" + body;
  }
  function matErr(msg) {
    $("la-mat-out").innerHTML = '<div class="err-text">' + msg + "</div>";
  }

  function cplx(e) {
    if (Math.abs(e.im) < 1e-9) return fm(e.re);
    return fm(e.re) + (e.im >= 0 ? " + " : " − ") + fm(Math.abs(e.im)) + "i";
  }

  function runOp(op) {
    const A = calc.A.d.map(r => r.slice()), B = calc.B.d.map(r => r.slice());
    const k = parseFloat($("la-k").value) || 0;
    const dimA = calc.A.r + "×" + calc.A.c, dimB = calc.B.r + "×" + calc.B.c;
    const sqOnly = name => {
      if (calc.A.r !== calc.A.c) { matErr(name + " krever en kvadratisk matrise (A er " + dimA + ")."); return false; }
      return true;
    };
    switch (op) {
      case "add": case "sub": {
        if (calc.A.r !== calc.B.r || calc.A.c !== calc.B.c)
          return matErr("A og B må ha samme dimensjon (" + dimA + " vs " + dimB + ").");
        return matOut(op === "add" ? "A + B" : "A − B", matHtml(matAdd(A, B, op === "add" ? 1 : -1)));
      }
      case "mulAB": {
        if (calc.A.c !== calc.B.r)
          return matErr("Antall kolonner i A (" + calc.A.c + ") må være likt antall rader i B (" + calc.B.r + ").");
        return matOut("A · B &nbsp;(" + calc.A.r + "×" + calc.B.c + ")", matHtml(matMul(A, B)));
      }
      case "mulBA": {
        if (calc.B.c !== calc.A.r)
          return matErr("Antall kolonner i B (" + calc.B.c + ") må være likt antall rader i A (" + calc.A.r + ").");
        return matOut("B · A &nbsp;(" + calc.B.r + "×" + calc.A.c + ")", matHtml(matMul(B, A)));
      }
      case "scale": return matOut("k · A med k = " + fm(k), matHtml(matScale(k, A)));
      case "pow2": {
        if (!sqOnly("A²")) return;
        return matOut("A² = A · A", matHtml(matMul(A, A)));
      }
      case "transp": return matOut("Aᵀ (transponert)", matHtml(transpose(A)));
      case "inv": {
        if (!sqOnly("Invers")) return;
        const inv = matInv(A);
        if (!inv) return matErr("A er singulær (det(A) = 0) og har ingen invers.");
        return matOut("A⁻¹", matHtml(inv) + "<div class='muted'>Kontroll: A·A⁻¹ = I ✓</div>");
      }
      case "det": {
        if (!sqOnly("Determinant")) return;
        return matOut("det(A)", "<span class='mono'>" + fm(det(A)) + "</span>" +
          "<div class='muted'>Volumskala for transformasjonen; det = 0 betyr singulær matrise.</div>");
      }
      case "rank": {
        const r = rank(A);
        return matOut("rang(A)", "<span class='mono'>" + r + "</span>" +
          "<div class='muted'>Antall lineært uavhengige rader/kolonner (dimensjonen til kolonnerommet).</div>");
      }
      case "trace": {
        if (!sqOnly("Spor")) return;
        let t = 0;
        for (let i = 0; i < A.length; i++) t += A[i][i];
        return matOut("spor(A) = sum av diagonalen", "<span class='mono'>" + fm(t) +
          "</span><div class='muted'>Sporet er også summen av egenverdiene.</div>");
      }
      case "eig": {
        if (!sqOnly("Egenverdier")) return;
        if (calc.A.r > 3) return matErr("Egenverdier støttes for 2×2 og 3×3.");
        if (calc.A.r === 1) return matOut("Egenverdi", "<span class='mono'>λ = " + fm(A[0][0]) + "</span>");
        const eg = eigen(A);
        let h = "";
        eg.forEach((e, i) => {
          h += "<div class='mono'>λ" + (i + 1) + " = <b>" + cplx(e) + "</b>";
          if (e.vec) h += " , egenvektor v" + (i + 1) + " ≈ (" + e.vec.map(fm).join(", ") + ")";
          else if (Math.abs(e.im) > 1e-9) h += " (kompleks — ingen reell egenvektor)";
          h += "</div>";
        });
        h += "<div class='muted'>Egenrommet for λ er alle løsninger av (A − λI)v = 0 — " +
          "alle skalarmultipler av egenvektoren over (pluss evt. flere retninger hvis λ er gjentatt).</div>";
        return matOut("Egenverdier og egenvektorer", h);
      }
      case "sqrt": {
        if (!sqOnly("Kvadratrot")) return;
        const S = sqrtm(A);
        if (!S) return matErr("Fant ingen reell kvadratrot — iterasjonen konvergerte ikke " +
          "(typisk når A har negative eller komplekse egenverdier, eller er singulær).");
        const E = matAdd(matMul(S, S), A, -1);
        return matOut("√A (Denman–Beavers)", matHtml(S) +
          "<div class='muted'>Kontroll: maks|√A·√A − A| = " + maxAbs(E).toExponential(1) + " ✓</div>");
      }
    }
  }

  function initCalc() {
    buildMatEditor("A");
    buildMatEditor("B");
    $("la-a-rows").addEventListener("change", e => resizeMat("A", parseInt(e.target.value, 10), calc.A.c));
    $("la-a-cols").addEventListener("change", e => resizeMat("A", calc.A.r, parseInt(e.target.value, 10)));
    $("la-b-rows").addEventListener("change", e => resizeMat("B", parseInt(e.target.value, 10), calc.B.c));
    $("la-b-cols").addEventListener("change", e => resizeMat("B", calc.B.r, parseInt(e.target.value, 10)));
    document.querySelectorAll("#la-mat-card .la-ops .btn").forEach(b => {
      b.addEventListener("click", () => runOp(b.dataset.op));
    });
  }

  /* ================= modul-API ================= */

  function init() {
    initVec();
    initTrans();
    initSys();
    initCalc();
  }

  function show() { resize(); }
  function hide() { cancelAnimationFrame(trAnimRaf); }

  function resize() {
    for (const v of [vecView, trView]) {
      if (!v) continue;
      fixAspect(v);
      v.resize();
    }
    if (sysView && sysEls.length === 2) { fixAspect(sysView); sysView.resize(); }
  }

  function getState() {
    return {
      vec: { u: Object.assign({}, vec.u), v: Object.assign({}, vec.v) },
      vecFlags: captureInputs(["la-show-sum", "la-show-diff", "la-show-proj"]),
      M: clone(tr.M), w: Object.assign({}, tr.w),
      transFlags: captureInputs(["la-show-eig", "la-show-w"]),
      sys: { n: sysEls.length, vals: readSys().aug },
      calc: {
        A: { r: calc.A.r, c: calc.A.c, d: clone(calc.A.d) },
        B: { r: calc.B.r, c: calc.B.c, d: clone(calc.B.d) },
        k: $("la-k").value
      }
    };
  }

  function setState(s) {
    if (!s) return;
    if (s.vec && s.vec.u && s.vec.v) {
      vec.u = { x: +s.vec.u.x || 0, y: +s.vec.u.y || 0 };
      vec.v = { x: +s.vec.v.x || 0, y: +s.vec.v.y || 0 };
      syncVecInputs();
    }
    restoreInputs(s.vecFlags);
    if (Array.isArray(s.M) && s.M.length === 2) {
      tr.M = clone(s.M);
      setMatInputs(tr.M);
    }
    if (s.w) tr.w = { x: +s.w.x || 1, y: +s.w.y || 1 };
    restoreInputs(s.transFlags);
    if (s.sys && s.sys.n >= 2 && s.sys.n <= 4) {
      $("la-sys-n").value = s.sys.n;
      buildSysInputs(s.sys.n, s.sys.vals);
      $("la-sys-out").innerHTML = "";
      sysSolution = null;
    }
    if (s.calc) {
      for (const key of ["A", "B"]) {
        const m = s.calc[key];
        if (m && m.r >= 1 && m.r <= 4 && m.c >= 1 && m.c <= 4 && Array.isArray(m.d)) {
          calc[key] = { r: m.r, c: m.c, d: m.d.map(row => row.map(v => +v || 0)) };
          $(key === "A" ? "la-a-rows" : "la-b-rows").value = m.r;
          $(key === "A" ? "la-a-cols" : "la-b-cols").value = m.c;
          buildMatEditor(key);
        }
      }
      if (s.calc.k !== undefined) $("la-k").value = s.calc.k;
    }
    resize();
  }

  return {
    init, show, hide, resize, getState, setState,
    _math: { det, matInv, matMul, eigen, sqrtm, rank, solveCubic, rref }
  };
})();
