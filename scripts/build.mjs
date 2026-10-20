#!/usr/bin/env node
/**
 * Apex Holdings Limited: static site build (zero dependencies, Node 18+)
 *
 *   src/pages/**\/*.html   pages, each starting with an <!--@page {json}--> block
 *   src/partials/**        reusable HTML, pulled in with <!-- @include path -->
 *   src/data/*.json        site content (lists, cards, links...), available in
 *                          templates as {{data.<file name>.<key>}}
 *   src/assets/css/modules concatenated in filename order into assets/css/style.css
 *   src/assets/js, images  copied as-is
 *   src/public/**          copied to the site root (.htaccess, _headers, ...)
 *
 * Output: dist/ (fully rendered static HTML, ready to upload to any host).
 * Also generates sitemap.xml, robots.txt and site.webmanifest from site.config.json.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFilters, renderTemplate } from "./lib/template.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const PARTIALS = path.join(SRC, "partials");
const DATA = path.join(SRC, "data");

// ---------- helpers ----------
const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const write = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : [full];
      })
    : [];
const copyDir = (from, to) => {
  for (const file of walk(from)) {
    const dest = path.join(to, path.relative(from, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
};
const hash = (data) => createHash("sha1").update(data).digest("hex").slice(0, 8);
const toPosix = (p) => p.split(path.sep).join("/");
const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
// ---------- template engine ----------
function resolveIncludes(html, file, stack = []) {
  return html.replace(/^[ \t]*<!--\s*@include\s+([^\s]+)\s*-->[ \t]*$/gm, (_, rel) => {
    const target = path.join(PARTIALS, rel);
    if (!fs.existsSync(target)) throw new Error(`Missing partial "${rel}" (included from ${file})`);
    if (stack.includes(target)) throw new Error(`Circular include: ${rel}`);
    return resolveIncludes(read(target), target, [...stack, target]).replace(/\n$/, "");
  });
}

function parsePage(file) {
  const raw = read(file);
  const match = raw.match(/^<!--@page\s*([\s\S]*?)-->\n?/);
  if (!match) throw new Error(`${file} must start with an <!--@page {...}--> block`);
  return { meta: JSON.parse(match[1]), body: raw.slice(match[0].length) };
}

// ---------- content data ----------
/**
 * Loads every src/data/*.json file into one object keyed by file name, then:
 *  - resolves "extends": "@file.key.path" (copies the referenced object's
 *    fields; the object's own fields win). Used to reuse company details.
 *  - adds derived values (division counts, total companies) so numbers that
 *    appear in several places always come from the same lists.
 */
export function loadData() {
  const data = {};
  for (const file of fs.readdirSync(DATA).filter((f) => f.endsWith(".json")).sort()) {
    try {
      data[path.basename(file, ".json")] = JSON.parse(read(path.join(DATA, file)));
    } catch (err) {
      throw new Error(`Invalid JSON in src/data/${file}: ${err.message}`);
    }
  }

  const resolveRef = (ref) => {
    const value = ref
      .slice(1)
      .split(".")
      .reduce((o, k) => (o == null ? undefined : o[k]), data);
    if (value === undefined) throw new Error(`Unknown data reference "${ref}"`);
    return value;
  };
  const resolve = (node) => {
    if (Array.isArray(node)) return node.map(resolve);
    if (node && typeof node === "object") {
      const { extends: ref, ...own } = node;
      const base = typeof ref === "string" && ref.startsWith("@") ? resolve(resolveRef(ref)) : {};
      return Object.fromEntries(
        Object.entries({ ...base, ...own }).map(([k, v]) => [k, resolve(v)]),
      );
    }
    return node;
  };
  for (const key of Object.keys(data)) data[key] = resolve(data[key]);

  // derived values
  const { businesses, companies } = data;
  if (businesses?.divisions) {
    for (const division of businesses.divisions) {
      division.count = division.companies.length;
      for (const company of division.companies) {
        if (company.division && company.division !== division.key)
          throw new Error(`${company.abbr} is listed under "${division.key}" but companies.json says "${company.division}"`);
      }
    }
    businesses.totalCompanies = businesses.divisions.reduce((n, d) => n + d.count, 0);
    // shares for the portfolio donut chart (percent of total, cumulative offset)
    let offset = 0;
    for (const division of businesses.divisions) {
      division.share = +((division.count / businesses.totalCompanies) * 100).toFixed(3);
      division.offset = +(-offset).toFixed(3);
      offset += division.share;
    }
    if (companies) {
      const listed = new Set(businesses.divisions.flatMap((d) => d.companies.map((c) => c.abbr)));
      for (const c of Object.values(companies)) {
        if (!listed.has(c.abbr)) console.warn(`Warning: ${c.abbr} is in companies.json but not in any division`);
      }
    }
  }
  return data;
}

// ---------- build ----------
export function build({ quiet = false } = {}) {
  const started = Date.now();
  const site = JSON.parse(read(path.join(ROOT, "site.config.json")));
  site.url = site.url.replace(/\/+$/, "");
  const data = loadData();
  const filters = createFilters({ iconsDir: path.join(PARTIALS, "icons") });

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. static files
  copyDir(path.join(SRC, "public"), DIST);
  copyDir(path.join(SRC, "assets", "images"), path.join(DIST, "assets", "images"));
  copyDir(path.join(SRC, "assets", "js"), path.join(DIST, "assets", "js"));

  // 2. CSS: concatenate modules in order
  const cssDir = path.join(SRC, "assets", "css", "modules");
  const css = fs
    .readdirSync(cssDir)
    .filter((f) => f.endsWith(".css"))
    .sort()
    .map((f) => read(path.join(cssDir, f)))
    .join("");
  write(path.join(DIST, "assets", "css", "style.css"), css);

  // cache-busting versions for the files that change between releases
  const versions = { "assets/css/style.css": hash(css) };
  for (const file of walk(path.join(DIST, "assets", "js"))) {
    versions[toPosix(path.relative(DIST, file))] = hash(read(file));
  }

  // 3. pages
  const pages = [];
  for (const file of walk(path.join(SRC, "pages")).filter((f) => f.endsWith(".html"))) {
    const rel = toPosix(path.relative(path.join(SRC, "pages"), file));
    const { meta, body } = parsePage(file);
    const pagePath = meta.path || "/" + rel.replace(/(^|\/)index\.html$/, "$1");
    const root = meta.absoluteAssets ? "/" : "../".repeat(rel.split("/").length - 1);
    const page = {
      ogType: "website",
      robots: "index, follow",
      preloadImage: "",
      ...meta,
      id: meta.id || (rel === "index.html" ? "home" : rel.split("/")[0].replace(/\.html$/, "")),
      path: pagePath,
      url: site.url + pagePath,
      ogImageUrl: site.url + (meta.ogImage || site.ogImage),
      root,
    };

    let html = renderTemplate(resolveIncludes(body, file), { site, page, data }, { filters, file: rel });
    for (const [asset, v] of Object.entries(versions)) {
      html = html.split(`${root}${asset}"`).join(`${root}${asset}?v=${v}"`);
    }
    write(path.join(DIST, rel), html);
    pages.push({ rel, page, html });
  }

  // 4. sitemap.xml + robots.txt + site.webmanifest
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .filter(({ page }) => page.sitemap !== false && !/noindex/.test(page.robots))
    .sort((a, b) => a.page.path.localeCompare(b.page.path))
    .map(
      ({ page }) =>
        `  <url>\n    <loc>${escapeHtml(page.url)}</loc>\n    <lastmod>${page.lastmod || today}</lastmod>\n` +
        (page.changefreq ? `    <changefreq>${page.changefreq}</changefreq>\n` : "") +
        (page.priority ? `    <priority>${page.priority}</priority>\n` : "") +
        `  </url>`,
    );
  write(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
  );
  write(
    path.join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
  );
  write(
    path.join(DIST, "site.webmanifest"),
    JSON.stringify(
      {
        name: site.name,
        short_name: site.shortName,
        start_url: "/",
        display: "browser",
        lang: site.lang,
        theme_color: site.themeColor,
        background_color: site.backgroundColor,
        icons: [{ src: "/assets/images/symbol.png", type: "image/png", sizes: "any" }],
      },
      null,
      2,
    ) + "\n",
  );

  // 5. sanity check: every local file referenced from HTML/CSS must exist in dist
  const missing = [];
  const checkRef = (ref, fromFile) => {
    if (!ref || /^(https?:|mailto:|tel:|data:|#|\/\/)/.test(ref)) return;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) return;
    const target = clean.startsWith("/")
      ? path.join(DIST, clean)
      : path.join(path.dirname(fromFile), clean);
    if (!fs.existsSync(target) || (fs.statSync(target).isDirectory() && !fs.existsSync(path.join(target, "index.html"))))
      missing.push(`${toPosix(path.relative(DIST, fromFile))} -> ${ref}`);
  };
  for (const { rel, html } of pages) {
    for (const m of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) checkRef(m[1], path.join(DIST, rel));
  }
  const cssOut = path.join(DIST, "assets", "css", "style.css");
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) checkRef(m[1], cssOut);
  if (missing.length) throw new Error("Broken local references:\n  " + missing.join("\n  "));

  if (!quiet) {
    console.log(`Built ${pages.length} page(s) into dist/ in ${Date.now() - started} ms`);
  }
  return { pages: pages.length };
}

// run directly: `node scripts/build.mjs`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (err) {
    console.error("\nBuild failed:", err.message);
    process.exit(1);
  }
}
