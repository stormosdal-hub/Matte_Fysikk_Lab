"use strict";
/* Fysikk 4: Energi og arbeid — vertikalt kast med energiregnskap
   (Ep/Ek/tap til luftmotstand) og W = F·s·cos α-regner. */
const PhysEnergy = (() => {

  const $ = id => document.getElementById(id);
  const P = { m: 1, h0: 10, v0: 12, g: 9.81, k: 0 };
  const S = { y: 10, v: 12, t: 0, running: false, landed: false, hist: [] };
  let cv, gv, rafId = 0, lastT = 0, visible = false;

  const E0 = () => P.m * P.g * P.h0 + 0.5 * P.m * P.v0 * P.v0;
  const energies = () => {
    const ep = P.m * P.g * S.y;
    const ek = 0.5 * P.m * S.v * S.v;
    return { ep, ek, em: ep + ek, tapt: Math.max(0, E0() - ep - ek) };
  };

  function hMax() {
    // øvre grense for skalaen (uten luftmotstand er dette eksakt)
    return Math.max(2, P.h0 + (P.v0 > 0 ? P.v0 * P.v0 / (2 * P.g) : 0)) * 1.12;
  }

  /* ---------- fysikk ---------- */

  function step(dt) {
    if (S.landed) return;
    const sub = 6, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const drag = -(P.k / P.m) * S.v * Math.abs(S.v);
      const a = -P.g + drag;
      S.v += a * h;
      S.y += S.v * h;
      S.t += h;
      if (S.y <= 0) {
        S.y = 0;
        S.v = 0;
        S.landed = true;
        S.running = false;
        $("en-run").innerHTML = "&#9654; Start";
        break;
      }
    }
    const e = energies();
    S.hist.push({ t: S.t, ep: e.ep, ek: e.ek, em: e.em });
    while (S.hist.length > 2400) S.hist.shift();
  }

  /* ---------- tegning ---------- */

  function render() {
    const { w, h } = fitCanvas(cv);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    const HM = hMax();
    const ground = h - 34;
    const Y = y => ground - y / HM * (ground - 24);
    const ballX = Math.min(w * 0.3, 220);

    // bakken
    ctx.fillStyle = "#141925";
    ctx.fillRect(0, ground, w, h - ground);
    ctx.strokeStyle = "#3a4660";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, ground); ctx.lineTo(w, ground);
    ctx.stroke();

    // høydeskala
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#8b94a7";
    ctx.font = "10.5px Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const stepH = niceStep(HM, (ground - 24) / 46);
    ctx.beginPath();
    for (let k = 0; k * stepH <= HM; k++) {
      const py = Y(k * stepH);
      ctx.moveTo(34, py); ctx.lineTo(42, py);
      ctx.fillText(formatNum(k * stepH), 31, py);
    }
    ctx.stroke();

    // startposisjon (stiplet)
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(46, Y(P.h0)); ctx.lineTo(ballX + 60, Y(P.h0));
    ctx.stroke();
    ctx.setLineDash([]);

    // ballen + fartsvektor
    const by = Y(S.y);
    ctx.beginPath();
    ctx.arc(ballX, by, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#4fc3f7";
    ctx.fill();
    ctx.strokeStyle = "#bfe7fb";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (Math.abs(S.v) > 0.1) {
      drawArrow(ctx, ballX + 30, by, ballX + 30, by - S.v * 2.6, "#4dd0e1", { width: 2.4, label: "v" });
    }

    // energisøyler
    const e = energies();
    const Etot = Math.max(E0(), 1e-9);
    const bars = [
      { v: e.ep, color: "#42a5f5", label: "Ep" },
      { v: e.ek, color: "#ffa726", label: "Ek" },
      { v: e.tapt, color: "#78909c", label: "Tapt" }
    ];
    const bw = 52, bx0 = w - 3 * (bw + 26) - 20;
    const bh = ground - 70;
    bars.forEach((b, i) => {
      const x = bx0 + i * (bw + 26);
      const frac = Math.min(1, b.v / Etot);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, 40, bw, bh);
      ctx.fillStyle = b.color;
      ctx.fillRect(x, 40 + bh * (1 - frac), bw, bh * frac);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.strokeRect(x, 40, bw, bh);
      ctx.fillStyle = b.color;
      ctx.font = "bold 12px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(b.label, x + bw / 2, ground + 6);
      ctx.fillStyle = "#e6e9ef";
      ctx.font = "11px Consolas, monospace";
      ctx.fillText(formatNum(b.v, 4) + " J", x + bw / 2, 24);
    });

    ctx.fillStyle = "#8b94a7";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("t = " + S.t.toFixed(2) + " s", 12, 10);

    updateReadouts(e);
  }

  function drawGraph() {
    const { w, h } = fitCanvas(gv);
    const ctx = gv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);
    const L = 50, R = 12, T = 8, B = 20;
    const tEnd = Math.max(4, S.t);
    const eMax = Math.max(E0(), 1e-9) * 1.08;
    const X = t => L + t / tEnd * (w - L - R);
    const Y = e => T + (eMax - e) / eMax * (h - T - B);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(L, T, w - L - R, h - T - B);
    ctx.fillStyle = "#8b94a7";
    ctx.font = "10.5px Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNum(eMax / 1.08, 3) + " J", L - 4, Y(eMax / 1.08));
    ctx.fillText("0", L - 4, Y(0));

    const curve = (key, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = key === "em" ? 2.4 : 1.8;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      let pen = false;
      for (const p of S.hist) {
        const x = X(p.t), y = Y(p[key]);
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve("ep", "#42a5f5");
    curve("ek", "#ffa726");
    curve("em", "#aed581", [6, 4]);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#42a5f5"; ctx.fillText("— Ep", L + 8, T + 3);
    ctx.fillStyle = "#ffa726"; ctx.fillText("— Ek", L + 52, T + 3);
    ctx.fillStyle = "#aed581"; ctx.fillText("- - Em = Ep + Ek", L + 96, T + 3);
  }

  function updateReadouts(e) {
    $("en-h").textContent = formatNum(S.y, 4) + " m";
    $("en-v").textContent = formatNum(S.v, 4) + " m/s";
    $("en-ep").textContent = formatNum(e.ep, 5) + " J";
    $("en-ek").textContent = formatNum(e.ek, 5) + " J";
    $("en-em").textContent = formatNum(e.em, 5) + " J";
    $("en-tapt").textContent = formatNum(e.tapt, 5) + " J";
    $("en-status").textContent = S.landed
      ? "Landet etter " + S.t.toFixed(2) + " s."
      : S.v > 0 ? "På vei opp ↑" : S.v < 0 ? "På vei ned ↓" : "I ro";
  }

  /* ---------- arbeid/effekt ---------- */

  function updateWork() {
    const F = parseFloat($("wk-F").value);
    const s = parseFloat($("wk-s").value);
    const al = parseFloat($("wk-alpha").value);
    const t = parseFloat($("wk-t").value);
    const out = $("wk-out");
    if (!isFinite(F) || !isFinite(s) || !isFinite(al)) {
      out.innerHTML = "<span class='muted'>Fyll inn F, s og α.</span>";
      return;
    }
    const W = F * s * Math.cos(al * Math.PI / 180);
    let html = "W = " + formatNum(F, 5) + " N · " + formatNum(s, 5) + " m · cos(" + formatNum(al, 4) +
      "°) = <b>" + formatNum(W, 5) + " J</b>";
    if (isFinite(t) && t > 0) {
      html += "<br>P = W/t = " + formatNum(W, 5) + " J / " + formatNum(t, 4) + " s = <b>" +
        formatNum(W / t, 5) + " W</b>";
    }
    if (Math.abs(al) === 90) html += "<br><span class='muted'>Kraften står vinkelrett på bevegelsen — den gjør ikke noe arbeid!</span>";
    out.innerHTML = html;
  }

  /* ---------- løkke ---------- */

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

  function reset() {
    S.y = P.h0; S.v = P.v0; S.t = 0;
    S.running = false; S.landed = false;
    S.hist = [];
    $("en-run").innerHTML = "&#9654; Start";
  }

  /* ---------- modul-API ---------- */

  function init() {
    cv = $("en-canvas");
    gv = $("en-graph");
    const bind = (id, outId, key, fmt) => {
      $(id).addEventListener("input", () => {
        P[key] = parseFloat($(id).value);
        $(outId).textContent = fmt(P[key]);
        reset();
      });
    };
    bind("en-m", "o-en-m", "m", v => v.toFixed(1) + " kg");
    bind("en-h0", "o-en-h0", "h0", v => v + " m");
    bind("en-v0", "o-en-v0", "v0", v => v + " m/s");
    bind("en-g", "o-en-g", "g", v => v.toFixed(2) + " m/s²");
    bind("en-k", "o-en-k", "k", v => v.toFixed(2));
    $("en-run").onclick = () => {
      if (S.landed) reset();
      S.running = !S.running;
      $("en-run").innerHTML = S.running ? "&#9208; Pause" : "&#9654; Start";
    };
    $("en-reset").onclick = reset;
    for (const id of ["wk-F", "wk-s", "wk-alpha", "wk-t"])
      $(id).addEventListener("input", updateWork);
    updateWork();
    reset();
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

  function resize() {}

  function getState() {
    return { inputs: captureInputs(["en-m", "en-h0", "en-v0", "en-g", "en-k",
      "wk-F", "wk-s", "wk-alpha", "wk-t"]) };
  }
  function setState(s) {
    if (!s) return;
    restoreInputs(s.inputs);
    reset();
  }

  return { init, show, hide, resize, getState, setState };
})();
