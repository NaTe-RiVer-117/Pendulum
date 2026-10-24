const FUNCTIONS = {
  sin: 1,
  cos: 1,
  tan: 1,
  abs: 1,
  min: 2,
  max: 2,
  pow: 2,
  sqrt: 1,
  fract: 1,
  mix: 3,
  floor: 1,
  ceil: 1,
};

const NAMES = new Set(["time", "uv.x", "uv.y"]);

function fail(source, index, message) {
  const start = Math.max(0, index - 12);
  const snippet = source.slice(start, index + 12) || source.slice(0, 24);
  throw new Error(`Formula: ${message} near "${snippet}"`);
}

export function parseFormula(source) {
  const text = String(source ?? "");
  if (text.length > 400) fail(text, 0, "expression is too long");
  let index = 0;

  function skip() {
    while (text[index] === " " || text[index] === "\n" || text[index] === "\t" || text[index] === "\r") {
      index += 1;
    }
  }

  function parseExpression() {
    let left = parseTerm();
    skip();
    while (text[index] === "+" || text[index] === "-") {
      const op = text[index];
      index += 1;
      const right = parseTerm();
      left = { type: "binary", op, left, right };
      skip();
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    skip();
    while (text[index] === "*" || text[index] === "/") {
      const op = text[index];
      index += 1;
      const right = parseUnary();
      left = { type: "binary", op, left, right };
      skip();
    }
    return left;
  }

  function parseUnary() {
    skip();
    if (text[index] === "+") {
      index += 1;
      return parseUnary();
    }
    if (text[index] === "-") {
      index += 1;
      return { type: "unary", op: "-", expr: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    skip();
    const char = text[index];
    if (!char) fail(text, index, "unexpected end");
    if (char === "(") {
      index += 1;
      const inner = parseExpression();
      skip();
      if (text[index] !== ")") fail(text, index, "expected )");
      index += 1;
      return inner;
    }
    if ((char >= "0" && char <= "9") || char === ".") return parseNumber();
    if ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_") {
      return parseName();
    }
    fail(text, index, `unexpected "${char}"`);
  }

  function parseNumber() {
    const start = index;
    while ((text[index] >= "0" && text[index] <= "9") || text[index] === ".") index += 1;
    const raw = text.slice(start, index);
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(raw)) fail(text, start, "invalid number");
    return { type: "number", value: Number(raw) };
  }

  function parseName() {
    const start = index;
    while (/[A-Za-z0-9_]/.test(text[index] || "")) index += 1;
    let name = text.slice(start, index);
    if (text[index] === ".") {
      const mark = index;
      index += 1;
      const partStart = index;
      while (/[A-Za-z0-9_]/.test(text[index] || "")) index += 1;
      const part = text.slice(partStart, index);
      if (!part) fail(text, mark, "expected a name after .");
      name = `${name}.${part}`;
    }
    skip();
    if (text[index] === "(") {
      const arity = FUNCTIONS[name];
      if (!arity) fail(text, start, `unknown function ${name}`);
      index += 1;
      const args = [];
      skip();
      if (text[index] !== ")") {
        args.push(parseExpression());
        skip();
        while (text[index] === ",") {
          index += 1;
          args.push(parseExpression());
          skip();
        }
      }
      if (text[index] !== ")") fail(text, index, "expected )");
      index += 1;
      if (args.length !== arity) {
        fail(text, start, `${name} expects ${arity} argument${arity === 1 ? "" : "s"}`);
      }
      return { type: "call", name, args };
    }
    if (!NAMES.has(name)) fail(text, start, `unknown name ${name}`);
    return { type: "ident", name };
  }

  skip();
  if (!text.trim()) fail(text, 0, "expression is empty");
  const ast = parseExpression();
  skip();
  if (index < text.length) fail(text, index, "unexpected trailing input");
  return ast;
}

const BINARY = { "+": "add", "-": "sub", "*": "mul", "/": "div" };

export function emitFormula(ast, timeExpr = "time") {
  const used = new Set(["float"]);

  function walk(node) {
    if (node.type === "number") return `float(${node.value})`;
    if (node.type === "ident") {
      if (node.name === "time") {
        if (timeExpr === "time") used.add("time");
        return timeExpr;
      }
      used.add("uv");
      return node.name === "uv.x" ? "uv().x" : "uv().y";
    }
    if (node.type === "unary") {
      used.add("sub");
      return `sub(float(0), ${walk(node.expr)})`;
    }
    if (node.type === "binary") {
      const fn = BINARY[node.op];
      used.add(fn);
      return `${fn}(${walk(node.left)}, ${walk(node.right)})`;
    }
    used.add(node.name);
    return `${node.name}(${node.args.map(walk).join(", ")})`;
  }

  return { code: walk(ast), used };
}

export function compileFormula(ast, api) {
  const uvNode = api.uv();

  function walk(node) {
    if (node.type === "number") return api.float(node.value);
    if (node.type === "ident") {
      if (node.name === "time") return api.time;
      return node.name === "uv.x" ? uvNode.x : uvNode.y;
    }
    if (node.type === "unary") return api.sub(api.float(0), walk(node.expr));
    if (node.type === "binary") {
      const left = walk(node.left);
      const right = walk(node.right);
      if (node.op === "+") return api.add(left, right);
      if (node.op === "-") return api.sub(left, right);
      if (node.op === "*") return api.mul(left, right);
      return api.div(left, right);
    }
    return api[node.name](...node.args.map(walk));
  }

  return walk(ast);
}
