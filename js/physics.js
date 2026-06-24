"use strict";
/* Fysikk-fanen: holder de fem under-sidene (metode, kinematikk,
   dynamikk, energi, termo) og bytter mellom dem. */
const PhysicsTab = (() => {

  const SUBS = {
    metode: () => PhysMethod,
    kinematikk: () => PhysKinematics,
    dynamikk: () => ForcesTab,
    energi: () => PhysEnergy,
    termo: () => PhysThermo
  };

  let active = "dynamikk";
  let visible = false;

  const mod = name => SUBS[name]();

  function switchSub(name) {
    if (!SUBS[name]) return;
    if (name === active) return;
    if (visible) mod(active).hide();
    document.querySelectorAll(".phys-page").forEach(p => p.classList.remove("active"));
    document.getElementById("phys-" + name).classList.add("active");
    document.querySelectorAll("#phys-subtabs .subtab").forEach(b =>
      b.classList.toggle("active", b.dataset.sub === name));
    active = name;
    if (visible) mod(active).show();
  }

  function init() {
    PhysMethod.init();
    PhysKinematics.init();
    ForcesTab.init();
    PhysEnergy.init();
    PhysThermo.init();
    document.querySelectorAll("#phys-subtabs .subtab").forEach(b => {
      b.addEventListener("click", () => switchSub(b.dataset.sub));
    });
  }

  function show() {
    visible = true;
    mod(active).show();
  }

  function hide() {
    visible = false;
    mod(active).hide();
  }

  function resize() {
    if (visible) mod(active).resize();
  }

  function getState() {
    return {
      active,
      metode: PhysMethod.getState(),
      kinematikk: PhysKinematics.getState(),
      dynamikk: ForcesTab.getState(),
      energi: PhysEnergy.getState(),
      termo: PhysThermo.getState()
    };
  }

  function setState(s) {
    if (!s) return;
    PhysMethod.setState(s.metode);
    PhysKinematics.setState(s.kinematikk);
    ForcesTab.setState(s.dynamikk);
    PhysEnergy.setState(s.energi);
    PhysThermo.setState(s.termo);
    if (s.active && SUBS[s.active]) switchSub(s.active);
  }

  return { init, show, hide, resize, getState, setState };
})();
