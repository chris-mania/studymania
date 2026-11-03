// Local test server: runs the Worker in plain Node with a SQLite file standing in for D1.
// Run: node --experimental-sqlite --no-warnings scripts/dev-server.mjs   (then open http://localhost:8787)
// For real deploys use `npx wrangler dev` / `npx wrangler deploy` instead.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dbFile = process.env.DB_FILE || path.join(root, ".local.sqlite");
const db = new DatabaseSync(dbFile);
if (!process.env.SKIP_SCHEMA) db.exec(fs.readFileSync(path.join(root, "schema.sql"), "utf8")); // the app also sets this up itself

// Tiny D1-compatible wrapper
function stmt(sql, args = []) {
  const s = {
    bind: (...a) => stmt(sql, a),
    first: async () => { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
    _run: () => db.prepare(sql).run(...args),
  };
  return s;
}
const DB = {
  prepare: (sql) => stmt(sql),
  batch: async (list) => { db.exec("BEGIN"); try { list.forEach((s) => s._run()); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } return []; },
};

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };
const ASSETS = {
  fetch: async (req) => {
    const u = new URL(req.url);
    let p = path.join(root, "public", decodeURIComponent(u.pathname));
    if (!p.startsWith(path.join(root, "public"))) return new Response("no", { status: 403 });
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "public", "index.html");
    return new Response(fs.readFileSync(p), { headers: { "content-type": types[path.extname(p)] || "application/octet-stream" } });
  },
};
const env = { DB, ASSETS, VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "", VAPID_PRIVATE_JWK: process.env.VAPID_PRIVATE_JWK || "" };

const port = +(process.env.PORT || 8787);
http.createServer(async (nreq, nres) => {
  const chunks = [];
  for await (const c of nreq) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const req = new Request(`http://localhost:${port}${nreq.url}`, {
    method: nreq.method, headers: nreq.headers, body: ["GET", "HEAD"].includes(nreq.method) ? undefined : body,
  });
  const res = await worker.fetch(req, env, { waitUntil() {} });
  const headers = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  nres.writeHead(res.status, headers);
  nres.end(Buffer.from(await res.arrayBuffer()));
}).listen(port, () => console.log(`Study Mania running at http://localhost:${port}`));
