"use strict";
/* Enhetstester for MathParser. Kjøres med `npm test` (node:test, ingen avhengigheter). */

const test = require("node:test");
const assert = require("node:assert");
const MathParser = require("../js/parser.js");

// Hjelper: evaluer uttrykk med gitt scope og kjente flerbokstavs-variabler.
function ev(src, scope = {}, vars) {
  return MathParser.parse(src, vars).fn(scope);
}
// Tilnærmet likhet for flyttall.
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps,
    `forventet ${expected}, fikk ${actual}`);
}

test("grunnleggende aritmetikk og presedens", () => {
  near(ev("1 + 2 * 3"), 7);
  near(ev("(1 + 2) * 3"), 9);
  near(ev("6 / 2 / 3"), 1);          // venstreassosiativ
  near(ev("2 - 3 - 4"), -5);
  near(ev("10 - 2 * 3 + 1"), 5);
});

test("potens er høyreassosiativ", () => {
  near(ev("2^3^2"), 512);            // 2^(3^2), ikke (2^3)^2 = 64
  near(ev("2^10"), 1024);
});

test("unær minus", () => {
  near(ev("-x^2", { x: 3 }), -9);    // -(x^2)
  near(ev("(-x)^2", { x: 3 }), 9);
  near(ev("-5 + 3"), -2);
});

test("implisitt multiplikasjon", () => {
  near(ev("2x", { x: 4 }), 8);
  near(ev("3sin(0)"), 0);
  near(ev("(x+1)(x-2)", { x: 5 }), 18);
  near(ev("2pi"), 2 * Math.PI);
});

test("funksjoner med ett og to argumenter", () => {
  near(ev("sin(pi/2)"), 1);
  near(ev("cos(0)"), 1);
  near(ev("sqrt(16)"), 4);
  near(ev("ln(e)"), 1);
  near(ev("log(1000)"), 3);
  near(ev("min(3, 7)"), 3);
  near(ev("max(3, 7)"), 7);
  near(ev("atan2(1, 1)"), Math.PI / 4);
});

test("absoluttverdi med |...|", () => {
  near(ev("|x|", { x: -3 }), 3);
  near(ev("|x| + 1", { x: -2 }), 3);
  near(ev("abs(-4)"), 4);
});

test("konstanter", () => {
  near(ev("pi"), Math.PI);
  near(ev("tau"), 2 * Math.PI);
  near(ev("e"), Math.E);
});

test("variabler samles opp i .vars", () => {
  const p = MathParser.parse("a*x^2 + b*x + c");
  assert.deepStrictEqual(p.vars.sort(), ["a", "b", "c", "x"]);
});

test("flerbokstavs-variabler via extraVars", () => {
  near(ev("hyp", { hyp: 5 }, ["hyp"]), 5);
  near(ev("hyp*sin(theta)", { hyp: 10, theta: 0 }, ["hyp", "theta"]), 0);
  // uten extraVars deles "hyp" i enkeltbokstaver (h*y*p) — dokumenterer kvirken
  const split = MathParser.parse("hyp");
  assert.deepStrictEqual(split.vars.sort(), ["h", "p", "y"]);
  const p = MathParser.parse("hyp*2", ["hyp"]);
  assert.deepStrictEqual(p.vars, ["hyp"]);
});

test("udefinert variabel gir NaN, ikke kræsj", () => {
  assert.ok(Number.isNaN(ev("x + 1")));
});

test("store bokstaver normaliseres", () => {
  near(ev("SIN(0)"), 0);
  near(ev("PI"), Math.PI);
});

test("isReserved skiller funksjoner/konstanter fra variabler", () => {
  assert.strictEqual(MathParser.isReserved("sin"), true);
  assert.strictEqual(MathParser.isReserved("pi"), true);
  assert.strictEqual(MathParser.isReserved("x"), false);
  assert.strictEqual(MathParser.isReserved("hyp"), false);
});

test("ugyldige uttrykk kaster feil", () => {
  assert.throws(() => MathParser.parse(""), /Tomt uttrykk/);
  assert.throws(() => MathParser.parse("x $ 2"), /Ukjent tegn/);
  assert.throws(() => MathParser.parse("sin(x"), /sluttparentes/);
  assert.throws(() => MathParser.parse("(x + 1"), /sluttparentes/);
  assert.throws(() => MathParser.parse("2 +"), /slutter for tidlig/);
});
