"use strict";
/* Trigonometri-fanen: interaktiv enhetssirkel, sin/cos/tan-bølger og
   utforsker for y = A·sin(Bx + C) + D. */
const TrigTab = (() => {

  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const C_SIN = "#66bb6a", C_COS = "#ef5350", C_TAN = "#ffa726";

  const st = {
    theta: Math.PI / 4,
    unit: "deg",          // "deg" | "rad"
    snap: false,
    animating: false,
    speed: 0.8,           // rad/s
    show: { sin: true, cos: true, tan: true },
    grid: true,
    pane: "wave",         // "wave" | "calc"
    decimals: 5,          // innstillinger (tannhjulet på kortet)
    padZeros: false,
    radFrac: true,
    showCoords: true,
    A: 1, B: 1, C: 0, D: 0
  };

  let circle, wave, abcdView;
  let rafId = 0, lastT = 0, visible = false;

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* Tall på denne fanen skrives med valgt antall desimaler. Den globale
     formatNum() teller gjeldende siffer og deles med de andre fanene, så
     innstillingen holdes lokal her. */
  function fmt(v) {
    if (!isFinite(v)) return v > 0 ? "∞" : v < 0 ? "−∞" : "–";
    if (Math.abs(v) >= 1e9) return v.toExponential(Math.min(st.decimals, 6));
    let s = v.toFixed(st.decimals);
    if (!st.padZeros && s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);   // unngå "-0"
    return s;
  }

  // Pen radian-tekst: multipler av π/12 vises som brøk, ellers desimal
  function radText(theta) {
    const k = Math.round(theta / (Math.PI / 12));
    if (st.radFrac && Math.abs(theta - k * Math.PI / 12) < 1e-6) {
      if (k === 0) return "0";
      const g = gcd(k, 12), n = k / g, d = 12 / g;
      const num = n === 1 ? "π" : n + "π";
      return d === 1 ? num : num + "/" + d;
    }
    return fmt(theta);
  }

  function angleLabel(thetaRad) {
    const deg = thetaRad * 180 / Math.PI;
    return st.unit === "deg"
      ? fmt(deg) + "°"
      : radText(thetaRad);
  }

  /* ---------- enhetssirkelen ---------- */

  function drawCircle() {
    const { w, h } = fitCanvas(circle);
    const ctx = circle.getContext("2d");
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.37;
    const th = st.theta;
    const cos = Math.cos(th), sin = Math.sin(th), tan = Math.tan(th);
    const px = cx + cos * R, py = cy - sin * R;

    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    // ruteark: én rute = 0,1 av radien, kraftigere strek for hver halve enhet
    if (st.grid) {
      const step = R / 10;
      ctx.lineWidth = 1;
      const line = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      const nx = Math.ceil(cx / step), ny = Math.ceil(cy / step);
      for (let i = -nx; i <= nx; i++) {
        if (i === 0) continue;
        ctx.strokeStyle = i % 5 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.055)";
        const x = Math.round(cx + i * step) + 0.5;
        line(x, 0, x, h);
      }
      for (let j = -ny; j <= ny; j++) {
        if (j === 0) continue;
        ctx.strokeStyle = j % 5 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.055)";
        const y = Math.round(cy + j * step) + 0.5;
        line(0, y, w, y);
      }
    }

    // akser
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();

    // tallmerker på aksene, så sin og cos kan leses rett av rutearket
    if (st.grid) {
      ctx.fillStyle = "#6f7789";
      ctx.font = "10.5px Segoe UI, sans-serif";
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      for (const v of [-1, -0.5, 0.5, 1]) {
        const x = cx + v * R, y = cy - v * R;
        ctx.beginPath();
        ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4);
        ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 4, y);
        ctx.stroke();
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(String(v), x, cy + 6);
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(String(v), cx - 6, y);
      }
    }

    // gradmerker på sirkelen
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    for (let d = 0; d < 360; d += 15) {
      const a = d * Math.PI / 180;
      const len = d % 90 === 0 ? 10 : d % 45 === 0 ? 7 : 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R - len), cy - Math.sin(a) * (R - len));
      ctx.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.fillStyle = "#8b94a7";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const axisLabels = st.unit === "deg"
      ? ["0°", "90°", "180°", "270°"]
      : ["0", "π/2", "π", "3π/2"];
    ctx.fillText(axisLabels[0], cx + R + 24, cy);
    ctx.fillText(axisLabels[1], cx, cy - R - 16);
    ctx.fillText(axisLabels[2], cx - R - 26, cy);
    ctx.fillText(axisLabels[3], cx, cy + R + 16);

    // sirkelen
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();

    // trekanten (fylt svakt)
    ctx.fillStyle = "rgba(79,195,247,0.07)";
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.lineTo(px, cy);
    ctx.closePath();
    ctx.fill();

    // vinkelbue
    ctx.strokeStyle = "#4fc3f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, -th, true);
    ctx.stroke();
    const mid = th / 2;
    ctx.fillStyle = "#4fc3f7";
    ctx.font = "bold 13px Segoe UI, sans-serif";
    ctx.fillText("θ", cx + Math.cos(mid) * 46, cy - Math.sin(mid) * 46);

    // tan-linjen (vertikal tangent ved x = 1)
    if (st.show.tan) {
      const tx = cx + R;
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, 0); ctx.lineTo(tx, h);
      ctx.stroke();
      if (isFinite(tan) && Math.abs(tan) * R < h * 4) {
        const ty = cy - tan * R;
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = C_TAN;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(tx, cy); ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = C_TAN;
        ctx.textAlign = "left";
        ctx.fillText("tan", tx + 7, (cy + ty) / 2);
      }
    }

    // stiplede hjelpelinjer inn til aksene, så verdiene kan leses av rutearket
    if (st.grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(cx, py);   // vannrett inn til y-aksen (sin)
      ctx.moveTo(px, py); ctx.lineTo(px, cy);   // loddrett ned til x-aksen (cos)
      ctx.stroke();
      ctx.setLineDash([]);
      if (st.show.sin) { ctx.fillStyle = C_SIN; ctx.fillRect(cx - 4, py - 1.5, 8, 3); }
      if (st.show.cos) { ctx.fillStyle = C_COS; ctx.fillRect(px - 1.5, cy - 4, 3, 8); }
    }

    // cos (på x-aksen) og sin (vertikalt)
    if (st.show.cos) {
      ctx.strokeStyle = C_COS;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px, cy);
      ctx.stroke();
      ctx.fillStyle = C_COS;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("cos", (cx + px) / 2, cy + (sin >= 0 ? -11 : 11));
    }
    if (st.show.sin) {
      ctx.strokeStyle = C_SIN;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(px, cy); ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillStyle = C_SIN;
      ctx.textAlign = cos >= 0 ? "left" : "right";
      ctx.fillText("sin", px + (cos >= 0 ? 8 : -8), (cy + py) / 2);
    }

    // radius og punkt
    ctx.strokeStyle = "#e6e9ef";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 8, 0, TAU);
    ctx.fillStyle = "#4fc3f7";
    ctx.fill();
    ctx.strokeStyle = "#0d1017";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // koordinat-tekst ved punktet
    if (!st.showCoords) return;
    ctx.fillStyle = "#e6e9ef";
    ctx.font = "12.5px Consolas, monospace";
    const label = "(" + fmt(cos) + ", " + fmt(sin) + ")";
    const right = cos >= 0;
    ctx.textAlign = right ? "left" : "right";
    ctx.textBaseline = sin >= 0 ? "bottom" : "top";
    // mange desimaler gir lang tekst — hold den innenfor kanten
    const tw = ctx.measureText(label).width;
    let tx = px + (right ? 12 : -12);
    tx = right ? Math.min(tx, w - 6 - tw) : Math.max(tx, 6 + tw);
    let ty = py + (sin >= 0 ? -10 : 10);
    ty = Math.min(Math.max(ty, sin >= 0 ? 16 : 6), sin >= 0 ? h - 6 : h - 16);
    ctx.fillText(label, tx, ty);
  }

  /* ---------- bølgepanelet ---------- */

  function drawWave() {
    if (st.pane !== "wave") return;   // fanen er gjemt, ingen vits i å tegne
    const { w, h } = fitCanvas(wave);
    const ctx = wave.getContext("2d");
    const L = 44, Rm = 14, T = 10, B = 26;
    const pw = w - L - Rm, ph = h - T - B;
    const Y_MAX = 1.7;
    const X = t => L + t / TAU * pw;
    const Y = v => T + (Y_MAX - v) / (2 * Y_MAX) * ph;

    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, w, h);

    // rutenett
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      ctx.strokeStyle = v === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(L, Y(v)); ctx.lineTo(w - Rm, Y(v));
      ctx.stroke();
      if (v === Math.round(v)) {
        ctx.fillStyle = "#8b94a7";
        ctx.fillText(String(v), L - 7, Y(v));
      }
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xticks = st.unit === "deg"
      ? [[Math.PI / 2, "90°"], [Math.PI, "180°"], [Math.PI * 1.5, "270°"], [TAU, "360°"]]
      : [[Math.PI / 2, "π/2"], [Math.PI, "π"], [Math.PI * 1.5, "3π/2"], [TAU, "2π"]];
    for (const [t, lab] of xticks) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(X(t), T); ctx.lineTo(X(t), T + ph);
      ctx.stroke();
      ctx.fillStyle = "#8b94a7";
      ctx.fillText(lab, X(t), T + ph + 6);
    }

    // kurver
    const plot = (fn, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let pen = false, prev = 0;
      for (let i = 0; i <= pw; i++) {
        const t = i / pw * TAU;
        let v = fn(t);
        if (!isFinite(v) || Math.abs(v) > 40) { pen = false; continue; }
        if (pen && Math.abs(v - prev) > 5) pen = false; // tan-asymptote
        const vc = Math.max(-Y_MAX, Math.min(Y_MAX, v));
        if (pen) ctx.lineTo(X(t), Y(vc));
        else { ctx.moveTo(X(t), Y(vc)); pen = true; }
        prev = v;
      }
      ctx.stroke();
    };
    if (st.show.tan) plot(Math.tan, C_TAN);
    if (st.show.cos) plot(Math.cos, C_COS);
    if (st.show.sin) plot(Math.sin, C_SIN);

    // markør ved gjeldende vinkel
    const tm = ((st.theta % TAU) + TAU) % TAU;
    ctx.strokeStyle = "rgba(79,195,247,0.7)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(tm), T); ctx.lineTo(X(tm), T + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    const dot = (v, color) => {
      if (!isFinite(v) || Math.abs(v) > Y_MAX) return;
      ctx.beginPath();
      ctx.arc(X(tm), Y(v), 5, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#0d1017";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    if (st.show.sin) dot(Math.sin(tm), C_SIN);
    if (st.show.cos) dot(Math.cos(tm), C_COS);
    if (st.show.tan) dot(Math.tan(tm), C_TAN);
  }

  /* ---------- verditabellen ---------- */

  /* Skriver en verdi til et felt. Et felt brukeren holder på å skrive i får
     stå i fred; ellers følger det vinkelen som før. */
  function showVal(id, text) {
    const el = $(id);
    const prev = el.dataset.shown;
    el.dataset.shown = text;
    if (document.activeElement !== el || el.value === prev) el.value = text;
  }

  function updateValues() {
    const th = st.theta;
    const s = Math.sin(th), c = Math.cos(th), t = Math.tan(th);
    const inv = v => Math.abs(v) < 1e-9 ? "–" : fmt(1 / v);
    showVal("v-deg", fmt(th * 180 / Math.PI) + "°");
    showVal("v-rad", radText(th));
    showVal("v-sin", fmt(s));
    showVal("v-cos", fmt(c));
    showVal("v-tan", Math.abs(t) > 1e7 ? "±∞" : fmt(t));
    showVal("v-csc", inv(s));
    showVal("v-sec", inv(c));
    showVal("v-cot", Math.abs(t) < 1e-9 ? "–" : (Math.abs(t) > 1e7 ? "0" : fmt(1 / t)));
    $("theta-label").textContent = fmt(th * 180 / Math.PI) + "° = " + radText(th);
  }

  /* ---------- verdier man kan skrive i ---------- */

  const VALUE_IDS = ["v-deg", "v-rad", "v-sin", "v-cos", "v-tan", "v-csc", "v-sec", "v-cot"];

  let HELP_MSG = "";   // hjelpeteksten under rutene, som feilmeldinger låner plassen til

  const RANGE_MSG = {
    "v-sin": "sin θ må ligge mellom −1 og 1.",
    "v-cos": "cos θ må ligge mellom −1 og 1.",
    "v-csc": "csc θ kan ikke ligge mellom −1 og 1.",
    "v-sec": "sec θ kan ikke ligge mellom −1 og 1."
  };

  /* Hvilke vinkler gir denne verdien i feltet? Flere svar er vanlig:
     sin θ = 0,5 stemmer både for 30° og 150°. */
  function thetaCandidates(id, v) {
    switch (id) {
      case "v-deg": return [v * Math.PI / 180];
      case "v-rad": return [v];
      case "v-sin": return Math.abs(v) > 1 ? null : [Math.asin(v), Math.PI - Math.asin(v)];
      case "v-cos": return Math.abs(v) > 1 ? null : [Math.acos(v), -Math.acos(v)];
      case "v-tan": return [Math.atan(v), Math.atan(v) + Math.PI];
      case "v-csc": return Math.abs(v) < 1 ? null : thetaCandidates("v-sin", 1 / v);
      case "v-sec": return Math.abs(v) < 1 ? null : thetaCandidates("v-cos", 1 / v);
      case "v-cot": return thetaCandidates("v-tan", 1 / v);
    }
    return null;
  }

  // korteste vei rundt sirkelen mellom to vinkler
  function angDist(a, b) {
    const d = ((a - b) % TAU + TAU) % TAU;
    return Math.min(d, TAU - d);
  }

  /* Tåler "45°", "π/4", "1/2", "sqrt(2)/2" og norsk desimalkomma. */
  function parseFieldValue(text) {
    let src = String(text).replace(/[°\s]/g, "").replace(/[−–—]/g, "-");
    if (!/[a-zπθ(]/i.test(src)) src = src.replace(/,/g, ".");
    if (!src) throw new Error("tomt");
    const v = MathParser.parse(src, []).fn({});
    if (typeof v !== "number" || Number.isNaN(v)) throw new Error("ugyldig");
    return v;
  }

  function valMsg(text, isErr) {
    const el = $("val-msg");
    if (!el) return;
    if (isErr) {
      el.textContent = text;
      el.classList.add("bad");
    } else if (el.classList.contains("bad")) {
      el.innerHTML = HELP_MSG;
      el.classList.remove("bad");
    }
  }

  function commitValue(id, el) {
    if (el.value === el.dataset.shown) { valMsg("", false); return; }

    let v;
    try {
      v = parseFieldValue(el.value);
    } catch (e) {
      el.parentElement.classList.add("bad");
      valMsg("Skjønner ikke «" + el.value.trim() + "». Prøv f.eks. 0.5, 1/2 eller π/4.", true);
      return;
    }

    const cands = thetaCandidates(id, v);
    if (!cands || !cands.every(isFinite)) {
      el.parentElement.classList.add("bad");
      valMsg(RANGE_MSG[id] || "Denne verdien svarer ikke til noen vinkel.", true);
      return;
    }

    // velg løsningen som ligger nærmest vinkelen vi står på
    let best = null, bestD = Infinity;
    for (const a of cands) {
      const norm = ((a % TAU) + TAU) % TAU;
      const d = angDist(norm, st.theta);
      if (d < bestD) { bestD = d; best = norm; }
    }

    el.parentElement.classList.remove("bad");
    valMsg("", false);
    setAnimating(false);
    setTheta(best);
    el.value = el.dataset.shown;   // vis den ferdig utregnede verdien
    el.select();
  }

  function initValueInputs() {
    HELP_MSG = $("val-msg") ? $("val-msg").innerHTML : "";
    for (const id of VALUE_IDS) {
      const el = $(id);
      if (!el) continue;
      el.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); commitValue(id, el); }
        else if (e.key === "Escape") { e.preventDefault(); el.value = el.dataset.shown; el.blur(); }
      });
      el.addEventListener("input", () => {
        el.parentElement.classList.remove("bad");
        valMsg("", false);
      });
      // animasjonen ville skrevet over det du taster
      el.addEventListener("focus", () => setAnimating(false));
      el.addEventListener("blur", () => {
        el.value = el.dataset.shown;
        el.parentElement.classList.remove("bad");
        valMsg("", false);
      });
    }
  }

  function setTheta(rad, fromSlider) {
    rad = ((rad % TAU) + TAU) % TAU;
    if (st.snap) rad = (Math.round(rad / (Math.PI / 12)) * (Math.PI / 12)) % TAU;
    st.theta = rad;
    if (!fromSlider) $("theta-slider").value = rad * 180 / Math.PI;
    redrawTrig();
  }

  function redrawTrig() {
    drawCircle();
    drawWave();
    updateValues();
    evalCalc();
  }

  /* ---------- scientific kalkulator ---------- */

  /* Én utregning per linje i tekstfeltet. Hver linje vises i tre trinn:
     uttrykket med navn, det samme med tallene satt inn, og svaret. */

  const DEFAULT_CALC = [
    "sin(θ)^2 + cos(θ)^2",
    "sin(2θ) = 2sin(θ)cos(θ)",
    "hyp = 5",
    "mot = hyp*sin(θ)",
    "hos = hyp*cos(θ)",
    "sqrt(mot^2 + hos^2)"
  ].join("\n");

  // navn kalkulatoren kjenner fra før, slik at "hyp*sin(θ)" ikke blir h*y*p*...
  const BASE_VARS = ["θ", "theta", "rad", "deg", "x", "y"];

  let calcTimer = 0;

  function calcScope() {
    return {
      "θ": st.theta,
      theta: st.theta,
      rad: st.theta,
      deg: st.theta * 180 / Math.PI,
      x: Math.cos(st.theta),
      y: Math.sin(st.theta)
    };
  }

  function mathRow(...parts) {
    const row = document.createElement("div");
    row.className = "math-row";
    for (const p of parts) {
      if (p === "") continue;
      row.append(typeof p === "string" ? document.createTextNode(p) : p);
    }
    return row;
  }

  /* Uttrykket, så det samme med tallene satt inn. Mellomtrinnet droppes når
     det ikke viser noe nytt — uttrykk uten variabler ser like ut begge veier. */
  function addSteps(box, prefix, symbols, values) {
    box.append(mathRow(prefix, symbols));
    if (values.textContent !== symbols.textContent) box.append(mathRow("=", values));
  }

  function evalCalc() {
    const out = $("trig-calc-out");
    if (!out || st.pane !== "calc") return;

    const scope = calcScope();
    const known = BASE_VARS.slice();
    out.replaceChildren();

    for (const raw of $("trig-calc-expr").value.split("\n")) {
      const src = raw.trim();
      if (!src) continue;

      const box = document.createElement("div");
      box.className = "calc-item";

      try {
        const eq = src.indexOf("=");
        const lhsName = eq >= 0 ? src.slice(0, eq).trim().toLowerCase() : "";

        if (eq >= 0 && /^[a-zπθ_][a-z0-9πθ_]*$/.test(lhsName) && !MathParser.isReserved(lhsName)) {
          // definisjon: navn = uttrykk
          const p = MathParser.parse(src.slice(eq + 1), known);
          const val = p.fn(scope);
          scope[lhsName] = val;
          if (known.indexOf(lhsName) < 0) known.push(lhsName);

          addSteps(box, lhsName + " =",
            MathRender.symbols(p.ast, scope, fmt),
            MathRender.values(p.ast, scope, fmt));
          box.append(mathRow("=", fmt(val)));

        } else if (eq >= 0) {
          // likning: er de to sidene like?
          const l = MathParser.parse(src.slice(0, eq), known);
          const r = MathParser.parse(src.slice(eq + 1), known);
          const lv = l.fn(scope), rv = r.fn(scope);
          const same = Math.abs(lv - rv) <= 1e-9 * Math.max(1, Math.abs(lv), Math.abs(rv));

          box.append(mathRow(MathRender.symbols(l.ast, scope, fmt), "=", MathRender.symbols(r.ast, scope, fmt)));
          box.append(mathRow(MathRender.values(l.ast, scope, fmt), "=", MathRender.values(r.ast, scope, fmt)));

          const verdict = mathRow(fmt(lv), "=", fmt(rv), same ? "✓" : "✗");
          verdict.classList.add(same ? "good" : "bad");
          box.append(verdict);

        } else {
          const p = MathParser.parse(src, known);
          addSteps(box, "",
            MathRender.symbols(p.ast, scope, fmt),
            MathRender.values(p.ast, scope, fmt));
          box.append(mathRow("=", fmt(p.fn(scope))));
        }
      } catch (e) {
        box.replaceChildren(mathRow(src));
        const err = mathRow(e.message);
        err.classList.add("err");
        box.append(err);
      }

      out.appendChild(box);
    }
  }

  /* Høyre kort veksler mellom bølgene og kalkulatoren, slik at enhetssirkelen
     blir stående ved siden av i stedet for å måtte scrolles bort. */
  function setPane(name) {
    st.pane = name === "calc" ? "calc" : "wave";
    for (const [pane, btn] of [["wave", "tab-wave"], ["calc", "tab-calc"]]) {
      const on = pane === st.pane;
      $("pane-" + pane).classList.toggle("on", on);
      $(btn).classList.toggle("on", on);
      $(btn).setAttribute("aria-selected", String(on));
    }
    // canvaset måler seg selv, så det må tegnes på nytt når det blir synlig
    if (st.pane === "wave") drawWave(); else evalCalc();
  }

  function insertInExpr(text) {
    const ta = $("trig-calc-expr");
    const a = ta.selectionStart, b = ta.selectionEnd;
    ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = a + text.length;
    evalCalc();
  }

  function initCalc() {
    $("trig-calc-expr").value = DEFAULT_CALC;

    $("trig-calc-expr").addEventListener("input", () => {
      clearTimeout(calcTimer);
      calcTimer = setTimeout(evalCalc, 160);
    });

    $("tab-wave").addEventListener("click", () => setPane("wave"));
    $("tab-calc").addEventListener("click", () => setPane("calc"));

    for (const btn of $("trig-insert-grid").querySelectorAll("[data-insert]")) {
      btn.addEventListener("click", () => insertInExpr(btn.dataset.insert));
    }

    setPane(st.pane);
  }

  /* ---------- innstillinger ---------- */

  const SETTINGS = [
    ["set-decimals", "decimals", "input", el => parseInt(el.value, 10)],
    ["set-pad", "padZeros", "change", el => el.checked],
    ["set-radfrac", "radFrac", "change", el => el.checked],
    ["set-coords", "showCoords", "change", el => el.checked]
  ];

  const DEFAULT_SETTINGS = { decimals: 5, padZeros: false, radFrac: true, showCoords: true };

  // skjemaet -> st, og tegn fanen på nytt med de nye valgene
  function readSettings() {
    for (const [id, key, , get] of SETTINGS) st[key] = get($(id));
    $("out-decimals").textContent = st.decimals;
    redrawTrig();
  }

  // st -> skjemaet (ved oppstart, tilbakestilling og innlasting)
  function writeSettings() {
    $("set-decimals").value = st.decimals;
    $("set-pad").checked = st.padZeros;
    $("set-radfrac").checked = st.radFrac;
    $("set-coords").checked = st.showCoords;
    $("out-decimals").textContent = st.decimals;
  }

  function initSettings() {
    const dlg = $("trig-settings");

    for (const [id, , evt] of SETTINGS) {
      $(id).addEventListener(evt, readSettings);
    }

    $("set-open").addEventListener("click", () => dlg.showModal());
    $("set-close").addEventListener("click", () => dlg.close());
    $("set-done").addEventListener("click", () => dlg.close());

    $("set-reset").addEventListener("click", () => {
      Object.assign(st, DEFAULT_SETTINGS);
      writeSettings();
      redrawTrig();
    });

    // klikk på bakgrunnen utenfor ruten lukker også
    dlg.addEventListener("click", e => {
      if (e.target !== dlg) return;               // treff på selve <dialog> = utenfor innholdet
      const r = dlg.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right &&
                     e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    });

    writeSettings();
  }

  /* ---------- animasjon ---------- */

  function loop(t) {
    rafId = 0;
    if (!visible || !st.animating) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    st.theta = (st.theta + st.speed * dt) % TAU;
    $("theta-slider").value = st.theta * 180 / Math.PI;
    redrawTrig();
    rafId = requestAnimationFrame(loop);
  }

  function setAnimating(on) {
    st.animating = on;
    $("anim-btn").innerHTML = on ? "&#9208; Stopp" : "&#9654; Animer";
    if (on && !rafId) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ---------- A·sin(Bx+C)+D ---------- */

  function drawAbcd(v) {
    v.plot(Math.sin, "#6a7383", { width: 1.4, dash: [6, 5] });
    if (Math.abs(st.D) > 1e-9) v.plot(() => st.D, "#ffd54f", { width: 1.2, dash: [3, 5] });
    v.plot(x => st.A * Math.sin(st.B * x + st.C) + st.D, "#4fc3f7", { width: 2.6 });
  }

  function updateAbcdReadout() {
    const { A, B, C, D } = st;
    const per = B !== 0 ? fmt(TAU / Math.abs(B)) : "∞";
    const shift = B !== 0 ? fmt(-C / B) : "–";
    $("abcd-readout").innerHTML =
      "Amplitude: <b>" + fmt(Math.abs(A)) + "</b> &nbsp;·&nbsp; " +
      "Periode: <b>" + per + "</b> &nbsp;·&nbsp; " +
      "Faseforskyvning: <b>" + shift + "</b> &nbsp;·&nbsp; " +
      "Likevektslinje: <b>y = " + fmt(D) + "</b>";
  }

  /* ---------- init ---------- */

  function init() {
    circle = $("circle-canvas");
    wave = $("wave-canvas");

    // dra på sirkelen
    const drag = e => {
      const r = circle.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const x = e.clientX - r.left - cx;
      const y = -(e.clientY - r.top - cy);
      if (Math.hypot(x, y) < 8) return;
      setTheta(Math.atan2(y, x));
    };
    let dragging = false;
    circle.addEventListener("pointerdown", e => {
      circle.setPointerCapture(e.pointerId);
      dragging = true;
      drag(e);
    });
    circle.addEventListener("pointermove", e => { if (dragging) drag(e); });
    circle.addEventListener("pointerup", () => dragging = false);
    circle.addEventListener("pointercancel", () => dragging = false);

    $("theta-slider").addEventListener("input", e => {
      setTheta(parseFloat(e.target.value) * Math.PI / 180, true);
    });

    $("unit-deg").onclick = () => {
      st.unit = "deg";
      $("unit-deg").classList.add("on");
      $("unit-rad").classList.remove("on");
      redrawTrig();
    };
    $("unit-rad").onclick = () => {
      st.unit = "rad";
      $("unit-rad").classList.add("on");
      $("unit-deg").classList.remove("on");
      redrawTrig();
    };

    $("grid-check").addEventListener("change", e => {
      st.grid = e.target.checked;
      redrawTrig();
    });

    $("snap-check").addEventListener("change", e => {
      st.snap = e.target.checked;
      if (st.snap) setTheta(st.theta);
    });

    $("anim-btn").onclick = () => setAnimating(!st.animating);
    $("anim-speed").addEventListener("input", e => st.speed = parseFloat(e.target.value));

    for (const key of ["sin", "cos", "tan"]) {
      $("show-" + key).addEventListener("change", e => {
        st.show[key] = e.target.checked;
        redrawTrig();
      });
    }

    abcdView = new GraphView($("abcd-canvas"), {
      xmin: -7, xmax: 7, ymin: -4.3, ymax: 4.3,
      onDraw: drawAbcd
    });

    const bindAbcd = (id, out, key) => {
      $(id).addEventListener("input", e => {
        st[key] = parseFloat(e.target.value);
        $(out).textContent = fmt(st[key]);
        updateAbcdReadout();
        abcdView.requestRender();
      });
    };
    bindAbcd("sl-a", "out-a", "A");
    bindAbcd("sl-b", "out-b", "B");
    bindAbcd("sl-c", "out-c", "C");
    bindAbcd("sl-d", "out-d", "D");
    updateAbcdReadout();

    initValueInputs();
    initSettings();

    initCalc();
  }

  function show() {
    visible = true;
    redrawTrig();
    abcdView.resize();
    if (st.animating && !rafId) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function hide() { visible = false; }

  function resize() {
    redrawTrig();
    abcdView.resize();
  }

  /* ---------- lagring ---------- */

  function getState() {
    return {
      theta: st.theta,
      unit: st.unit,
      pane: st.pane,
      inputs: captureInputs(["snap-check", "grid-check", "anim-speed",
        "show-sin", "show-cos", "show-tan", "sl-a", "sl-b", "sl-c", "sl-d",
        "set-decimals", "set-pad", "set-radfrac", "set-coords"]),
      calcExpr: $("trig-calc-expr").value
    };
  }

  function setState(s) {
    if (!s) return;
    setAnimating(false);
    restoreInputs(s.inputs);
    if (s.unit === "rad") $("unit-rad").click(); else $("unit-deg").click();
    if (typeof s.theta === "number" && isFinite(s.theta)) {
      st.snap = $("snap-check").checked;
      st.theta = ((s.theta % TAU) + TAU) % TAU;
      $("theta-slider").value = st.theta * 180 / Math.PI;
    }
    // eldre oppsett lagret én linje per rad
    if (typeof s.calcExpr === "string") $("trig-calc-expr").value = s.calcExpr;
    else if (Array.isArray(s.calcLines)) $("trig-calc-expr").value = s.calcLines.join("\n");
    setPane(s.pane === "calc" ? "calc" : "wave");
    redrawTrig();
    abcdView.requestRender();
  }

  return { init, show, hide, resize, getState, setState };
})();
