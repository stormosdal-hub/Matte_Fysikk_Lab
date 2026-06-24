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
    A: 1, B: 1, C: 0, D: 0
  };

  let circle, wave, abcdView;
  let rafId = 0, lastT = 0, visible = false;

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  // Pen radian-tekst: multipler av π/12 vises som brøk, ellers desimal
  function radText(theta) {
    const k = Math.round(theta / (Math.PI / 12));
    if (Math.abs(theta - k * Math.PI / 12) < 1e-6) {
      if (k === 0) return "0";
      const g = gcd(k, 12), n = k / g, d = 12 / g;
      const num = n === 1 ? "π" : n + "π";
      return d === 1 ? num : num + "/" + d;
    }
    return formatNum(theta, 4);
  }

  function angleLabel(thetaRad) {
    const deg = thetaRad * 180 / Math.PI;
    return st.unit === "deg"
      ? formatNum(deg, 4) + "°"
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

    // akser
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();

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

    // cos (på x-aksen) og sin (vertikalt)
    if (st.show.cos) {
      ctx.strokeStyle = C_COS;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px, cy);
      ctx.stroke();
      ctx.fillStyle = C_COS;
      ctx.textAlign = "center";
      ctx.fillText("cos", (cx + px) / 2, cy + (sin >= 0 ? 14 : -14));
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
    ctx.fillStyle = "#e6e9ef";
    ctx.font = "12.5px Consolas, monospace";
    ctx.textAlign = cos >= 0 ? "left" : "right";
    ctx.textBaseline = sin >= 0 ? "bottom" : "top";
    ctx.fillText(
      "(" + formatNum(cos, 3) + ", " + formatNum(sin, 3) + ")",
      px + (cos >= 0 ? 12 : -12),
      py + (sin >= 0 ? -10 : 10)
    );
  }

  /* ---------- bølgepanelet ---------- */

  function drawWave() {
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

  function updateValues() {
    const th = st.theta;
    const s = Math.sin(th), c = Math.cos(th), t = Math.tan(th);
    const inv = v => Math.abs(v) < 1e-9 ? "–" : formatNum(1 / v, 5);
    $("v-deg").textContent = formatNum(th * 180 / Math.PI, 5) + "°";
    $("v-rad").textContent = radText(th);
    $("v-sin").textContent = formatNum(s, 5);
    $("v-cos").textContent = formatNum(c, 5);
    $("v-tan").textContent = Math.abs(t) > 1e7 ? "±∞" : formatNum(t, 5);
    $("v-csc").textContent = inv(s);
    $("v-sec").textContent = inv(c);
    $("v-cot").textContent = Math.abs(t) < 1e-9 ? "–" : (Math.abs(t) > 1e7 ? "0" : formatNum(1 / t, 5));
    $("theta-label").textContent = formatNum(th * 180 / Math.PI, 4) + "° = " + radText(th);
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

  /* ---------- kalkulatoren ---------- */

  let calcLines = [];   // [{src, els:{input,res}}]
  let calcTimer = 0;

  function addCalcLine(src) {
    calcLines.push({ src: src || "", els: null });
    renderCalcRows();
  }

  function renderCalcRows() {
    const wrap = $("trig-calc-rows");
    wrap.innerHTML = "";
    for (const line of calcLines) {
      const row = document.createElement("div");
      row.className = "calc-row";

      const input = document.createElement("input");
      input.className = "calc-input";
      input.value = line.src;
      input.placeholder = "f.eks. sin(2theta)  ·  hyp = 5  ·  mot = hyp*sin(theta)";
      input.spellcheck = false;
      input.addEventListener("input", () => {
        line.src = input.value;
        clearTimeout(calcTimer);
        calcTimer = setTimeout(evalCalc, 160);
      });

      const res = document.createElement("span");
      res.className = "calc-res";

      const del = document.createElement("button");
      del.className = "mini";
      del.textContent = "✕";
      del.title = "Fjern linjen";
      del.onclick = () => {
        calcLines = calcLines.filter(l => l !== line);
        renderCalcRows();
      };

      row.append(input, res, del);
      wrap.appendChild(row);
      line.els = { input, res };
    }
    evalCalc();
  }

  /* Evaluerer alle linjene med gjeldende θ. Linjer på formen "navn = uttrykk"
     definerer variabler; "uttrykk = uttrykk" sammenligner venstre og høyre side. */
  function evalCalc() {
    if (!calcLines.length) return;
    const scope = { "θ": st.theta, theta: st.theta };
    const known = ["θ", "theta"];
    for (const line of calcLines) {
      if (!line.els) continue;
      const res = line.els.res;
      res.className = "calc-res";
      const src = line.src.trim();
      if (!src) { res.textContent = ""; continue; }
      try {
        const eq = src.indexOf("=");
        if (eq >= 0) {
          const lhsName = src.slice(0, eq).trim().toLowerCase();
          const rhs = src.slice(eq + 1);
          if (/^[a-zπθ_][a-z0-9πθ_]*$/.test(lhsName) && !MathParser.isReserved(lhsName)) {
            const val = MathParser.parse(rhs, known).fn(scope);
            scope[lhsName] = val;
            if (known.indexOf(lhsName) < 0) known.push(lhsName);
            res.textContent = lhsName + " = " + formatNum(val, 6);
          } else {
            const l = MathParser.parse(src.slice(0, eq), known).fn(scope);
            const r = MathParser.parse(rhs, known).fn(scope);
            const same = Math.abs(l - r) <= 1e-9 * Math.max(1, Math.abs(l), Math.abs(r));
            res.textContent = "VS: " + formatNum(l, 6) + "  HS: " + formatNum(r, 6) + (same ? "  ✓" : "  ✗");
            res.classList.add(same ? "good" : "bad");
          }
        } else {
          res.textContent = "= " + formatNum(MathParser.parse(src, known).fn(scope), 6);
        }
      } catch (e) {
        res.textContent = e.message;
        res.classList.add("err");
      }
    }
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
    const per = B !== 0 ? formatNum(TAU / Math.abs(B), 4) : "∞";
    const shift = B !== 0 ? formatNum(-C / B, 4) : "–";
    $("abcd-readout").innerHTML =
      "Amplitude: <b>" + formatNum(Math.abs(A), 4) + "</b> &nbsp;·&nbsp; " +
      "Periode: <b>" + per + "</b> &nbsp;·&nbsp; " +
      "Faseforskyvning: <b>" + shift + "</b> &nbsp;·&nbsp; " +
      "Likevektslinje: <b>y = " + formatNum(D, 4) + "</b>";
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
        $(out).textContent = formatNum(st[key], 3);
        updateAbcdReadout();
        abcdView.requestRender();
      });
    };
    bindAbcd("sl-a", "out-a", "A");
    bindAbcd("sl-b", "out-b", "B");
    bindAbcd("sl-c", "out-c", "C");
    bindAbcd("sl-d", "out-d", "D");
    updateAbcdReadout();

    $("trig-calc-add").onclick = () => addCalcLine("");
    calcLines = [
      "sin(θ)^2 + cos(θ)^2",
      "sin(2θ) = 2sin(θ)cos(θ)",
      "hyp = 5",
      "mot = hyp*sin(θ)",
      "hos = hyp*cos(θ)",
      "sqrt(mot^2 + hos^2)"
    ].map(src => ({ src, els: null }));
    renderCalcRows();
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
      inputs: captureInputs(["snap-check", "anim-speed", "show-sin", "show-cos", "show-tan",
        "sl-a", "sl-b", "sl-c", "sl-d"]),
      calcLines: calcLines.map(l => l.src)
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
    if (Array.isArray(s.calcLines)) {
      calcLines = s.calcLines.map(src => ({ src: String(src), els: null }));
      renderCalcRows();
    }
    redrawTrig();
    abcdView.requestRender();
  }

  return { init, show, hide, resize, getState, setState };
})();
