"use strict";
/* Navigasjon: dropdown-meny som bytter mellom fanene, + lagre/last inn. */
(() => {

  // roundRect-fallback for eldre nettlesere
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r || 0, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  const TABS = {
    calculus: { mod: CalculusTab, name: "Kalkulus", ico: "∫" },
    trig: { mod: TrigTab, name: "Trigonometri", ico: "θ" },
    linalg: { mod: LinAlgTab, name: "Lineær algebra", ico: "λ" },
    physics: { mod: PhysicsTab, name: "Fysikk", ico: "⚛" }
  };

  let active = null;

  const btn = document.getElementById("nav-btn");
  const menu = document.getElementById("nav-menu");

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function switchTab(name) {
    if (name === active) { closeMenu(); return; }
    if (active) TABS[active].mod.hide();

    document.querySelectorAll(".tab-page").forEach(s => s.classList.remove("active"));
    document.getElementById("tab-" + name).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === name));
    document.getElementById("nav-current").textContent = TABS[name].name;
    document.getElementById("nav-ico").textContent = TABS[name].ico;

    active = name;
    TABS[name].mod.show();
    closeMenu();
  }

  btn.addEventListener("click", e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute("aria-expanded", String(!menu.hidden));
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => switchTab(item.dataset.tab));
  });

  document.addEventListener("click", e => {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (active) TABS[active].mod.resize();
  });

  document.getElementById("save-btn").addEventListener("click", Storage.save);
  document.getElementById("load-btn").addEventListener("click", Storage.load);
  document.getElementById("share-btn").addEventListener("click", Storage.share);

  // oppstart
  CalculusTab.init();
  TrigTab.init();
  LinAlgTab.init();
  PhysicsTab.init();

  // gjør avlesningene ved glidebryterne redigerbare (fysikk-fanen)
  ValueField.init();

  // Nedlastingsknapp på kort-grafene med fast høyde (pakkes inn)
  attachCanvasDownload(document.getElementById("circle-canvas"), "enhetssirkel");
  attachCanvasDownload(document.getElementById("abcd-canvas"), "sinusfunksjon");
  attachCanvasDownload(document.getElementById("la-vec-canvas"), "vektorer");
  attachCanvasDownload(document.getElementById("la-trans-canvas"), "transformasjon");
  attachCanvasDownload(document.getElementById("th-canvas"), "oppvarming");
  attachCanvasDownload(document.getElementById("kl-canvas"), "klimamodell");

  // Fysikk-simuleringer (grid med height:100%) — overlegg uten innpakking
  attachOverlayDownload(document.getElementById("kin-track"), "kinematikk", "top");
  attachOverlayDownload(document.getElementById("kin-graphs"), "kinematikk-graf", "bottom");
  attachOverlayDownload(document.getElementById("force-canvas"), "krefter", "topleft");
  attachOverlayDownload(document.getElementById("force-graph"), "krefter-graf", "bottom");
  attachOverlayDownload(document.getElementById("en-canvas"), "energi", "top");
  attachOverlayDownload(document.getElementById("en-graph"), "energi-graf", "bottom");

  switchTab("calculus");

  // Hvis URL-en inneholder et delt oppsett (#s=...), last det inn.
  Storage.loadFromHash();
})();
