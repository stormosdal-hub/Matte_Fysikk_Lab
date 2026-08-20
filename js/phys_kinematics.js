"use strict";
/* Fysikk 2: Rettlinjet bevegelse — animert bevegelse med konstant
   akselerasjon, synkroniserte s-t/v-t/a-t-grafer og formelløser. */
const PhysKinematics = (() => {

  const $ = id => document.getElementById(id);
  const P = { s0: 0, v0: 5, a: 2, dur: 10 };
  const S = { t: 0, running: false };
  let cv, gv, rafId = 0, lastT = 0, visible = false;

  const sOf = t => P.s0 + P.v0 * t + 0.5 * P.a * t * t;
  const vOf = t => P.v0 + P.a * t;

  /* ---------- tegning ---------- */

  function sRange() {
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const s = sOf(P.dur * i / 100);
      mn = Math.min(mn, s); mx = Math.max(mx, s);
    }
    if (mx - mn < 2) { mn -= 1; mx += 1; }
    const pad = (mx - mn) * 0.08;
    return [mn - pad, mx + pad];
  }

  function drawTrack() {
    const { w, h } = fitCanvas(cv);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);
    const [mn, mx] = sRange();
    const X = s => 30 + (s - mn) / (mx - mn) * (w - 60);
    const yLine = h * 0.62;

    // linjal
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(20, yLine); ctx.lineTo(w - 20, yLine);
    ctx.stroke();
    ctx.fillStyle = "#8b94a7";
    ctx.font = "10.5px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const step = niceStep(mx - mn, (w - 60) / 70);
    for (let k = Math.ceil(mn / step); k * step <= mx; k++) {
      const px = X(k * step);
      ctx.beginPath();
      ctx.moveTo(px, yLine - 4); ctx.lineTo(px, yLine + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
      ctx.fillText(formatNum(k * step) + " m", px, yLine + 8);
    }

    // strobe-bilder hvert sekund (klassisk "tickertape")
    ctx.fillStyle = "rgba(79,195,247,0.3)";
    for (let tt = 0; tt <= S.t; tt += 1) {
      ctx.beginPath();
      ctx.arc(X(sOf(tt)), yLine - 16, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // vognen
    const px = X(sOf(S.t));
    ctx.fillStyle = "#4fc3f7";
    ctx.strokeStyle = "#bfe7fb";
    ctx.beginPath();
    ctx.roundRect(px - 17, yLine - 34, 34, 22, 4);
    ctx.fill();
    ctx.stroke();
    // fartsvektor
    const v = vOf(S.t);
    if (Math.abs(v) > 0.05) {
      drawArrow(ctx, px, yLine - 44, px + v * 3.2, yLine - 44, "#4dd0e1", { width: 2.4, label: "v" });
    }
    ctx.fillStyle = "#8b94a7";
    ctx.textAlign = "left";
    ctx.fillText("t = " + S.t.toFixed(2) + " s", 12, 10);
  }

  function drawGraphs() {
    const { w, h } = fitCanvas(gv);
    const ctx = gv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    const panels = [
      { fn: sOf, color: "#4fc3f7", label: "s (m)" },
      { fn: vOf, color: "#4dd0e1", label: "v (m/s)" },
      { fn: () => P.a, color: "#ffa726", label: "a (m/s²)" }
    ];
    const ph = h / 3;
    panels.forEach((p, idx) => {
      const top = idx * ph + 8, bot = (idx + 1) * ph - 18;
      const L = 52, R = 14;
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i <= 120; i++) {
        const y = p.fn(P.dur * i / 120);
        mn = Math.min(mn, y); mx = Math.max(mx, y);
      }
      if (mx - mn < 1e-9) { mn -= 1; mx += 1; }
      const pad = (mx - mn) * 0.12;
      mn -= pad; mx += pad;
      const X = t => L + t / P.dur * (w - L - R);
      const Y = y => top + (mx - y) / (mx - mn) * (bot - top);

      // null-linje + ramme
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.strokeRect(L, top, w - L - R, bot - top);
      if (mn < 0 && mx > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.moveTo(L, Y(0)); ctx.lineTo(w - R, Y(0));
        ctx.stroke();
      }
      ctx.fillStyle = "#8b94a7";
      ctx.font = "10.5px Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatNum(mx - pad, 3), L - 5, Y(mx - pad));
      ctx.fillText(formatNum(mn + pad, 3), L - 5, Y(mn + pad));

      // kurven
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= 150; i++) {
        const t = P.dur * i / 150;
        const x = X(t), y = Y(p.fn(t));
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();

      // tidsmarkør + punkt
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X(S.t), top); ctx.lineTo(X(S.t), bot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(X(S.t), Y(p.fn(S.t)), 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(p.label, L + 7, top + 4);
    });
  }

  function updateReadouts() {
    $("kin-t").textContent = S.t.toFixed(2) + " s";
    $("kin-s").textContent = formatNum(sOf(S.t), 5) + " m";
    $("kin-v").textContent = formatNum(vOf(S.t), 5) + " m/s";
  }

  /* ---------- løkke ---------- */

  function loop(t) {
    rafId = 0;
    if (!visible) return;
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0);
    lastT = t;
    if (S.running) {
      S.t += dt;
      if (S.t >= P.dur) { S.t = P.dur; setRunning(false); }
    }
    drawTrack();
    drawGraphs();
    updateReadouts();
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    S.running = on;
    $("kin-run").innerHTML = on ? "&#9208; Pause" : "&#9654; Start";
  }

  function reset() {
    S.t = 0;
    setRunning(false);
  }

  /* ---------- formelløser (suvat) ---------- */

  function solveSuvat(k) {
    // k: {s, v0, v, a, t} — nøyaktig to er undefined
    const unk = ["s", "v0", "v", "a", "t"].filter(key => k[key] === undefined).sort().join(",");
    const sols = [];
    const F = [];
    const push = (s, v0, v, a, t, formler) => sols.push({ s, v0, v, a, t, formler });

    switch (unk) {
      case "t,v": { // kjent: s, v0, a
        if (k.a === 0) {
          if (k.v0 === 0) return { err: "Med a = 0 og v₀ = 0 beveger ikke legemet seg — t er ubestemt." };
          push(k.s, k.v0, k.v0, 0, k.s / k.v0, ["v = v₀ (a = 0)", "t = s / v"]);
          break;
        }
        const d = k.v0 * k.v0 + 2 * k.a * k.s;
        if (d < 0) return { err: "v² = v₀² + 2as gir negativt tall under roten — ingen reell løsning (legemet når aldri s = " + k.s + " m)." };
        for (const sg of [1, -1]) {
          const v = sg * Math.sqrt(d);
          push(k.s, k.v0, v, k.a, (v - k.v0) / k.a, ["v² = v₀² + 2as", "t = (v − v₀)/a"]);
        }
        break;
      }
      case "t,v0": { // kjent: s, v, a
        if (k.a === 0) {
          if (k.v === 0) return { err: "Med a = 0 og v = 0 er t ubestemt." };
          push(k.s, k.v, k.v, 0, k.s / k.v, ["v₀ = v (a = 0)", "t = s / v"]);
          break;
        }
        const d = k.v * k.v - 2 * k.a * k.s;
        if (d < 0) return { err: "v₀² = v² − 2as blir negativt — ingen reell løsning." };
        for (const sg of [1, -1]) {
          const v0 = sg * Math.sqrt(d);
          push(k.s, v0, k.v, k.a, (k.v - v0) / k.a, ["v₀² = v² − 2as", "t = (v − v₀)/a"]);
        }
        break;
      }
      case "a,v": { // kjent: s, v0, t
        if (k.t === 0) return { err: "Med t = 0 kan ikke a bestemmes." };
        const v = 2 * k.s / k.t - k.v0;
        push(k.s, k.v0, v, (v - k.v0) / k.t, k.t, ["s = ½(v₀ + v)t  →  v = 2s/t − v₀", "a = (v − v₀)/t"]);
        break;
      }
      case "a,v0": { // kjent: s, v, t
        if (k.t === 0) return { err: "Med t = 0 kan ikke a bestemmes." };
        const v0 = 2 * k.s / k.t - k.v;
        push(k.s, v0, k.v, (k.v - v0) / k.t, k.t, ["s = ½(v₀ + v)t  →  v₀ = 2s/t − v", "a = (v − v₀)/t"]);
        break;
      }
      case "s,v": // kjent: v0, a, t
        push(k.v0 * k.t + 0.5 * k.a * k.t * k.t, k.v0, k.v0 + k.a * k.t, k.a, k.t,
          ["v = v₀ + at", "s = v₀t + ½at²"]);
        break;
      case "s,v0": { // kjent: v, a, t
        const v0 = k.v - k.a * k.t;
        push(0.5 * (v0 + k.v) * k.t, v0, k.v, k.a, k.t, ["v₀ = v − at", "s = ½(v₀ + v)t"]);
        break;
      }
      case "a,s": { // kjent: v0, v, t
        if (k.t === 0) return { err: "Med t = 0 kan ikke a bestemmes." };
        push(0.5 * (k.v0 + k.v) * k.t, k.v0, k.v, (k.v - k.v0) / k.t, k.t,
          ["a = (v − v₀)/t", "s = ½(v₀ + v)t"]);
        break;
      }
      case "a,t": { // kjent: s, v0, v
        if (k.s === 0) return { err: "Med s = 0 kan ikke a bestemmes av v² = v₀² + 2as." };
        const a = (k.v * k.v - k.v0 * k.v0) / (2 * k.s);
        let t;
        if (k.v0 + k.v !== 0) t = 2 * k.s / (k.v0 + k.v);
        else if (a !== 0) t = (k.v - k.v0) / a;
        else return { err: "Bevegelsen er ubestemt (v = −v₀ og a = 0)." };
        push(k.s, k.v0, k.v, a, t, ["a = (v² − v₀²)/(2s)", "t = 2s/(v₀ + v)"]);
        break;
      }
      case "s,t": { // kjent: v0, v, a
        if (k.a === 0) {
          if (k.v !== k.v0) return { err: "Med a = 0 må v = v₀ — tallene motsier hverandre." };
          return { err: "Med a = 0 og v = v₀ er t ubestemt (farten er konstant)." };
        }
        const t = (k.v - k.v0) / k.a;
        push(0.5 * (k.v0 + k.v) * t, k.v0, k.v, k.a, t, ["t = (v − v₀)/a", "s = ½(v₀ + v)t"]);
        break;
      }
      case "v,v0": { // kjent: s, a, t
        if (k.t === 0) return { err: "Med t = 0 kan ikke v og v₀ bestemmes." };
        const v0 = k.s / k.t - k.a * k.t / 2;
        push(k.s, v0, v0 + k.a * k.t, k.a, k.t, ["s = v₀t + ½at²  →  v₀ = s/t − at/2", "v = v₀ + at"]);
        break;
      }
      default:
        return { err: "Ukjent kombinasjon." };
    }
    return { sols };
  }

  function runSolver() {
    const ids = { s: "sol-s", v0: "sol-v0", v: "sol-v", a: "sol-a", t: "sol-t" };
    const k = {};
    let known = 0;
    for (const key of Object.keys(ids)) {
      const txt = $(ids[key]).value.trim().replace(",", ".");
      if (txt === "") { k[key] = undefined; continue; }
      const v = parseFloat(txt);
      if (!isFinite(v)) {
        $("sol-out").innerHTML = "<span class='err-text'>«" + txt + "» er ikke et gyldig tall.</span>";
        return;
      }
      k[key] = v;
      known++;
    }
    const out = $("sol-out");
    if (known !== 3) {
      out.innerHTML = "<span class='err-text'>Fyll inn nøyaktig tre av de fem størrelsene (du har fylt inn " + known + ").</span>";
      return;
    }
    const res = solveSuvat(k);
    if (res.err) {
      out.innerHTML = "<span class='err-text'>" + res.err + "</span>";
      return;
    }
    const unit = { s: "m", v0: "m/s", v: "m/s", a: "m/s²", t: "s" };
    let html = "";
    res.sols.forEach((sol, i) => {
      if (res.sols.length > 1) html += "<div class='result-title'>Løsning " + (i + 1) + "</div>";
      html += "<div class='mono'>" +
        ["s", "v0", "v", "a", "t"].map(key => {
          const label = key === "v0" ? "v₀" : key;
          const wasKnown = k[key] !== undefined;
          const val = formatNum(sol[key], 5) + " " + unit[key];
          return wasKnown ? label + " = " + val : label + " = <b>" + val + "</b>";
        }).join(" · ") + "</div>";
      html += "<div class='muted'>Formler: " + sol.formler.join("  og  ") + "</div>";
      if (sol.t < 0) html += "<div class='muted'>Obs: t &lt; 0 — denne løsningen ligger «bakover i tid» og forkastes ofte.</div>";
    });
    out.innerHTML = html;
  }

  /* ---------- modul-API ---------- */

  function init() {
    cv = $("kin-track");
    gv = $("kin-graphs");
    const bind = (id, outId, key, fmt) => {
      $(id).addEventListener("input", () => {
        P[key] = parseFloat($(id).value);
        $(outId).value = fmt(P[key]);
        reset();
      });
    };
    bind("kin-s0", "o-kin-s0", "s0", v => v + " m");
    bind("kin-v0", "o-kin-v0", "v0", v => v + " m/s");
    bind("kin-a", "o-kin-a", "a", v => v + " m/s²");
    bind("kin-dur", "o-kin-dur", "dur", v => v + " s");
    $("kin-run").onclick = () => { if (S.t >= P.dur) S.t = 0; setRunning(!S.running); };
    $("kin-reset").onclick = reset;
    $("sol-solve").onclick = runSolver;
    $("sol-clear").onclick = () => {
      for (const id of ["sol-s", "sol-v0", "sol-v", "sol-a", "sol-t"]) $(id).value = "";
      $("sol-out").innerHTML = "";
    };
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
    return { inputs: captureInputs(["kin-s0", "kin-v0", "kin-a", "kin-dur",
      "sol-s", "sol-v0", "sol-v", "sol-a", "sol-t"]) };
  }
  function setState(s) {
    if (!s) return;
    restoreInputs(s.inputs);
    reset();
  }

  return { init, show, hide, resize, getState, setState, _solve: solveSuvat };
})();
