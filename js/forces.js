"use strict";
/* Krefter-fanen: kloss på (skrå)plan med tyngdekraft, normalkraft,
   statisk/kinetisk friksjon og påført kraft. Sanntidssimulering med
   kraftvektorer, fritt-legeme-diagram og v/a-graf. */
const ForcesTab = (() => {

  const $ = id => document.getElementById(id);
  const PX_PER_M = 60;
  const BLOCK_W = 64, BLOCK_H = 42;

  const C_G = "#ef5350", C_N = "#42a5f5", C_F = "#66bb6a", C_FRIC = "#ffa726", C_NET = "#ffeb3b";

  // parametere (justeres med glidebrytere)
  const P = {
    m: 5, g: 9.81, theta: 0,      // grader
    mus: 0.5, muk: 0.3,
    F: 0, alpha: 0,               // N, grader (relativt planet)
    scale: 1.5, showFLD: true
  };

  // simuleringstilstand
  const S = { s: 0, v: 0, t: 0, running: false, hist: [] };

  let cv, gv;            // hovedcanvas, grafcanvas
  let rafId = 0, lastT = 0, visible = false;
  let boundM = 4;        // avstand til stopperne i meter (settes fra canvasbredden)

  const rad = d => d * Math.PI / 180;

  /* ---------- fysikk ---------- */

  function computeForces() {
    const th = rad(P.theta), al = rad(P.alpha);
    const Fpar = P.F * Math.cos(al);          // påført kraft langs planet
    const Fperp = P.F * Math.sin(al);         // påført kraft ut av planet
    const Gpar = P.m * P.g * Math.sin(th);    // tyngde langs planet (nedover)

    let N = P.m * P.g * Math.cos(th) - Fperp;
    let lift = false;
    if (N < 0) { N = 0; lift = true; }

    const drive = Fpar - Gpar;                // netto pådrag uten friksjon
    let fric = 0, fricType = "ingen";
    if (S.v === 0) {
      const fsMax = P.mus * N;
      if (Math.abs(drive) <= fsMax + 1e-12) {
        fric = -drive;
        fricType = "statisk";
      } else {
        fric = -Math.sign(drive) * P.muk * N;
        fricType = "kinetisk";
      }
    } else {
      fric = -Math.sign(S.v) * P.muk * N;
      fricType = "kinetisk";
    }

    const net = drive + fric;
    return { N, fric, fricType, drive, net, a: net / P.m, lift, Gpar, Fpar, Fperp };
  }

  function step(dt) {
    const sub = 4, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const c = computeForces();
      const vOld = S.v;
      S.v += c.a * h;
      // friksjon skal stoppe klossen, ikke snu bevegelsen
      if (vOld !== 0 && Math.sign(S.v) !== Math.sign(vOld) && Math.abs(c.drive) <= P.mus * c.N) {
        S.v = 0;
      }
      S.s += S.v * h;
      if (S.s > boundM) { S.s = boundM; if (S.v > 0) S.v = 0; }
      if (S.s < -boundM) { S.s = -boundM; if (S.v < 0) S.v = 0; }
      S.t += h;
    }
    const c = computeForces();
    S.hist.push({ t: S.t, v: S.v, a: c.a });
    while (S.hist.length && S.hist[0].t < S.t - 12) S.hist.shift();
  }

  /* ---------- tegning ---------- */

  function render() {
    const { w, h } = fitCanvas(cv);
    const ctx = cv.getContext("2d");
    const th = rad(P.theta);
    const u = { x: Math.cos(th), y: -Math.sin(th) };   // langs planet, oppover mot høyre
    const n = { x: -Math.sin(th), y: -Math.cos(th) };  // normalt på planet, oppover... (skjerm-y ned)
    // NB: n slik definert peker opp-venstre for th>0; for th=0 blir den (0,-1) = rett opp
    const piv = { x: w / 2, y: h * 0.66 };
    const L = Math.hypot(w, h);
    boundM = Math.max(1, (w * 0.42 - BLOCK_W / 2) / PX_PER_M);
    const boundPx = boundM * PX_PER_M;

    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    // bakken (tegnes i rotert koordinatsystem: x langs planet)
    ctx.save();
    ctx.translate(piv.x, piv.y);
    ctx.rotate(-th);

    ctx.fillStyle = "#141925";
    ctx.fillRect(-L, 0, 2 * L, L);
    ctx.strokeStyle = "#3a4660";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-L, 0); ctx.lineTo(L, 0);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -Math.round(L / 26) * 26; x < L; x += 26) {
      ctx.moveTo(x, 2); ctx.lineTo(x - 9, 13);
    }
    ctx.stroke();

    // stoppere i endene
    ctx.fillStyle = "#3a4456";
    ctx.fillRect(boundPx + BLOCK_W / 2 + 8, -28, 7, 28);
    ctx.fillRect(-boundPx - BLOCK_W / 2 - 15, -28, 7, 28);

    // klossen
    const sPx = S.s * PX_PER_M;
    ctx.fillStyle = "#7aa2e8";
    ctx.strokeStyle = "#b9d0ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(sPx - BLOCK_W / 2, -BLOCK_H, BLOCK_W, BLOCK_H, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#101a2c";
    ctx.font = "bold 13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNum(P.m, 3) + " kg", sPx, -BLOCK_H / 2);
    ctx.restore();

    // kraftvektorer (i skjermkoordinater fra klossens sentrum)
    const c = computeForces();
    const C = {
      x: piv.x + u.x * sPx + n.x * BLOCK_H / 2,
      y: piv.y + u.y * sPx + n.y * BLOCK_H / 2
    };
    const k = P.scale;
    const al = rad(P.alpha);
    const vecs = [
      { fx: 0, fy: P.m * P.g, color: C_G, label: "G" },
      { fx: n.x * c.N, fy: n.y * c.N, color: C_N, label: "N" },
      { fx: u.x * c.fric, fy: u.y * c.fric, color: C_FRIC, label: "f" },
      {
        fx: (u.x * Math.cos(al) + n.x * Math.sin(al)) * P.F,
        fy: (u.y * Math.cos(al) + n.y * Math.sin(al)) * P.F,
        color: C_F, label: "F"
      },
      { fx: u.x * c.net, fy: u.y * c.net, color: C_NET, label: "ΣF", dash: [7, 5] }
    ];

    for (const v of vecs) {
      const mag = Math.hypot(v.fx, v.fy);
      if (mag * k < 3) continue;
      drawArrow(ctx, C.x, C.y, C.x + v.fx * k, C.y + v.fy * k, v.color,
        { width: 2.8, label: v.label, dash: v.dash });
    }

    // status øverst til venstre
    ctx.fillStyle = "#8b94a7";
    ctx.font = "12.5px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("t = " + S.t.toFixed(2) + " s", 14, 12);
    if (c.lift) {
      ctx.fillStyle = "#ff7b72";
      ctx.font = "bold 14px Segoe UI, sans-serif";
      ctx.fillText("⚠ Normalkraften er 0 — klossen er i ferd med å lette!", 14, 34);
    }

    if (P.showFLD) drawFLD(ctx, w, c);

    updateReadouts(c);
  }

  // fritt-legeme-diagram i hjørnet
  function drawFLD(ctx, w, c) {
    const bx = w - 198, by = 12, size = 186;
    ctx.save();
    ctx.fillStyle = "rgba(23,26,33,0.88)";
    ctx.strokeStyle = "#2a2f3a";
    ctx.beginPath();
    ctx.roundRect(bx, by, size, size, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8b94a7";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Fritt-legeme-diagram", bx + size / 2, by + 7);

    const th = rad(P.theta), al = rad(P.alpha);
    const u = { x: Math.cos(th), y: -Math.sin(th) };
    const n = { x: -Math.sin(th), y: -Math.cos(th) };
    const fs = [
      { fx: 0, fy: P.m * P.g, color: C_G, label: "G" },
      { fx: n.x * c.N, fy: n.y * c.N, color: C_N, label: "N" },
      { fx: u.x * c.fric, fy: u.y * c.fric, color: C_FRIC, label: "f" },
      { fx: (u.x * Math.cos(al) + n.x * Math.sin(al)) * P.F, fy: (u.y * Math.cos(al) + n.y * Math.sin(al)) * P.F, color: C_F, label: "F" }
    ];
    let max = 1;
    for (const f of fs) max = Math.max(max, Math.hypot(f.fx, f.fy));
    const k = 68 / max;
    const ox = bx + size / 2, oy = by + size / 2 + 8;
    ctx.fillStyle = "#444c5c";
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, Math.PI * 2);
    ctx.fill();
    for (const f of fs) {
      if (Math.hypot(f.fx, f.fy) * k < 3) continue;
      drawArrow(ctx, ox, oy, ox + f.fx * k, oy + f.fy * k, f.color, { width: 2.2, label: f.label });
    }
    ctx.restore();
  }

  function drawGraph() {
    const { w, h } = fitCanvas(gv);
    const ctx = gv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    const L = 40, R = 10, T = 8, B = 20;
    const tEnd = Math.max(12, S.t);
    const tStart = tEnd - 12;
    let yMax = 1;
    for (const p of S.hist) yMax = Math.max(yMax, Math.abs(p.v), Math.abs(p.a));
    yMax *= 1.15;
    const X = t => L + (t - tStart) / 12 * (w - L - R);
    const Y = v => T + (yMax - v) / (2 * yMax) * (h - T - B);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(L, Y(0)); ctx.lineTo(w - R, Y(0));
    ctx.stroke();
    ctx.fillStyle = "#8b94a7";
    ctx.font = "10.5px Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNum(yMax / 1.15, 3), L - 5, Y(yMax / 1.15));
    ctx.fillText("0", L - 5, Y(0));
    ctx.fillText(formatNum(-yMax / 1.15, 3), L - 5, Y(-yMax / 1.15));

    const curve = (key, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = key === "v" ? 2.2 : 1.6;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      let pen = false;
      for (const p of S.hist) {
        if (p.t < tStart) continue;
        if (pen) ctx.lineTo(X(p.t), Y(p[key]));
        else { ctx.moveTo(X(p.t), Y(p[key])); pen = true; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve("a", "#ffa726", [5, 4]);
    curve("v", "#4dd0e1");

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#4dd0e1";
    ctx.fillText("— v (m/s)", L + 8, T + 2);
    ctx.fillStyle = "#ffa726";
    ctx.fillText("- - a (m/s²)", L + 84, T + 2);
  }

  /* ---------- avlesninger ---------- */

  function updateReadouts(c) {
    $("fv-N").textContent = formatNum(c.N, 4) + " N";
    $("fv-gpar").textContent = formatNum(c.Gpar, 4) + " N";
    $("fv-fpar").textContent = formatNum(c.Fpar, 4) + " N";
    $("fv-fric").textContent = formatNum(c.fric, 4) + " N (" + c.fricType + ")";
    $("fv-net").textContent = formatNum(c.net, 4) + " N";
    $("fv-acc").textContent = formatNum(c.a, 4) + " m/s²";
    $("fv-vel").textContent = formatNum(S.v, 4) + " m/s";
    $("fv-pos").textContent = formatNum(S.s, 4) + " m";
    $("fv-time").textContent = S.t.toFixed(2) + " s";

    let status;
    if (c.lift) status = "⚠ Klossen letter fra underlaget (N = 0)!";
    else if (S.v === 0 && c.fricType === "statisk" && Math.abs(c.drive) > 1e-9)
      status = "I ro — statisk friksjon holder igjen (|pådrag| " + formatNum(Math.abs(c.drive), 3) + " N ≤ μsN = " + formatNum(P.mus * c.N, 3) + " N)";
    else if (S.v === 0) status = "I ro";
    else if (S.v > 0) status = P.theta > 0 ? "Glir oppover planet →" : "Glir mot høyre →";
    else status = P.theta > 0 ? "← Glir nedover planet" : "← Glir mot venstre";
    $("fv-status").textContent = status;
  }

  /* ---------- hovedløkke ---------- */

  function loop(t) {
    rafId = 0;
    if (!visible) return;
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0);
    lastT = t;
    if (S.running) step(dt);
    render();
    drawGraph();
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    S.running = on;
    $("f-run").innerHTML = on ? "&#9208; Pause" : "&#9654; Start";
  }

  function reset() {
    S.s = 0; S.v = 0; S.t = 0;
    S.hist = [];
    setRunning(false);
  }

  /* ---------- init ---------- */

  const PRESETS = {
    steel: { mus: 0.74, muk: 0.57 },
    wood: { mus: 0.5, muk: 0.3 },
    rubber: { mus: 0.9, muk: 0.8 },
    ice: { mus: 0.1, muk: 0.03 },
    none: { mus: 0, muk: 0 }
  };

  function bindSlider(id, outId, fmt, set) {
    const sl = $(id), out = $(outId);
    sl.addEventListener("input", () => {
      const v = parseFloat(sl.value);
      set(v);
      out.value = fmt(v);
    });
  }

  function init() {
    cv = $("force-canvas");
    gv = $("force-graph");

    bindSlider("f-mass", "o-mass", v => v.toFixed(1) + " kg", v => P.m = v);
    bindSlider("f-g", "o-g", v => v.toFixed(2) + " m/s²", v => P.g = v);
    bindSlider("f-theta", "o-theta", v => v + "°", v => P.theta = v);
    bindSlider("f-force", "o-force", v => v + " N", v => P.F = v);
    bindSlider("f-alpha", "o-alpha", v => v + "°", v => P.alpha = v);
    bindSlider("f-scale", "o-scale", v => v.toFixed(1) + " px/N", v => P.scale = v);

    const muChanged = () => $("f-preset").value = "custom";
    bindSlider("f-mus", "o-mus", v => { muChanged(); return v.toFixed(2); }, v => P.mus = v);
    bindSlider("f-muk", "o-muk", v => { muChanged(); return v.toFixed(2); }, v => P.muk = v);

    $("f-preset").addEventListener("change", e => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      P.mus = p.mus; P.muk = p.muk;
      $("f-mus").value = p.mus;
      $("f-muk").value = p.muk;
      $("o-mus").value = p.mus.toFixed(2);
      $("o-muk").value = p.muk.toFixed(2);
    });

    $("f-fld").addEventListener("change", e => P.showFLD = e.target.checked);
    $("f-run").onclick = () => setRunning(!S.running);
    $("f-reset").onclick = reset;
  }

  function show() {
    visible = true;
    lastT = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function hide() {
    visible = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function resize() { /* håndteres av fitCanvas i hver frame */ }

  function getState() {
    return {
      inputs: captureInputs(["f-mass", "f-g", "f-theta", "f-preset", "f-mus", "f-muk",
        "f-force", "f-alpha", "f-scale", "f-fld"])
    };
  }

  function setState(s) {
    if (!s) return;
    restoreInputs(s.inputs);
    // μ-glidebryterne flipper preset-valget til "custom" — sett tilbake det lagrede valget
    if (s.inputs && s.inputs["f-preset"] !== undefined) $("f-preset").value = s.inputs["f-preset"];
    reset();
  }

  return { init, show, hide, resize, getState, setState };
})();
