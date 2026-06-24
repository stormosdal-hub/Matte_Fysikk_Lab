"use strict";
/* MathParser — tolker matteuttrykk som "2x^2 + a*sin(3x)" og kompilerer dem
   til raske JS-funksjoner. Støtter implisitt multiplikasjon og parametere. */
const MathParser = (() => {

  const CONSTS = { pi: Math.PI, "π": Math.PI, e: Math.E, tau: 2 * Math.PI };

  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt,
    ln: Math.log, log: Math.log10,
    abs: Math.abs, exp: Math.exp,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
    min: Math.min, max: Math.max, atan2: Math.atan2
  };

  // Kjente navn, lengste først, slik at "xcos" deles til x * cos og "exp" ikke blir e*x*p
  const NAMES = Object.keys(FUNCS).concat(Object.keys(CONSTS))
    .sort((a, b) => b.length - a.length);

  function splitWord(word, out, names) {
    let i = 0;
    while (i < word.length) {
      let match = null;
      for (const n of names) {
        if (word.startsWith(n, i)) { match = n; break; }
      }
      if (match) { out.push({ type: "ident", value: match }); i += match.length; }
      else if (/[0-9]/.test(word[i])) { out.push({ type: "num", value: parseInt(word[i], 10) }); i += 1; }
      else { out.push({ type: "ident", value: word[i] }); i += 1; }
    }
  }

  function tokenize(src, names) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === " " || c === "\t") { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i, dot = false;
        while (j < src.length && (/[0-9]/.test(src[j]) || (src[j] === "." && !dot))) {
          if (src[j] === ".") dot = true;
          j++;
        }
        const num = parseFloat(src.slice(i, j));
        if (!isFinite(num)) throw new Error("Ugyldig tall");
        tokens.push({ type: "num", value: num });
        i = j;
        continue;
      }
      if (/[a-zπθ_]/.test(c)) {
        let j = i;
        while (j < src.length && /[a-zπθ_0-9]/.test(src[j])) j++;
        // sifre på slutten av et ord (f.eks. "h2 = ...") hører bare med
        // hvis hele ordet er en kjent variabel — ellers er de egne tall-tokens
        let word = src.slice(i, j);
        while (word.length && /[0-9]/.test(word[word.length - 1]) && !names.includes(word)) {
          word = word.slice(0, -1);
        }
        splitWord(word, tokens, names);
        i += word.length;
        continue;
      }
      if ("+-*/^(),|".includes(c)) { tokens.push({ type: c }); i++; continue; }
      throw new Error('Ukjent tegn: "' + c + '"');
    }
    return tokens;
  }

  /* extraVars: kjente (gjerne flerbokstavs-) variabelnavn, f.eks. ["hyp","mot"],
     slik at "hyp*sin(θ)" ikke tolkes som h*y*p*sin(θ). */
  function parse(src, extraVars) {
    src = String(src || "").toLowerCase().replace(/−/g, "-").replace(/·/g, "*");
    let names = NAMES;
    if (extraVars && extraVars.length) {
      const ex = [...new Set(extraVars)].filter(n => n && !FUNCS[n] && CONSTS[n] === undefined);
      if (ex.length) names = NAMES.concat(ex).sort((a, b) => b.length - a.length);
    }
    const tokens = tokenize(src, names);
    if (tokens.length === 0) throw new Error("Tomt uttrykk");
    let pos = 0;
    const vars = new Set();

    const peek = () => tokens[pos];
    function expect(type, msg) {
      if (!tokens[pos] || tokens[pos].type !== type) throw new Error(msg);
      pos++;
    }

    function parseExpr() {
      let node = parseTerm();
      while (peek() && (peek().type === "+" || peek().type === "-")) {
        const op = tokens[pos++].type;
        node = { type: op, l: node, r: parseTerm() };
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.type === "*" || t.type === "/") {
          pos++;
          node = { type: t.type, l: node, r: parseUnary() };
        } else if (t.type === "num" || t.type === "ident" || t.type === "(") {
          // implisitt multiplikasjon: 2x, 3sin(x), (x+1)(x-2)
          node = { type: "*", l: node, r: parseUnary() };
        } else break;
      }
      return node;
    }

    function parseUnary() {
      const t = peek();
      if (t && (t.type === "-" || t.type === "+")) {
        pos++;
        const arg = parseUnary();
        return t.type === "-" ? { type: "neg", a: arg } : arg;
      }
      return parsePower();
    }

    function parsePower() {
      const base = parseAtom();
      if (peek() && peek().type === "^") {
        pos++;
        return { type: "^", l: base, r: parseUnary() }; // høyreassosiativ
      }
      return base;
    }

    function parseAtom() {
      const t = peek();
      if (!t) throw new Error("Uttrykket slutter for tidlig");
      if (t.type === "num") { pos++; return { type: "num", v: t.value }; }
      if (t.type === "(") {
        pos++;
        const node = parseExpr();
        expect(")", "Mangler sluttparentes )");
        return node;
      }
      if (t.type === "|") {
        pos++;
        const node = parseExpr();
        expect("|", "Mangler avsluttende |");
        return { type: "call", name: "abs", args: [node] };
      }
      if (t.type === "ident") {
        pos++;
        const name = t.value;
        if (FUNCS[name]) {
          expect("(", 'Funksjonen "' + name + '" trenger parentes: ' + name + "(...)");
          const args = [parseExpr()];
          while (peek() && peek().type === ",") { pos++; args.push(parseExpr()); }
          expect(")", "Mangler sluttparentes ) etter " + name);
          return { type: "call", name, args };
        }
        if (CONSTS[name] !== undefined) return { type: "const", v: CONSTS[name] };
        vars.add(name);
        return { type: "var", name };
      }
      throw new Error("Uventet symbol i uttrykket");
    }

    const ast = parseExpr();
    if (pos < tokens.length) throw new Error("Uventet symbol mot slutten av uttrykket");
    return { fn: compile(ast), vars: [...vars] };
  }

  function compile(n) {
    switch (n.type) {
      case "num": case "const": { const v = n.v; return () => v; }
      case "var": {
        const name = n.name;
        return s => { const v = s[name]; return v === undefined ? NaN : v; };
      }
      case "neg": { const a = compile(n.a); return s => -a(s); }
      case "+": { const l = compile(n.l), r = compile(n.r); return s => l(s) + r(s); }
      case "-": { const l = compile(n.l), r = compile(n.r); return s => l(s) - r(s); }
      case "*": { const l = compile(n.l), r = compile(n.r); return s => l(s) * r(s); }
      case "/": { const l = compile(n.l), r = compile(n.r); return s => l(s) / r(s); }
      case "^": { const l = compile(n.l), r = compile(n.r); return s => Math.pow(l(s), r(s)); }
      case "call": {
        const f = FUNCS[n.name];
        const args = n.args.map(compile);
        if (args.length === 1) { const a0 = args[0]; return s => f(a0(s)); }
        if (args.length === 2) { const a0 = args[0], a1 = args[1]; return s => f(a0(s), a1(s)); }
        return s => f(...args.map(a => a(s)));
      }
    }
    throw new Error("Intern feil i parseren");
  }

  return {
    parse,
    isReserved: n => !!FUNCS[n] || CONSTS[n] !== undefined
  };
})();
