"use strict";
/* Kalkulus-fanen: plott flere funksjoner, deriverte, tangent, bestemt
   integral og automatisk analyse (null-, ekstremal- og vendepunkter). */
const CalculusTab = (() => {

  const COLORS = ["#4fc3f7", "#ff8a65", "#aed581", "#ba68c8", "#ffd54f", "#f06292", "#4dd0e1", "#a1887f"];
  const $ = id => document.getElementById(id);

  let view = null;
  const state = {
    fns: [], nextId: 1, activeId: null,
    params: {}, paramRanges: {},
    tangentOn: false, tangentX: 1,
    integralOn: false, intA: -2, intB: 2, intInit: false,
    analysis: null,
    hover: null
  };

  /* ---------- numerikk ---------- */

  function derivative(g) {
    return x => {
      const h = 1e-5 * (1 + Math.abs(x));
      return (g(x + h) - g(x - h)) / (2 * h);
    };
  }

  function derivative2(g) {
    return x => {
      const h = 1e-4 * (1 + Math.abs(x));
      return (g(x + h) - 2 * g(x) + g(x - h)) / (h * h);
    };
  }

  function simpson(g, a, b, n = 800) {
    if (a === b) return 0;
    if (n % 2) n++;
    const h = (b - a) / n;
    let s = g(a) + g(b);
    for (let i = 1; i < n; i++) s += g(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
  }

  function bisect(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 70; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (!isFinite(fm)) break;
      if ((fa < 0) !== (fm < 0)) b = m;
      else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }

  // Skiller ekte nullpunkter fra asymptoter (der fortegnet også skifter)
  function isRealRoot(g, x) {
    const v = g(x);
    if (!isFinite(v)) return false;
    let d = Math.abs(derivative(g)(x));
    if (!isFinite(d)) d = 1e12;
    return Math.abs(v) <= 1e-4 * (1 + d);
  }

  function findRoots(g, x0, x1, n = 800) {
    const roots = [];
    let prevX = x0, prevY = g(x0);
    for (let i = 1; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      const y = g(x);
      if (isFinite(prevY) && isFinite(y)) {
        if (prevY === 0) roots.push(prevX);
        else if (prevY * y < 0) {
          const r = bisect(g, prevX, x);
          if (isRealRoot(g, r)) roots.push(r);
        }
      }
      prevX = x; prevY = y;
    }
    if (isFinite(prevY) && prevY === 0) roots.push(prevX);
    // fjern duplikater
    roots.sort((a, b) => a - b);
    const tol = (x1 - x0) * 1e-4;
    const out = [];
    for (const r of roots) {
      if (!out.length || Math.abs(r - out[out.length - 1]) > tol) out.push(r);
      if (out.length >= 40) break;
    }
    return out;
  }

  /* ---------- funksjonsliste ---------- */

  function activeFn() {
    return state.fns.find(f => f.id === state.activeId) || null;
  }

  function evaluatorFor(f) {
    const scope = Object.assign({}, state.params);
    const fn = f.compiled.fn;
    return x => {
      scope.x = x;
      const v = fn(scope);
      return typeof v === "number" ? v : NaN;
    };
  }

  function addFunction(expr) {
    const f = {
      id: state.nextId++,
      expr: expr || "",
      color: COLORS[(state.nextId - 2) % COLORS.length],
      visible: true, showD1: false, showD2: false,
      compiled: null, error: null, els: null
    };
    state.fns.push(f);
    compileFn(f);
    if (!state.activeId) state.activeId = f.id;
    renderFnList();
    afterChange();
  }

  function removeFn(f) {
    state.fns = state.fns.filter(x => x !== f);
    if (state.activeId === f.id) state.activeId = state.fns.length ? state.fns[0].id : null;
    renderFnList();
    rebuildParams();
    afterChange();
  }

  function compileFn(f) {
    f.error = null;
    const src = f.expr.trim();
    if (!src) { f.compiled = null; updateErr(f); rebuildParams(); return; }
    try {
      f.compiled = MathParser.parse(src);
    } catch (e) {
      f.compiled = null;
      f.error = e.message;
    }
    updateErr(f);
    rebuildParams();
  }

  function updateErr(f) {
    if (f.els) {
      f.els.err.textContent = f.error || "";
      f.els.err.style.display = f.error ? "" : "none";
    }
  }

  function setActive(id) {
    if (state.activeId === id) return;
    state.activeId = id;
    for (const f of state.fns) {
      if (f.els) f.els.row.classList.toggle("active", f.id === id);
    }
    afterChange();
  }

  function renderFnList() {
    const list = $("fn-list");
    list.innerHTML = "";
    for (const f of state.fns) {
      const row = document.createElement("div");
      row.className = "fn-row" + (f.id === state.activeId ? " active" : "");

      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.background = f.color;
      dot.title = "Velg som aktiv funksjon";
      dot.onclick = () => setActive(f.id);

      const input = document.createElement("input");
      input.className = "fn-input";
      input.value = f.expr;
      input.placeholder = "f.eks. x^2 - 3x + 1";
      input.spellcheck = false;
      let timer = 0;
      input.addEventListener("input", () => {
        f.expr = input.value;
        clearTimeout(timer);
        timer = setTimeout(() => { compileFn(f); afterChange(); }, 180);
      });
      input.addEventListener("focus", () => setActive(f.id));

      const mk = (txt, title, get, toggle) => {
        const b = document.createElement("button");
        b.className = "mini" + (get() ? " on" : "");
        b.textContent = txt;
        b.title = title;
        b.onclick = () => { toggle(); b.classList.toggle("on", get()); requestAll(); };
        return b;
      };
      const bVis = mk("👁", "Vis/skjul graf", () => f.visible, () => f.visible = !f.visible);
      const bD1 = mk("f′", "Vis den deriverte (stiplet)", () => f.showD1, () => f.showD1 = !f.showD1);
      const bD2 = mk("f″", "Vis den andrederiverte (prikket)", () => f.showD2, () => f.showD2 = !f.showD2);

      const bDel = document.createElement("button");
      bDel.className = "mini";
      bDel.textContent = "✕";
      bDel.title = "Fjern funksjonen";
      bDel.onclick = () => removeFn(f);

      row.append(dot, input, bVis, bD1, bD2, bDel);
      list.appendChild(row);

      const err = document.createElement("div");
      err.className = "fn-err";
      list.appendChild(err);

      f.els = { row, input, err };
      updateErr(f);
    }
    updateActiveLabel();
  }

  function updateActiveLabel() {
    const act = activeFn();
    const lab = $("active-fn-label");
    if (act) {
      lab.textContent = act.expr ? "f(x) = " + act.expr : "(tom funksjon)";
      lab.style.color = act.color;
    } else {
      lab.textContent = "(ingen funksjon)";
      lab.style.color = "";
    }
  }

  /* ---------- parametere ---------- */

  function paramRange(name) {
    let r = state.paramRanges[name];
    if (!r || !isFinite(r.min) || !isFinite(r.max) || r.max <= r.min) {
      r = state.paramRanges[name] = { min: -10, max: 10 };
    }
    return r;
  }

  function rebuildParams() {
    const names = new Set();
    for (const f of state.fns) {
      if (!f.compiled) continue;
      for (const v of f.compiled.vars) if (v !== "x") names.add(v);
    }
    const sorted = [...names].sort();
    const group = $("param-group");
    const list = $("param-list");
    group.hidden = sorted.length === 0;
    list.innerHTML = "";
    for (const name of sorted) {
      if (state.params[name] === undefined) state.params[name] = 1;
      const rng = paramRange(name);

      const block = document.createElement("div");
      block.className = "param-block";

      const row = document.createElement("div");
      row.className = "slider-row";
      const lab = document.createElement("span");
      lab.className = "sl-name mono";
      lab.textContent = name + " =";
      const out = document.createElement("output");
      out.textContent = formatNum(state.params[name], 4);
      const sl = document.createElement("input");
      sl.type = "range";
      const applyRange = () => {
        sl.min = rng.min; sl.max = rng.max;
        sl.step = Math.max(1e-6, (rng.max - rng.min) / 400);
      };
      applyRange();
      sl.value = state.params[name];
      sl.addEventListener("input", () => {
        state.params[name] = parseFloat(sl.value);
        out.textContent = formatNum(state.params[name], 4);
        afterChange();
      });
      row.append(lab, out, sl);

      // min/max-grenser for glidebryteren
      const re = document.createElement("div");
      re.className = "param-range";
      const mkBound = (val) => {
        const inp = document.createElement("input");
        inp.type = "number";
        inp.className = "param-range-in mono";
        inp.step = "any";
        inp.value = val;
        return inp;
      };
      const minIn = mkBound(rng.min);
      const maxIn = mkBound(rng.max);
      const onBound = () => {
        const mn = parseFloat(minIn.value), mx = parseFloat(maxIn.value);
        if (!isFinite(mn) || !isFinite(mx) || mx <= mn) return;
        rng.min = mn; rng.max = mx;
        applyRange();
        const v = Math.min(mx, Math.max(mn, state.params[name]));
        state.params[name] = v;
        sl.value = v;
        out.textContent = formatNum(v, 4);
        afterChange();
      };
      minIn.addEventListener("change", onBound);
      maxIn.addEventListener("change", onBound);
      const mnLab = document.createElement("span");
      mnLab.className = "muted"; mnLab.textContent = "min";
      const mxLab = document.createElement("span");
      mxLab.className = "muted"; mxLab.textContent = "max";
      re.append(mnLab, minIn, mxLab, maxIn);

      block.append(row, re);
      list.appendChild(block);
    }
  }

  /* ---------- tegning ---------- */

  function draw(v) {
    const act = activeFn();
    const actOk = act && act.compiled && act.visible !== false;

    if (state.integralOn && actOk) {
      v.fillRegion(evaluatorFor(act), state.intA, state.intB, act.color);
    }

    for (const f of state.fns) {
      if (!f.visible || !f.compiled) continue;
      const g = evaluatorFor(f);
      v.plot(g, f.color, { width: f === act ? 2.6 : 2 });
      if (f.showD1) v.plot(derivative(g), f.color, { width: 1.6, dash: [7, 5], alpha: 0.85 });
      if (f.showD2) v.plot(derivative2(g), f.color, { width: 1.4, dash: [2, 4], alpha: 0.8 });
    }

    if (state.integralOn && actOk) {
      drawHandle(v, state.intA, act.color);
      drawHandle(v, state.intB, act.color);
    }

    if (state.tangentOn && actOk) {
      const g = evaluatorFor(act);
      const a = state.tangentX;
      const y0 = g(a), m = derivative(g)(a);
      if (isFinite(y0) && isFinite(m)) {
        v.plot(x => m * (x - a) + y0, "#e8eaf0", { width: 1.5, dash: [10, 6], alpha: 0.9 });
        v.drawDot(a, y0, "#ffffff", 5.5, act.color);
      }
    }

    if (state.analysis && act && state.analysis.fnId === act.id) {
      const A = state.analysis;
      for (const x of A.zeros) v.drawDot(x, 0, "#0d1017", 4.5, "#ffffff");
      for (const p of A.extrema) v.drawDot(p.x, p.y, "#ffd54f", 5);
      for (const p of A.inflections) drawDiamond(v, p.x, p.y, "#ce93d8");
    }

    if (state.hover && state.hover.fn) {
      v.drawDot(state.hover.x, state.hover.y, state.hover.fn.color, 5, "#ffffff");
    }
  }

  function drawHandle(v, x, color) {
    const ctx = v.ctx;
    const px = v.x2px(x);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px, 0); ctx.lineTo(px, v.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0d1017";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawDiamond(v, x, y, color) {
    const ctx = v.ctx, px = v.x2px(x), py = v.y2px(y), r = 6;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0d1017";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- interaksjon ---------- */

  function hover(wx, wy, px, py) {
    if (wx === null) {
      state.hover = null;
      $("calc-coords").textContent = "";
      view.requestRender();
      return;
    }
    let best = null;
    for (const f of state.fns) {
      if (!f.visible || !f.compiled) continue;
      const y = evaluatorFor(f)(wx);
      if (!isFinite(y)) continue;
      const d = Math.abs(view.y2px(y) - py);
      if (d < 28 && (!best || d < best.d)) best = { fn: f, x: wx, y, d };
    }
    state.hover = best;
    const c = $("calc-coords");
    if (best) {
      c.textContent = "x = " + formatNum(best.x, 5) + "   f(x) = " + formatNum(best.y, 5);
      c.style.color = best.fn.color;
    } else {
      c.textContent = "x = " + formatNum(wx, 5) + "   y = " + formatNum(wy, 5);
      c.style.color = "";
    }
    view.canvas.style.cursor = hitTest(wx, wy, px, py) ? "ew-resize" : "crosshair";
    view.requestRender();
  }

  function hitTest(wx, wy, px, py) {
    const act = activeFn();
    if (!act || !act.compiled) return null;
    if (state.integralOn) {
      if (Math.abs(px - view.x2px(state.intA)) < 9) return { kind: "ia" };
      if (Math.abs(px - view.x2px(state.intB)) < 9) return { kind: "ib" };
    }
    if (state.tangentOn && Math.abs(px - view.x2px(state.tangentX)) < 9) return { kind: "tg" };
    return null;
  }

  function onDragTarget(t, wx) {
    if (t.kind === "tg") { state.tangentX = wx; $("tangent-x").value = +wx.toFixed(3); }
    if (t.kind === "ia") { state.intA = wx; $("int-a").value = +wx.toFixed(3); }
    if (t.kind === "ib") { state.intB = wx; $("int-b").value = +wx.toFixed(3); }
    requestAll();
  }

  /* ---------- verktøy-tekster ---------- */

  function updateTangentInfo() {
    const box = $("tangent-info");
    if (!state.tangentOn) { box.textContent = ""; return; }
    const act = activeFn();
    if (!act || !act.compiled) { box.textContent = "Velg en gyldig funksjon først."; return; }
    const g = evaluatorFor(act);
    const a = state.tangentX;
    const y0 = g(a), m = derivative(g)(a);
    if (!isFinite(y0) || !isFinite(m)) {
      box.textContent = "f er ikke deriverbar i x = " + formatNum(a, 4);
      return;
    }
    const c = y0 - m * a;
    box.innerHTML =
      "Punkt: (" + formatNum(a, 4) + ", " + formatNum(y0, 4) + ")<br>" +
      "Stigningstall f′(" + formatNum(a, 4) + ") ≈ <b>" + formatNum(m, 4) + "</b><br>" +
      "Tangent: y = " + formatNum(m, 4) + "·x " + (c < 0 ? "− " + formatNum(-c, 4) : "+ " + formatNum(c, 4));
  }

  function updateIntegralInfo() {
    const box = $("int-result");
    if (!state.integralOn) { box.textContent = ""; return; }
    const act = activeFn();
    if (!act || !act.compiled) { box.textContent = "Velg en gyldig funksjon først."; return; }
    const g = evaluatorFor(act);
    const a = Math.min(state.intA, state.intB), b = Math.max(state.intA, state.intB);
    const I = simpson(g, a, b);
    const A = simpson(x => Math.abs(g(x)), a, b);
    if (!isFinite(I)) {
      box.textContent = "Funksjonen er udefinert et sted i [" + formatNum(a, 4) + ", " + formatNum(b, 4) + "]";
      return;
    }
    box.innerHTML =
      "∫ f(x) dx fra " + formatNum(a, 4) + " til " + formatNum(b, 4) + " ≈ <b>" + formatNum(I, 6) + "</b><br>" +
      "<span class='muted'>Areal |f|: " + formatNum(A, 6) + " (flate under x-aksen teller negativt i integralet)</span>";
  }

  /* ---------- analyse ---------- */

  function runAnalysis() {
    const out = $("analysis-out");
    const act = activeFn();
    if (!act || !act.compiled) {
      out.textContent = "Velg en gyldig funksjon først.";
      state.analysis = null;
      return;
    }
    const g = evaluatorFor(act);
    const d1 = derivative(g), d2 = derivative2(g);
    const x0 = view.xmin, x1 = view.xmax;
    const span = x1 - x0;

    const zeros = findRoots(g, x0, x1);

    const extrema = [];
    for (const r of findRoots(d1, x0, x1)) {
      const y = g(r);
      if (!isFinite(y)) continue;
      const c = d2(r);
      let kind;
      if (c < -1e-7) kind = "maks";
      else if (c > 1e-7) kind = "min";
      else {
        const d = span / 2000;
        const l = g(r - d), h = g(r + d);
        kind = (l < y && h < y) ? "maks" : (l > y && h > y) ? "min" : "terrasse";
      }
      extrema.push({ x: r, y, kind });
    }

    const inflections = [];
    for (const r of findRoots(d2, x0, x1)) {
      const y = g(r);
      if (isFinite(y)) inflections.push({ x: r, y });
    }

    state.analysis = { fnId: act.id, zeros, extrema, inflections };

    const pt = p => "(" + formatNum(p.x, 4) + ", " + formatNum(p.y, 4) + ")";
    let html = "<b>I synlig område:</b><br>";
    html += "Nullpunkter: " + (zeros.length ? zeros.map(z => "x = " + formatNum(z, 4)).join(" · ") : "<span class='muted'>ingen funnet</span>") + "<br>";
    html += "Topp/bunn: " + (extrema.length ? extrema.map(p => p.kind + " " + pt(p)).join(" · ") : "<span class='muted'>ingen funnet</span>") + "<br>";
    html += "Vendepunkter: " + (inflections.length ? inflections.map(pt).join(" · ") : "<span class='muted'>ingen funnet</span>");
    html += "<br><span class='muted'>Markert i grafen: ○ nullpunkt, ● topp/bunn, ◆ vendepunkt</span>";
    out.innerHTML = html;
    view.requestRender();
  }

  function invalidateAnalysis() {
    if (state.analysis) {
      state.analysis = null;
      $("analysis-out").innerHTML = "<span class='muted'>Funksjonen er endret — trykk på knappen for å analysere på nytt.</span>";
    }
  }

  /* ---------- oppdatering ---------- */

  function requestAll() {
    view.requestRender();
    updateTangentInfo();
    updateIntegralInfo();
  }

  function afterChange() {
    invalidateAnalysis();
    updateActiveLabel();
    requestAll();
  }

  /* ---------- init ---------- */

  function init() {
    view = new GraphView($("calc-canvas"), {
      xmin: -10, xmax: 10, ymin: -6.5, ymax: 6.5,
      onDraw: draw, onHover: hover, hitTest, onDragTarget
    });

    $("add-fn").onclick = () => addFunction("");
    $("calc-zoom-in").onclick = () => view.zoomCenter(0.7);
    $("calc-zoom-out").onclick = () => view.zoomCenter(1 / 0.7);
    $("calc-home").onclick = () => view.reset();
    $("calc-download").onclick = () => downloadCanvas(view.canvas, "kalkulus-graf");

    $("toggle-tangent").onclick = () => {
      state.tangentOn = !state.tangentOn;
      $("toggle-tangent").classList.toggle("on", state.tangentOn);
      $("tangent-controls").hidden = !state.tangentOn;
      if (state.tangentOn && (state.tangentX < view.xmin || state.tangentX > view.xmax)) {
        state.tangentX = (view.xmin + view.xmax) / 2;
        $("tangent-x").value = +state.tangentX.toFixed(3);
      }
      requestAll();
    };
    $("tangent-x").addEventListener("input", () => {
      const v = parseFloat($("tangent-x").value);
      if (isFinite(v)) { state.tangentX = v; requestAll(); }
    });

    $("toggle-integral").onclick = () => {
      state.integralOn = !state.integralOn;
      $("toggle-integral").classList.toggle("on", state.integralOn);
      $("integral-controls").hidden = !state.integralOn;
      if (state.integralOn && !state.intInit) {
        state.intInit = true;
        const s = view.xmax - view.xmin;
        state.intA = view.xmin + s * 0.3;
        state.intB = view.xmin + s * 0.7;
        $("int-a").value = +state.intA.toFixed(3);
        $("int-b").value = +state.intB.toFixed(3);
      }
      requestAll();
    };
    const bindInt = (id, key) => {
      $(id).addEventListener("input", () => {
        const v = parseFloat($(id).value);
        if (isFinite(v)) { state[key] = v; requestAll(); }
      });
    };
    bindInt("int-a", "intA");
    bindInt("int-b", "intB");

    $("analyze-btn").onclick = runAnalysis;

    addFunction("x^3/6 - x");
    addFunction("sin(x)");
    state.activeId = state.fns[0].id;
    renderFnList();
  }

  function show() { view.resize(); requestAll(); }
  function hide() {}
  function resize() { view.resize(); }

  /* ---------- lagring ---------- */

  function getState() {
    return {
      fns: state.fns.map(f => ({
        expr: f.expr, color: f.color, visible: f.visible,
        showD1: f.showD1, showD2: f.showD2
      })),
      activeIdx: Math.max(0, state.fns.findIndex(f => f.id === state.activeId)),
      params: Object.assign({}, state.params),
      paramRanges: JSON.parse(JSON.stringify(state.paramRanges)),
      tangentOn: state.tangentOn, tangentX: state.tangentX,
      integralOn: state.integralOn, intA: state.intA, intB: state.intB, intInit: state.intInit,
      win: { xmin: view.xmin, xmax: view.xmax, ymin: view.ymin, ymax: view.ymax }
    };
  }

  function setState(s) {
    if (!s) return;
    state.params = s.params || {};
    state.paramRanges = s.paramRanges || {};
    state.fns = [];
    state.nextId = 1;
    for (const fd of (s.fns || [])) {
      state.fns.push({
        id: state.nextId++,
        expr: String(fd.expr || ""),
        color: fd.color || COLORS[(state.nextId - 2) % COLORS.length],
        visible: fd.visible !== false,
        showD1: !!fd.showD1, showD2: !!fd.showD2,
        compiled: null, error: null, els: null
      });
    }
    if (!state.fns.length) {
      state.activeId = null;
    } else {
      const idx = Math.min(Math.max(0, s.activeIdx | 0), state.fns.length - 1);
      state.activeId = state.fns[idx].id;
    }
    for (const f of state.fns) compileFn(f);
    renderFnList();

    state.tangentOn = !!s.tangentOn;
    state.tangentX = isFinite(s.tangentX) ? s.tangentX : 1;
    $("toggle-tangent").classList.toggle("on", state.tangentOn);
    $("tangent-controls").hidden = !state.tangentOn;
    $("tangent-x").value = +state.tangentX.toFixed(3);

    state.integralOn = !!s.integralOn;
    state.intA = isFinite(s.intA) ? s.intA : -2;
    state.intB = isFinite(s.intB) ? s.intB : 2;
    state.intInit = !!s.intInit;
    $("toggle-integral").classList.toggle("on", state.integralOn);
    $("integral-controls").hidden = !state.integralOn;
    $("int-a").value = +state.intA.toFixed(3);
    $("int-b").value = +state.intB.toFixed(3);

    if (s.win && isFinite(s.win.xmin) && s.win.xmax > s.win.xmin && s.win.ymax > s.win.ymin) {
      view.xmin = s.win.xmin; view.xmax = s.win.xmax;
      view.ymin = s.win.ymin; view.ymax = s.win.ymax;
    }
    state.analysis = null;
    $("analysis-out").innerHTML = "";
    afterChange();
  }

  return { init, show, hide, resize, getState, setState };
})();
