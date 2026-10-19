/**
 * Tiny logic-light template engine used by the build (no dependencies).
 *
 *   {{ path }}                      value, HTML-escaped
 *   {{ path | filter | filter:arg }} value passed through filters
 *   {{#each path as item}} ... {{else}} ... {{/each}}
 *   {{#if path}} ... {{else}} ... {{/if}}
 *   {{#unless path}} ... {{/unless}}
 *
 * Inside {{#each}}: @index (0-based), @number (1-based), @total,
 * @first, @last, @even, @odd refer to the innermost loop.
 *
 * A block tag that sits alone on its line removes that whole line, so
 * templates can be indented naturally without leaving blank lines behind.
 */
import fs from "node:fs";
import path from "node:path";

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export class SafeString {
  constructor(value) {
    this.value = String(value);
  }
  toString() {
    return this.value;
  }
}

// ---------- filters ----------
export function createFilters({ iconsDir }) {
  const iconCache = new Map();
  return {
    // output
    raw: (v) => new SafeString(v),
    json: (v) => new SafeString(JSON.stringify(String(v)).slice(1, -1).replace(/</g, "\\u003c")),
    // formatting
    pad2: (v) => String(v).padStart(2, "0"),
    number: (v) => Number(v).toLocaleString("en-US"),
    upper: (v) => String(v).toUpperCase(),
    lower: (v) => String(v).toLowerCase(),
    // "--agro" for BEM modifiers, "" when empty/missing
    mod: (v) => (v === undefined || v === null || v === "" ? "" : `--${v}`),
    default: (v, fallback = "") => (v === undefined || v === null || v === "" ? fallback : v),
    // collections
    count: (v) => (Array.isArray(v) ? v.length : Object.keys(v || {}).length),
    values: (v) => (Array.isArray(v) ? v : Object.values(v || {})),
    reverse: (v) => [...v].reverse(),
    repeat: (v, times = "2") => Array.from({ length: Number(times) }, () => v).flat(),
    join: (v, sep = ", ") => v.join(sep),
    // join lines with <br />, escaping each line
    lines: (v) => new SafeString([].concat(v).map(escapeHtml).join("<br />")),
    // inline SVG from src/partials/icons/<name>.svg
    icon: (name) => {
      if (!iconCache.has(name)) {
        const file = path.join(iconsDir, `${name}.svg`);
        if (!fs.existsSync(file)) throw new Error(`Unknown icon "${name}" (expected ${file})`);
        iconCache.set(name, fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim());
      }
      return new SafeString(iconCache.get(name));
    },
  };
}

// ---------- parser ----------
const TAG = /\{\{\s*(#each|#if|#unless|\/each|\/if|\/unless|else\b)?\s*([^}]*?)\s*\}\}/g;

function stripStandaloneLines(src) {
  // remove lines that only contain a block tag ({{#each}}, {{/if}}, {{else}} ...)
  return src.replace(
    /^[ \t]*(\{\{\s*(?:#each|#if|#unless|\/each|\/if|\/unless|else)\b[^}]*\}\})[ \t]*\r?\n/gm,
    "$1",
  );
}

// ---------- evaluation ----------
function lookup(scopes, pathStr) {
  const parts = pathStr.split(".");
  const head = parts[0];
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(scopes[i], head)) {
      return parts.slice(1).reduce((o, k) => (o == null ? undefined : o[k]), scopes[i][head]);
    }
  }
  return undefined;
}

function parseArg(raw) {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  if (/^".*"$|^'.*'$/.test(t)) return t.slice(1, -1);
  return t;
}

function evaluate(expr, scopes, filters, where) {
  const [head, ...pipes] = expr.split(/\s*\|\s*(?=(?:[^"']|"[^"]*"|'[^']*')*$)/);
  let value = /^".*"$|^'.*'$/.test(head.trim()) ? head.trim().slice(1, -1) : lookup(scopes, head.trim());
  for (const pipe of pipes) {
    const idx = pipe.indexOf(":");
    const name = (idx === -1 ? pipe : pipe.slice(0, idx)).trim();
    const arg = idx === -1 ? undefined : parseArg(pipe.slice(idx + 1));
    const fn = filters[name];
    if (!fn) throw new Error(`Unknown filter "${name}" at ${where}`);
    if (value === undefined && !["default", "mod"].includes(name))
      throw new Error(`"${head.trim()}" is undefined at ${where}`);
    value = fn(value, arg);
  }
  return value;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

function run(nodes, scopes, filters) {
  let out = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out += node.value;
        break;
      case "var": {
        const v = evaluate(node.expr, scopes, filters, node.where);
        if (v === undefined || v === null)
          throw new Error(`"${node.expr}" is undefined at ${node.where}`);
        out += v instanceof SafeString ? v.value : escapeHtml(v);
        break;
      }
      case "if":
      case "unless": {
        let cond = truthy(evaluate(node.expr, scopes, filters, node.where));
        if (node.type === "unless") cond = !cond;
        out += run(cond ? node.children : node.alt || [], scopes, filters);
        break;
      }
      case "each": {
        const list = evaluate(node.expr, scopes, filters, node.where);
        const items = Array.isArray(list) ? list : list ? Object.values(list) : [];
        if (list === undefined) throw new Error(`"${node.expr}" is undefined at ${node.where}`);
        if (!items.length) {
          out += run(node.alt || [], scopes, filters);
          break;
        }
        items.forEach((item, i) => {
          out += run(node.children, [
            ...scopes,
            {
              [node.name]: item,
              "@index": i,
              "@number": i + 1,
              "@total": items.length,
              "@first": i === 0,
              "@last": i === items.length - 1,
              "@even": i % 2 === 0,
              "@odd": i % 2 === 1,
            },
          ], filters);
        });
        break;
      }
      default:
        throw new Error(`Unknown node ${node.type}`);
    }
  }
  return out;
}

export function renderTemplate(src, context, { filters, file = "template" }) {
  const tree = parseWithElse(stripStandaloneLines(src), file);
  return run(tree.children, [context], filters);
}

// parse, then move nodes that followed {{else}} into .alt
function parseWithElse(src, file) {
  const root = { type: "root", children: [] };
  const stack = [root];
  let last = 0;
  let line = 1;
  const target = (node) => (node._inAlt ? node.alt : node.children);

  for (const m of src.matchAll(TAG)) {
    const text = src.slice(last, m.index);
    const where = `${file}:${line + (text.match(/\n/g) || []).length}`;
    line += (src.slice(last, m.index + m[0].length).match(/\n/g) || []).length;
    const current = stack.at(-1);
    if (text) target(current).push({ type: "text", value: text });
    last = m.index + m[0].length;

    const [, keyword, body] = m;
    if (!keyword) {
      target(current).push({ type: "var", expr: body, where });
    } else if (keyword === "#each") {
      const em = body.match(/^(.+?)\s+as\s+(\w+)$/);
      if (!em) throw new Error(`{{#each}} needs "list as name" at ${where}`);
      const node = { type: "each", expr: em[1], name: em[2], children: [], alt: null, where };
      target(current).push(node);
      stack.push(node);
    } else if (keyword === "#if" || keyword === "#unless") {
      const node = { type: keyword.slice(1), expr: body, children: [], alt: null, where };
      target(current).push(node);
      stack.push(node);
    } else if (keyword === "else") {
      if (!["each", "if", "unless"].includes(current.type) || current._inAlt)
        throw new Error(`Unexpected {{else}} at ${where}`);
      current.alt = [];
      current._inAlt = true;
    } else {
      const want = keyword.slice(1);
      if (current.type !== want) throw new Error(`Unexpected {{/${want}}} at ${where}`);
      stack.pop();
    }
  }
  const rest = src.slice(last);
  if (rest) target(stack.at(-1)).push({ type: "text", value: rest });
  if (stack.length > 1) throw new Error(`Unclosed {{#${stack.at(-1).type}}} opened at ${stack.at(-1).where}`);
  return root;
}
