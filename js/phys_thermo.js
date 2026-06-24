"use strict";
/* Fysikk 5: Termofysikk — oppvarming av vann med faseoverganger,
   kalorimetri (blanding), ΔU = Q + W og en enkel klimamodell. */
const PhysThermo = (() => {

  const $ = id => document.getElementById(id);

  // vannets egenskaper (J/kg·K og J/kg)
  const C_ICE = 2100, C_WATER = 4190, C_STEAM = 2010;
  const L_F = 334e3, L_V = 2256e3;
  const T_TOP = 150;           // simulerer opp til 150 °C damp
  const SIGMA = 5.670e-8;

  const P = { m: 0.5, watt: 500, T0: -20, speed: 60 };
  const S = { E: 0, t: 0, running: false, done: false };
  let cv, kl, rafId = 0, lastT = 0, visible = false;

  /* ---------- fasemodell: E (J tilført) -> tilstand ---------- */

  // bygger segmentlisten [{E0, E1, T0, T1, fase}] for gjeldende m og T0
  function segments() {
    const m = P.m;
    const segs = [];
    let E = 0, T = P.T0;
    const add = (dE, T0, T1, fase) => {
      if (dE <= 0) return;
      segs.push({ E0: E, E1: E + dE, T0, T1, fase });
      E += dE;
    };
    if (T < 0) {
      add(m * C_ICE * (0 - T), T, 0, "is");
      add(m * L_F, 0, 0, "smelter");
      T = 0;
    }
    if (T < 100) {
      add(m * C_WATER * (100 - T), Math.max(T, 0), 100, "vann");
      add(m * L_V, 100, 100, "koker");
      T = 100;
    }
    add(m * C_STEAM * (T_TOP - Math.max(T, 100)), Math.max(T, 100), T_TOP, "damp");
    return segs;
  }

  function stateAt(E, segs) {
    const last = segs[segs.length - 1];
    if (E >= last.E1) return { T: last.T1, fase: last.fase, frac: 1, segIdx: segs.length - 1, done: true };
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (E <= s.E1) {
        const u = (E - s.E0) / (s.E1 - s.E0);
        return { T: s.T0 + (s.T1 - s.T0) * u, fase: s.fase, frac: u, segIdx: i, done: false };
      }
    }
    return { T: P.T0, fase: segs[0].fase, frac: 0, segIdx: 0, done: false };
  }

  const FASE_LABEL = { is: "Is (fast)", smelter: "Smelter (is + vann)", vann: "Vann (væske)", koker: "Koker (vann + damp)", damp: "Damp (gass)" };
  const FASE_COLOR = { is: "#90caf9", smelter: "#64b5f6", vann: "#2979ff", koker: "#9fb4c7", damp: "#b0bec5" };

  /* ---------- oppvarmings-tegning ---------- */

  function drawHeat() {
    const { w, h } = fitCanvas(cv);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    const segs = segments();
    const Emax = segs[segs.length - 1].E1;
    const beakerW = Math.min(110, w * 0.22);
    const L = 52, R = beakerW + 40, T = 14, B = 32;
    const X = E => L + E / Emax * (w - L - R);
    const yOf = temp => T + (T_TOP - temp) / (T_TOP + 45) * (h - T - B);

    // akser og rutenett
    ctx.font = "10.5px Segoe UI, sans-serif";
    ctx.fillStyle = "#8b94a7";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const temp of [-40, 0, 50, 100, 150]) {
      const py = yOf(temp);
      ctx.strokeStyle = temp === 0 || temp === 100 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(L, py); ctx.lineTo(w - R, py);
      ctx.stroke();
      ctx.fillText(temp + "°", L - 5, py);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const eStep = niceStep(Emax / 1000, (w - L - R) / 80); // kJ
    for (let k = 0; k * eStep * 1000 <= Emax; k++) {
      const px = X(k * eStep * 1000);
      ctx.fillText(formatNum(k * eStep, 4), px, h - B + 7);
    }
    ctx.fillText("tilført energi (kJ)", L + (w - L - R) / 2, h - 15);

    // hele kurven (svak referanse)
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0), yOf(segs[0].T0));
    for (const s of segs) ctx.lineTo(X(s.E1), yOf(s.T1));
    ctx.stroke();

    // fase-etiketter
    ctx.fillStyle = "#5d6675";
    for (const s of segs) {
      const midX = X((s.E0 + s.E1) / 2);
      if (X(s.E1) - X(s.E0) > 40) ctx.fillText(s.fase, midX, yOf(Math.max(s.T0, s.T1)) - 16);
    }

    // fremdrift (fet kurve)
    const st = stateAt(S.E, segs);
    ctx.strokeStyle = "#ffa726";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(X(0), yOf(segs[0].T0));
    for (const s of segs) {
      if (S.E <= s.E0) break;
      const Ee = Math.min(S.E, s.E1);
      const u = (Ee - s.E0) / (s.E1 - s.E0);
      ctx.lineTo(X(Ee), yOf(s.T0 + (s.T1 - s.T0) * u));
    }
    ctx.stroke();
    ctx.fillStyle = "#ffa726";
    ctx.beginPath();
    ctx.arc(X(S.E), yOf(st.T), 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0d1017";
    ctx.lineWidth = 2;
    ctx.stroke();

    // begerglass
    const bx = w - beakerW - 16, byTop = 30, byBot = h - 44;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, byTop);
    ctx.lineTo(bx, byBot);
    ctx.lineTo(bx + beakerW, byBot);
    ctx.lineTo(bx + beakerW, byTop);
    ctx.stroke();
    const fillH = (byBot - byTop) * 0.62;
    ctx.fillStyle = FASE_COLOR[st.fase];
    ctx.globalAlpha = st.fase === "damp" ? 0.35 : 0.8;
    ctx.fillRect(bx + 2, byBot - fillH, beakerW - 4, fillH);
    ctx.globalAlpha = 1;
    // bobler ved koking
    if (st.fase === "koker") {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 7; i++) {
        const bxx = bx + 12 + ((i * 37 + S.t * 40) % (beakerW - 22));
        const byy = byBot - 8 - ((i * 53 + S.t * 60) % (fillH - 14));
        ctx.beginPath();
        ctx.arc(bxx, byy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#e6e9ef";
    ctx.font = "bold 13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(formatNum(st.T, 4) + " °C", bx + beakerW / 2, byTop - 18);

    updateHeatReadout(st, segs);
  }

  function updateHeatReadout(st, segs) {
    let extra = "";
    if (st.fase === "smelter") extra = " — " + Math.round(st.frac * 100) + " % smeltet";
    if (st.fase === "koker") extra = " — " + Math.round(st.frac * 100) + " % fordampet";
    $("th-read").innerHTML =
      "T = <b>" + formatNum(st.T, 4) + " °C</b> &nbsp;·&nbsp; " + FASE_LABEL[st.fase] + extra + "<br>" +
      "Tilført energi: <b>" + formatNum(S.E / 1000, 5) + " kJ</b> av totalt " +
      formatNum(segs[segs.length - 1].E1 / 1000, 5) + " kJ &nbsp;·&nbsp; simulert tid: " +
      formatNum(S.t, 4) + " s" + (st.done ? " &nbsp;·&nbsp; <b>ferdig (150 °C)</b>" : "");
  }

  /* ---------- kalorimetri ---------- */

  const MATERIALS = [
    ["Vann", 4190], ["Aluminium", 900], ["Jern", 450], ["Kobber", 385],
    ["Bly", 130], ["Olje", 2000], ["Glass", 840]
  ];

  function fillMaterials() {
    for (const id of ["th-c1", "th-c2"]) {
      const sel = $(id);
      MATERIALS.forEach(([name, c], i) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = name + " (c = " + c + ")";
        sel.appendChild(o);
      });
    }
    $("th-c1").value = 4190;
    $("th-c2").value = 4190;
  }

  function updateMix() {
    const c1 = parseFloat($("th-c1").value), c2 = parseFloat($("th-c2").value);
    const m1 = parseFloat($("th-m1").value), m2 = parseFloat($("th-m2").value);
    const T1 = parseFloat($("th-T1").value), T2 = parseFloat($("th-T2").value);
    const out = $("th-mix-out");
    if (![c1, c2, m1, m2, T1, T2].every(isFinite) || m1 <= 0 || m2 <= 0) {
      out.innerHTML = "<span class='muted'>Fyll inn masser og temperaturer.</span>";
      return;
    }
    const Teq = (m1 * c1 * T1 + m2 * c2 * T2) / (m1 * c1 + m2 * c2);
    const Q = m1 * c1 * (Teq - T1);
    out.innerHTML =
      "T<sub>likevekt</sub> = (m₁c₁T₁ + m₂c₂T₂)/(m₁c₁ + m₂c₂) = <b>" + formatNum(Teq, 5) + " °C</b><br>" +
      "<span class='muted'>Varme overført til stoff 1: Q = " + formatNum(Q, 5) + " J " +
      (Q >= 0 ? "(stoff 1 varmes opp)" : "(stoff 1 avkjøles)") + "</span>";
  }

  function updateDu() {
    const Q = parseFloat($("th-Q").value), W = parseFloat($("th-W").value);
    const out = $("th-du-out");
    if (!isFinite(Q) || !isFinite(W)) {
      out.innerHTML = "<span class='muted'>Fyll inn Q og W.</span>";
      return;
    }
    const dU = Q + W;
    out.innerHTML = "ΔU = Q + W = " + formatNum(Q, 5) + " J + (" + formatNum(W, 5) + " J) = <b>" +
      formatNum(dU, 5) + " J</b> — indre energi " + (dU > 0 ? "øker" : dU < 0 ? "minker" : "er uendret") + ".";
  }

  /* ---------- klimamodell ---------- */

  function klimaTemps() {
    const Ssol = parseFloat($("kl-S").value);
    const alb = parseFloat($("kl-alb").value);
    const eps = parseFloat($("kl-eps").value);
    const absorbed = Ssol * (1 - alb) / 4;
    const Teff = Math.pow(absorbed / SIGMA, 0.25);
    const Tsurf = Math.pow(absorbed / (SIGMA * (1 - eps / 2)), 0.25);
    return { Ssol, alb, eps, absorbed, Teff, Tsurf };
  }

  function drawKlima() {
    const { w, h } = fitCanvas(kl);
    const ctx = kl.getContext("2d");
    const K = klimaTemps();
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(0, 0, w, h);

    const groundY = h - 38;
    // bakken
    ctx.fillStyle = "#1d2b1f";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = "#3f5c43";
    ctx.beginPath();
    ctx.moveTo(0, groundY); ctx.lineTo(w, groundY);
    ctx.stroke();
    // atmosfæren
    const atmY = 52;
    ctx.fillStyle = "rgba(79,195,247," + (0.05 + K.eps * 0.13) + ")";
    ctx.fillRect(0, atmY - 13, w, 26);
    ctx.fillStyle = "#8b94a7";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("atmosfære (ε = " + K.eps.toFixed(2) + ")", 10, atmY);

    // sola
    ctx.beginPath();
    ctx.arc(40, 26, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd54f";
    ctx.fill();

    const wOf = f => Math.max(1.4, f / 30);
    const x1 = w * 0.3, x2 = w * 0.52, x3 = w * 0.74;
    // innstråling
    drawArrow(ctx, x1 - 60, 22, x1, groundY - 6, "#ffd54f", { width: wOf(K.Ssol / 4), label: "inn " + Math.round(K.Ssol / 4) });
    // reflektert
    drawArrow(ctx, x1 + 14, groundY - 10, x1 + 74, 18, "#fff59d", { width: wOf(K.Ssol / 4 * K.alb), label: "refl. " + Math.round(K.Ssol / 4 * K.alb) });
    // IR opp fra bakken
    const irUp = SIGMA * Math.pow(K.Tsurf, 4);
    drawArrow(ctx, x2, groundY - 6, x2, 16, "#ef5350", { width: wOf(irUp), label: "IR ↑ " + Math.round(irUp) });
    // tilbakestråling
    const back = K.eps / 2 * irUp;
    if (back > 2) {
      drawArrow(ctx, x3, atmY + 14, x3, groundY - 8, "#ff8a65", { width: wOf(back), label: "tilbake " + Math.round(back) });
    }

    ctx.fillStyle = "#e6e9ef";
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("T_overflate = " + formatNum(K.Tsurf - 273.15, 4) + " °C", 12, groundY + 24);
    updateKlimaInfo(K);
  }

  function updateKlimaInfo(K) {
    const dT = K.Tsurf - K.Teff;
    $("kl-out").innerHTML =
      "Absorbert effekt: S(1−α)/4 = <b>" + formatNum(K.absorbed, 4) + " W/m²</b><br>" +
      "Uten atmosfære: T = <b>" + formatNum(K.Teff, 4) + " K = " + formatNum(K.Teff - 273.15, 4) + " °C</b><br>" +
      "Med drivhuseffekt: T = <b>" + formatNum(K.Tsurf, 4) + " K = " + formatNum(K.Tsurf - 273.15, 4) + " °C</b>" +
      " &nbsp;<span class='muted'>(drivhuseffekten gir +" + formatNum(dT, 3) + " °C)</span>";
  }

  /* ---------- løkke ---------- */

  function loop(t) {
    rafId = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    if (S.running) {
      const segs = segments();
      S.E += P.watt * P.speed * dt;
      S.t += P.speed * dt;
      const st = stateAt(S.E, segs);
      if (st.done) {
        S.E = segs[segs.length - 1].E1;
        S.running = false;
        $("th-run").innerHTML = "&#9654; Start";
      }
    }
    drawHeat();
    rafId = requestAnimationFrame(loop);
  }

  function resetHeat() {
    S.E = 0; S.t = 0;
    S.running = false;
    $("th-run").innerHTML = "&#9654; Start";
  }

  /* ---------- modul-API ---------- */

  function init() {
    cv = $("th-canvas");
    kl = $("kl-canvas");
    fillMaterials();

    const bind = (id, outId, key, fmt, resets) => {
      $(id).addEventListener("input", () => {
        P[key] = parseFloat($(id).value);
        $(outId).textContent = fmt(P[key]);
        if (resets) resetHeat();
      });
    };
    bind("th-m", "o-th-m", "m", v => v.toFixed(2) + " kg", true);
    bind("th-P", "o-th-P", "watt", v => v + " W", false);
    bind("th-T0", "o-th-T0", "T0", v => v + " °C", true);
    bind("th-speed", "o-th-speed", "speed", v => "×" + v, false);

    $("th-run").onclick = () => {
      S.running = !S.running;
      $("th-run").innerHTML = S.running ? "&#9208; Pause" : "&#9654; Start";
    };
    $("th-reset").onclick = resetHeat;

    for (const id of ["th-m1", "th-T1", "th-m2", "th-T2"])
      $(id).addEventListener("input", updateMix);
    for (const id of ["th-c1", "th-c2"])
      $(id).addEventListener("change", updateMix);
    for (const id of ["th-Q", "th-W"])
      $(id).addEventListener("input", updateDu);
    for (const id of ["kl-S", "kl-alb", "kl-eps"]) {
      $(id).addEventListener("input", () => {
        $("o-kl-S").textContent = $("kl-S").value + " W/m²";
        $("o-kl-alb").textContent = (+$("kl-alb").value).toFixed(2);
        $("o-kl-eps").textContent = (+$("kl-eps").value).toFixed(2);
        drawKlima();
      });
    }
    updateMix();
    updateDu();
  }

  function show() {
    visible = true;
    lastT = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
    drawKlima();
  }

  function hide() {
    visible = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function resize() { if (visible) drawKlima(); }

  function getState() {
    return { inputs: captureInputs(["th-m", "th-P", "th-T0", "th-speed",
      "th-c1", "th-m1", "th-T1", "th-c2", "th-m2", "th-T2",
      "th-Q", "th-W", "kl-S", "kl-alb", "kl-eps"]) };
  }
  function setState(s) {
    if (!s) return;
    restoreInputs(s.inputs);
    resetHeat();
    if (visible) drawKlima();
  }

  return { init, show, hide, resize, getState, setState };
})();
