"use strict";
/* Lagring til localStorage + felles hjelpere for å fange opp og
   gjenopprette verdier i skjema-kontroller. */

function captureInputs(ids) {
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    out[id] = el.type === "checkbox" ? el.checked : el.value;
  }
  return out;
}

function restoreInputs(map) {
  if (!map) return;
  for (const id of Object.keys(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") {
      el.checked = !!map[id];
      el.dispatchEvent(new Event("change", { bubbles: false }));
    } else if (el.tagName === "SELECT") {
      el.value = map[id];
      el.dispatchEvent(new Event("change", { bubbles: false }));
    } else {
      el.value = map[id];
      el.dispatchEvent(new Event("input", { bubbles: false }));
    }
  }
}

function toast(msg, isErr) {
  const t = document.createElement("div");
  t.className = "toast" + (isErr ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 0.4s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 450);
  }, 2300);
}

const Storage = (() => {
  const KEY = "mattefysikklab-state-v1";

  function safe(fn, label) {
    try { return fn(); }
    catch (e) {
      console.error("Lagring/innlasting feilet for " + label + ":", e);
      return undefined;
    }
  }

  function save() {
    const data = {
      savedAt: new Date().toISOString(),
      calculus: safe(() => CalculusTab.getState(), "kalkulus"),
      trig: safe(() => TrigTab.getState(), "trigonometri"),
      linalg: safe(() => LinAlgTab.getState(), "lineær algebra"),
      physics: safe(() => PhysicsTab.getState(), "fysikk")
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      toast("Økten er lagret ✓");
    } catch (e) {
      toast("Kunne ikke lagre: " + e.message, true);
    }
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); }
    catch (e) { toast("Fikk ikke tilgang til localStorage: " + e.message, true); return; }
    if (!raw) { toast("Fant ingen lagret økt ennå — trykk Lagre først.", true); return; }
    let d;
    try { d = JSON.parse(raw); }
    catch (e) { toast("Den lagrede økten er skadet og kunne ikke leses.", true); return; }
    safe(() => CalculusTab.setState(d.calculus), "kalkulus");
    safe(() => TrigTab.setState(d.trig), "trigonometri");
    safe(() => LinAlgTab.setState(d.linalg), "lineær algebra");
    safe(() => PhysicsTab.setState(d.physics), "fysikk");
    const when = d.savedAt ? new Date(d.savedAt).toLocaleString("nb-NO") : "ukjent tidspunkt";
    toast("Lastet inn økt fra " + when + " ✓");
  }

  return { save, load };
})();
