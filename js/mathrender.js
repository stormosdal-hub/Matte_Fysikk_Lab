"use strict";
/* MathRender — viser et uttrykkstre fra MathParser som lesbar matematikk:
   brøker får brøkstrek, potenser blir hevet skrift, og variabler kan byttes
   ut med tallverdiene de har akkurat nå ("vis utregningen"). */
const MathRender = (() => {

  // presedens: høyere tall binder sterkere. Atomer (tall, navn, funksjoner)
  // trenger aldri parentes rundt seg.
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "neg": 3, "^": 4 };
  const ATOM = 5;
  const prec = n => PREC[n.type] || ATOM;

  const defaultFormat = v => formatNum(v, 5);

  function span(text, cls) {
    const el = document.createElement("span");
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function fraction(top, bottom) {
    const f = span(undefined, "mr-frac");
    const t = span(); t.append(top);
    const b = span(); b.append(bottom);
    f.append(t, span(undefined, "mr-bar"), b);
    return f;
  }

  function parens(inner) {
    const s = span();
    s.append(document.createTextNode("("), inner, document.createTextNode(")"));
    return s;
  }

  /* Lager en tegner for én visning. values = bytt variabler mot tall,
     format = hvordan tall skrives (styres av desimal-innstillingen). */
  function renderer(scope, values, format) {
    // samme minustegn i tall som i regneoperatorene
    const num = v => String(format(v)).replace(/-/g, "−");

    /* parentPrec = presedensen til noden over (0 = står alene eller rett
       innenfor en parentes/brøk). first = noden står lengst til venstre, der
       et minustegn ikke kan misforstås. */
    return function build(node, parentPrec, first) {
      const p = prec(node);
      let el, minus = false;

      switch (node.type) {
        case "num":
          el = span(num(node.v));
          minus = node.v < 0;
          break;

        case "const":
          // π og e beholder navnet sitt til de skal vises som tall
          el = span(values ? num(node.v) : (node.name || num(node.v)));
          break;

        case "var": {
          const v = scope ? scope[node.name] : undefined;
          if (values && v !== undefined) {
            el = span(num(v));
            minus = v < 0;
          } else {
            el = span(node.name);
          }
          break;
        }

        case "neg":
          el = span("−");
          el.append(build(node.a, PREC.neg, true));
          minus = true;
          break;

        case "call":
          el = span(node.name + "(");
          node.args.forEach((a, i) => {
            if (i) el.append(document.createTextNode(", "));
            el.append(build(a, 0, true));
          });
          el.append(document.createTextNode(")"));
          break;

        case "/":
          // brøkstreken grupperer allerede, så ingen parenteser inni
          el = fraction(build(node.l, 0, true), build(node.r, 0, true));
          break;

        case "^": {
          // vanlig inline-span: <sup> stiller seg opp av seg selv
          el = span();
          el.append(build(node.l, ATOM, false));
          const sup = document.createElement("sup");
          sup.append(build(node.r, 0, true));
          el.append(sup);
          break;
        }

        default: {   // +  −  ×
          const op = node.type === "*" ? "×" : node.type === "-" ? "−" : "+";
          // "a − (b + c)" trenger parentes; "a + (b + c)" gjør ikke
          const rightPrec = (node.type === "+" || node.type === "*") ? p : p + 0.5;
          // mellomrommene kommer fra gap i CSS — tekst-mellomrom kollapser i flex
          el = span(undefined, "mr-row");
          el.append(build(node.l, p, first));
          el.append(span(op));
          el.append(build(node.r, rightPrec, false));
        }
      }

      const needParens = parentPrec > 0 && (p < parentPrec || (minus && !first));
      return needParens ? parens(el) : el;
    };
  }

  return {
    /* Uttrykket med variabelnavn: sin(θ) × hyp */
    symbols: (ast, scope, format) => renderer(scope, false, format || defaultFormat)(ast, 0, true),
    /* Samme uttrykk med tallene satt inn: sin(0.7854) × 5 */
    values: (ast, scope, format) => renderer(scope, true, format || defaultFormat)(ast, 0, true)
  };
})();
