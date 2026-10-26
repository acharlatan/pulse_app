// Local-only production test harness. These endpoints are never part of the Worker or dist.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.env.PULSE_DIST || "dist");
let version = 1;
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/test/update" && req.method === "POST") {
        version++;
        res.end(String(version));
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        res.writeHead(url.pathname === "/api/ai/status" ? 200 : 503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          JSON.stringify({
            available: false,
            message: "AI is not configured.",
          }),
        );
        return;
      }
      const assetPath = url.pathname.startsWith("/pulse_app/")
        ? url.pathname.slice("/pulse_app".length)
        : url.pathname;
      const name = path.resolve(
        root,
        "." + decodeURIComponent(assetPath === "/" ? "/index.html" : assetPath),
      );
      if (!name.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let body;
      try {
        body = await fs.readFile(name);
      } catch {
        if (path.extname(name)) {
          res.writeHead(404);
          res.end("missing asset");
          return;
        }
        body = await fs.readFile(path.join(root, "index.html"));
      }
      res.setHeader("Content-Type", types[path.extname(name)] || "text/html");
      res.setHeader("Cache-Control", "no-cache");
      if (assetPath === "/sw.js")
        body = Buffer.concat([
          body,
          Buffer.from(`\n// controlled-release-${version}\n`),
        ]);
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end("test server error");
    }
  })
  .listen(4174, "127.0.0.1");
