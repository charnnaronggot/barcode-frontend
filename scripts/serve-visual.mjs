import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist/visual/browser");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403).end();
        return;
      }
      if (!path.extname(file)) file = path.join(root, "index.html");
      const data = await fs.readFile(file);
      res
        .writeHead(200, {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(data);
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(4300, "127.0.0.1");
