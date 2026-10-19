#!/usr/bin/env node
/**
 * Local preview: builds the site, serves dist/ and rebuilds + reloads the
 * browser whenever something in src/ or site.config.json changes.
 *
 *   npm run dev                          -> http://localhost:8080 (+ your network IP)
 *   npm run dev -- --port 3000           -> custom port
 *   npm run dev -- --host 127.0.0.1      -> this computer only
 *   (PORT / HOST environment variables work too)
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const PORT = Number(arg("port") || process.env.PORT) || 8080;
// 0.0.0.0 = reachable from other devices on the same network (phone, colleagues)
const HOST = arg("host") || process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// live reload (development only, never written to dist/)
const clients = new Set();
const RELOAD_SNIPPET =
  '<script>new EventSource("/__reload").onmessage=function(){location.reload()}</script>';

function safeBuild() {
  try {
    build({ quiet: true });
    console.log(`[${new Date().toLocaleTimeString()}] rebuilt`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] build failed: ${err.message}`);
    return false;
  }
}

safeBuild();

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url === "/__reload") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      res.write("\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    let file = path.normalize(path.join(DIST, url));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");

    let status = 200;
    if (!fs.existsSync(file)) {
      status = 404;
      file = path.join(DIST, "404.html");
    }
    const ext = path.extname(file).toLowerCase();
    let body = fs.readFileSync(file);
    if (ext === ".html") body = body.toString().replace("</body>", RELOAD_SNIPPET + "</body>");
    res.writeHead(status, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  })
  .listen(PORT, HOST, () => {
    console.log("Apex Holdings dev server:");
    console.log(`  Local:   http://localhost:${PORT}`);
    if (HOST === "0.0.0.0") {
      for (const addrs of Object.values(os.networkInterfaces())) {
        for (const a of addrs || []) {
          if (a.family === "IPv4" && !a.internal) console.log(`  Network: http://${a.address}:${PORT}`);
        }
      }
    } else if (HOST !== "localhost" && HOST !== "127.0.0.1") {
      console.log(`  Network: http://${HOST}:${PORT}`);
    }
  })
  .on("error", (err) => {
    console.error(err.code === "EADDRINUSE" ? `Port ${PORT} is already in use. Try: npm run dev -- --port 3000` : err.message);
    process.exit(1);
  });

let timer;
const onChange = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (safeBuild()) clients.forEach((c) => c.write("data: reload\n\n"));
  }, 150);
};
fs.watch(path.join(ROOT, "src"), { recursive: true }, onChange);
fs.watch(path.join(ROOT, "site.config.json"), onChange);
