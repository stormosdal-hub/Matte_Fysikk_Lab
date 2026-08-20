"use strict";
/* ValueField — gjør avlesningen ved siden av en glidebryter redigerbar.
   Feltet viser den samme ferdigformaterte teksten som før (med enhet), så
   modulene skriver fortsatt bare til .value. Endringer sendes tilbake som et
   "input"-event på selve glidebryteren, slik at all eksisterende logikk —
   omregning, nullstilling, tegning — kjører helt uendret. */
const ValueField = (() => {

  /* Første tall i teksten. Takler "9.81 m/s²", "-20 °C", "×60" og "0,50". */
  const NUM = /-?\d*[.,]?\d+(?:[eE][+-]?\d+)?/;

  const REPEAT_DELAY = 400;   // ms før hold-inne begynner å gjenta
  const REPEAT_RATE = 60;     // ms mellom hvert steg mens knappen holdes

  function parse(text) {
    const m = NUM.exec(String(text).replace(/[−–—]/g, "-"));
    if (!m) return null;
    const v = parseFloat(m[0].replace(",", "."));
    return isFinite(v) ? v : null;
  }

  function flashBad(f) {
    f.field.classList.add("bad");
    clearTimeout(f.badTimer);
    f.badTimer = setTimeout(() => f.field.classList.remove("bad"), 600);
  }

  /* Setter glidebryteren og lar modulen som eier den skrive teksten tilbake.
     Nettleseren klipper selv til min/max og runder av til nærmeste steg. */
  function apply(f, v, quiet) {
    const sl = f.slider;
    const min = parseFloat(sl.min), max = parseFloat(sl.max);
    let target = v;
    if (isFinite(min)) target = Math.max(target, min);
    if (isFinite(max)) target = Math.min(target, max);
    sl.value = String(target);
    sl.dispatchEvent(new Event("input", { bubbles: false }));
    // utenfor rekkevidde: verdien ble klippet, si fra i stedet for å lyve
    if (!quiet && Math.abs(target - v) > 1e-9) flashBad(f);
  }

  function commit(f) {
    const v = parse(f.field.value);
    if (v === null) { flashBad(f); f.field.value = f.prev; return; }
    apply(f, v);
    f.prev = f.field.value;
  }

  function stepBy(f, dir, big) {
    const sl = f.slider;
    const step = (parseFloat(sl.step) || 1) * (big ? 10 : 1);
    apply(f, (parseFloat(sl.value) || 0) + dir * step, true);
    f.prev = f.field.value;
  }

  /* Klikk gir ett steg, hold inne gjentar. Shift tar ti steg om gangen.
     Knappene står utenfor tab-rekkefølgen (24 glidebrytere ville gitt 48 ekstra
     stopp) — fra tastaturet er piltastene i selve feltet veien inn. */
  function holdable(btn, run) {
    let delay = 0, timer = 0;
    const stop = () => {
      clearTimeout(delay); clearInterval(timer);
      delay = timer = 0;
    };
    btn.addEventListener("pointerdown", e => {
      if (e.button) return;
      e.preventDefault();          // behold fokus i tallfeltet
      const big = e.shiftKey;
      run(big);
      delay = setTimeout(() => { timer = setInterval(() => run(big), REPEAT_RATE); }, REPEAT_DELAY);
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"])
      btn.addEventListener(ev, stop);
    window.addEventListener("pointerup", stop);
  }

  function wire(f) {
    const { field, row } = f;

    field.addEventListener("focus", () => {
      f.prev = field.value;
      field.select();
      f.selectOnUp = true;        // museklikk setter markøren — merk alt likevel
    });
    field.addEventListener("mouseup", e => {
      if (!f.selectOnUp) return;
      f.selectOnUp = false;
      e.preventDefault();
      field.select();
    });
    field.addEventListener("blur", () => { f.selectOnUp = false; commit(f); });

    field.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); commit(f); field.select(); }
      else if (e.key === "Escape") { e.preventDefault(); field.value = f.prev; field.select(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); stepBy(f, 1, e.shiftKey); field.select(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); stepBy(f, -1, e.shiftKey); field.select(); }
    });

    for (const btn of row.querySelectorAll(".step-btn")) {
      const dir = parseFloat(btn.dataset.step) < 0 ? -1 : 1;
      holdable(btn, big => stepBy(f, dir, big));
    }

    // navnet på raden er etiketten til feltet
    const name = row.querySelector(".sl-name");
    if (name && !field.getAttribute("aria-label"))
      field.setAttribute("aria-label", name.textContent.trim());
    if (!field.title) {
      const sl = f.slider;
      const span = (isFinite(parseFloat(sl.min)) && isFinite(parseFloat(sl.max)))
        ? " (" + sl.min + " til " + sl.max + ")" : "";
      field.title = "Skriv inn en verdi" + span + " og trykk Enter. Piltastene gir ett steg.";
    }
  }

  /* Kobler opp alle rader under root som har både en glidebryter og et
     redigerbart tallfelt. Trygg å kalle flere ganger. */
  function init(root) {
    for (const row of (root || document).querySelectorAll(".slider-row")) {
      const field = row.querySelector("input.val-num");
      const slider = row.querySelector('input[type="range"]');
      if (!field || !slider || field.dataset.vfBound) continue;
      field.dataset.vfBound = "1";
      wire({ field, slider, row, prev: field.value });
    }
  }

  return { init, parse };
})();
