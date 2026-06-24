"use strict";
/* Fysikk 1: Språk og metoder — måleserier med usikkerhet, gjeldende
   siffer og SI-prefiks-omregner. */
const PhysMethod = (() => {

  const $ = id => document.getElementById(id);

  /* ---------- måleserie-statistikk ---------- */

  function updateStats() {
    const txt = $("met-data").value;
    const nums = txt.split(/[\s,;]+/).map(parseFloat).filter(isFinite);
    const out = $("met-stats");
    if (nums.length < 2) {
      out.innerHTML = "<span class='muted'>Skriv inn minst to måleverdier.</span>";
      return;
    }
    const n = nums.length;
    const mean = nums.reduce((a, b) => a + b, 0) / n;
    const ss = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    const s = Math.sqrt(ss / (n - 1));
    const se = s / Math.sqrt(n);
    const min = Math.min(...nums), max = Math.max(...nums);

    // avrund usikkerheten til 2 gjeldende siffer, og gjennomsnittet deretter
    const seR = +se.toPrecision(2);
    let dec = 0;
    if (seR > 0) {
      dec = Math.max(0, -Math.floor(Math.log10(seR)) + 1);
      if (dec > 12) dec = 12;
    }
    const meanR = mean.toFixed(dec);
    const rel = mean !== 0 ? Math.abs(se / mean) * 100 : NaN;

    out.innerHTML =
      "Antall målinger n = <b>" + n + "</b> &nbsp;·&nbsp; min " + formatNum(min, 6) +
      " &nbsp;·&nbsp; maks " + formatNum(max, 6) + "<br>" +
      "Gjennomsnitt x̄ = <b>" + formatNum(mean, 7) + "</b><br>" +
      "Standardavvik s = " + formatNum(s, 4) + " &nbsp;·&nbsp; standardfeil s/√n = " + formatNum(se, 4) + "<br>" +
      "<b class='mono'>Resultat: x̄ = " + meanR + " ± " + seR + "</b>" +
      (isFinite(rel) ? " &nbsp;<span class='muted'>(relativ usikkerhet " + formatNum(rel, 3) + " %)</span>" : "");
  }

  /* ---------- gjeldende siffer ---------- */

  function countSigFigs(raw) {
    const str = raw.trim().replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(str)) return null;
    const mant = str.replace(/^[+-]/, "").replace(/[eE][+-]?\d+$/, "");
    const hasDot = mant.indexOf(".") >= 0;
    const digits = mant.replace(".", "");
    const stripped = digits.replace(/^0+/, "");
    if (stripped.length === 0) return { min: 1, max: 1, note: "Tallet er null — én gjeldende siffer per konvensjon." };
    if (hasDot) {
      return {
        min: stripped.length, max: stripped.length,
        note: "Med desimaltegn teller alle siffer fra første som ikke er null — også nuller på slutten (de viser presisjonen!)."
      };
    }
    const noTrail = stripped.replace(/0+$/, "");
    if (noTrail.length === stripped.length) {
      return { min: stripped.length, max: stripped.length, note: "Heltall uten nuller på slutten — alle siffer fra første ≠ 0 teller." };
    }
    return {
      min: Math.max(1, noTrail.length), max: stripped.length,
      note: "Nuller på slutten av et heltall er tvetydige — skriv tallet på standardform (f.eks. " +
        noTrail[0] + (noTrail.length > 1 ? "." + noTrail.slice(1) : "") + "·10^" + (stripped.length - 1) +
        ") for å vise nøyaktig hvor mange som gjelder."
    };
  }

  function updateSig() {
    const r = countSigFigs($("sig-input").value);
    $("sig-out").innerHTML = r === null
      ? "<span class='muted'>Skriv inn et gyldig tall (bruk punktum som desimaltegn).</span>"
      : (r.min === r.max
          ? "Gjeldende siffer: <b>" + r.min + "</b><br>"
          : "Gjeldende siffer: <b>" + r.min + "–" + r.max + "</b><br>") +
        "<span class='muted'>" + r.note + "</span>";
  }

  function updateRound() {
    const v = parseFloat(String($("round-value").value).replace(",", "."));
    const n = parseInt($("round-n").value, 10);
    const out = $("round-out");
    if (!isFinite(v) || !(n >= 1 && n <= 12)) {
      out.innerHTML = "<span class='muted'>Skriv inn et tall og antall siffer (1–12).</span>";
      return;
    }
    const p = v.toPrecision(n);
    out.innerHTML = "Avrundet: <b class='mono'>" + (+p) + "</b>" +
      " &nbsp;<span class='muted'>(standardform: " + Number(p).toExponential(n - 1).replace("e", "·10^") + ")</span>";
  }

  /* ---------- SI-prefikser ---------- */

  const PREFIXES = [
    ["y", -24, "yokto"], ["z", -21, "zepto"], ["a", -18, "atto"], ["f", -15, "femto"],
    ["p", -12, "piko"], ["n", -9, "nano"], ["µ", -6, "mikro"], ["m", -3, "milli"],
    ["c", -2, "centi"], ["d", -1, "desi"], ["", 0, "(ingen)"], ["da", 1, "deka"],
    ["h", 2, "hekto"], ["k", 3, "kilo"], ["M", 6, "mega"], ["G", 9, "giga"],
    ["T", 12, "tera"], ["P", 15, "peta"], ["E", 18, "exa"]
  ];

  function fillPrefixSelects() {
    for (const id of ["pre-from", "pre-to"]) {
      const sel = $(id);
      for (const [sym, exp, name] of PREFIXES) {
        const o = document.createElement("option");
        o.value = exp;
        o.textContent = (sym || "–") + " · " + name + " (10^" + exp + ")";
        sel.appendChild(o);
      }
    }
    $("pre-from").value = 3;   // kilo
    $("pre-to").value = 0;
  }

  function updatePrefix() {
    const v = parseFloat($("pre-value").value);
    const from = parseInt($("pre-from").value, 10);
    const to = parseInt($("pre-to").value, 10);
    const unit = $("pre-unit").value.trim() || "m";
    const out = $("pre-out");
    if (!isFinite(v)) { out.innerHTML = "<span class='muted'>Skriv inn en verdi.</span>"; return; }
    const symOf = exp => { const p = PREFIXES.find(p => p[1] === exp); return p ? p[0] : ""; };
    const res = v * Math.pow(10, from - to);
    out.innerHTML =
      "<span class='mono'>" + formatNum(v, 6) + " " + symOf(from) + unit + " = <b>" +
      formatNum(res, 6) + " " + symOf(to) + unit + "</b></span><br>" +
      "<span class='muted'>= " + v.toExponential(2).replace("e", "·10^") + " · 10^" + from + " " + unit + "</span>";
  }

  /* ---------- modul-API ---------- */

  function init() {
    fillPrefixSelects();
    $("met-data").addEventListener("input", updateStats);
    $("sig-input").addEventListener("input", updateSig);
    $("round-value").addEventListener("input", updateRound);
    $("round-n").addEventListener("input", updateRound);
    $("pre-value").addEventListener("input", updatePrefix);
    $("pre-unit").addEventListener("input", updatePrefix);
    $("pre-from").addEventListener("change", updatePrefix);
    $("pre-to").addEventListener("change", updatePrefix);
    updateStats(); updateSig(); updateRound(); updatePrefix();
  }

  function show() {}
  function hide() {}
  function resize() {}

  function getState() {
    return { inputs: captureInputs(["met-data", "sig-input", "round-value", "round-n",
      "pre-value", "pre-from", "pre-to", "pre-unit"]) };
  }
  function setState(s) { if (s) restoreInputs(s.inputs); }

  return { init, show, hide, resize, getState, setState };
})();
