/**
 * Local Supabase-like stack for end-to-end tests when Docker isn't available.
 *
 *   gateway  :54321  /auth/v1/*  -> GoTrue (real Supabase Auth server)
 *                    /rest/v1/*  -> a small PostgREST stand-in (below)
 *   smtp     :2500   catches auth emails; GET http://localhost:54321/__mail?to=<email>
 *
 * The REST stand-in implements only what this app uses: GET on tables with
 * simple filters/order/limit, and POST /rpc/<function>. Like PostgREST it
 * verifies the JWT and runs each request as that role with the JWT claims
 * set, so Row Level Security and grants are enforced by PostgreSQL.
 *
 * TEST INFRASTRUCTURE ONLY. Production uses a real Supabase project.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import net from "node:net";
import pg from "pg";

const DB_URL = process.env.STACK_DB_URL ?? "postgres://postgres:postgres@localhost:5432/tinywins_e2e";
const JWT_SECRET = process.env.STACK_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";
const GOTRUE = process.env.STACK_GOTRUE_URL ?? "http://127.0.0.1:9999";
const PORT = Number(process.env.STACK_PORT ?? 54321);
const SMTP_PORT = Number(process.env.STACK_SMTP_PORT ?? 2500);

const pool = new pg.Pool({ connectionString: DB_URL, max: 10 });
const mail = []; // { to: string[], raw: string, at: number }

// ---------------------------------------------------------------- JWT
function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}
function verifyJwt(token) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("bad jwt");
  const expected = createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest();
  const got = Buffer.from(s, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) throw new Error("bad signature");
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (claims.exp && claims.exp * 1000 < Date.now()) throw new Error("expired");
  return claims;
}
export function signJwt(claims) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify(claims));
  const s = createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}

// ---------------------------------------------------------------- REST
const IDENT = /^[a-z_][a-z0-9_]*$/;
const q = (id) => {
  if (!IDENT.test(id)) throw Object.assign(new Error(`invalid identifier ${id}`), { status: 400 });
  return `"${id}"`;
};
const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };

function buildFilter(col, expr, params) {
  let negate = false;
  if (expr.startsWith("not.")) {
    negate = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const val = expr.slice(dot + 1);
  let sql;
  if (op in OPS) {
    params.push(val);
    sql = `${q(col)} ${OPS[op]} $${params.length}`;
  } else if (op === "is") {
    const v = { null: "null", true: "true", false: "false" }[val];
    if (!v) throw Object.assign(new Error("bad is"), { status: 400 });
    sql = `${q(col)} is ${v}`;
  } else if (op === "in") {
    const items = val.replace(/^\(|\)$/g, "").split(",");
    params.push(items);
    sql = `${q(col)}::text = any($${params.length})`;
  } else {
    throw Object.assign(new Error(`unsupported operator ${op}`), { status: 400 });
  }
  return negate ? `not (${sql})` : sql;
}

async function withRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = ["anon", "authenticated", "service_role"].includes(claims.role) ? claims.role : "anon";
    await client.query(`set local role ${role}`);
    await client.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', $3, true)`, [
      JSON.stringify(claims),
      claims.sub ?? "",
      role,
    ]);
    const res = await fn(client);
    await client.query("commit");
    return res;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function pgErrorStatus(e, claims) {
  if (e.status) return e.status;
  if (e.code === "42501") return claims.role === "anon" ? 401 : 403;
  if (e.code === "42883" || e.code === "42P01") return 404;
  return 400;
}

async function handleRest(req, res, path, url) {
  const auth = req.headers.authorization?.replace(/^Bearer /i, "") || req.headers.apikey;
  let claims;
  try {
    claims = verifyJwt(String(auth ?? ""));
  } catch {
    return send(res, 401, { code: "PGRST301", message: "JWT invalid", details: null, hint: null });
  }

  try {
    if (req.method === "POST" && path.startsWith("rpc/")) {
      const fn = path.slice(4);
      const body = await readJson(req);
      const names = Object.keys(body);
      const params = names.map((n) => body[n]);
      const args = names.map((n, i) => `${q(n)} => $${i + 1}`).join(", ");
      const rows = await withRole(claims, (c) => c.query(`select public.${q(fn)}(${args}) as r`, params));
      return send(res, 200, rows.rows[0]?.r ?? null);
    }

    if (req.method === "GET") {
      const table = path;
      const params = [];
      const where = [];
      let select = "*";
      let order = "";
      let limit = "";
      for (const [k, v] of url.searchParams) {
        if (k === "select") {
          select = v === "*" ? "*" : v.split(",").map((c) => q(c.trim())).join(", ");
        } else if (k === "order") {
          order =
            " order by " +
            v
              .split(",")
              .map((part) => {
                const [col, dir] = part.split(".");
                return `${q(col)} ${dir === "desc" ? "desc" : "asc"}`;
              })
              .join(", ");
        } else if (k === "limit") {
          limit = ` limit ${Math.max(0, Number.parseInt(v, 10) || 0)}`;
        } else {
          where.push(buildFilter(k, v, params));
        }
      }
      const sql = `select ${select} from public.${q(table)}${where.length ? ` where ${where.join(" and ")}` : ""}${order}${limit}`;
      const result = await withRole(claims, (c) => c.query(sql, params));
      if (String(req.headers.accept ?? "").startsWith("application/vnd.pgrst.object+json")) {
        if (result.rows.length !== 1) {
          return send(res, 406, {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
            details: `The result contains ${result.rows.length} rows`,
            hint: null,
          });
        }
        return send(res, 200, result.rows[0]);
      }
      return send(res, 200, result.rows);
    }
    return send(res, 405, { message: "method not supported by test stand-in" });
  } catch (e) {
    return send(res, pgErrorStatus(e, claims), { code: e.code ?? "PGRST000", message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
  }
}

// ---------------------------------------------------------------- helpers
function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ---------------------------------------------------------------- gateway
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    });
    return res.end();
  }
  if (url.pathname === "/__mail") {
    const to = (url.searchParams.get("to") ?? "").toLowerCase();
    const found = mail.filter((m) => m.to.some((t) => t.toLowerCase().includes(to)));
    return send(res, 200, found.map((m) => ({ at: m.at, body: decodeQuotedPrintable(m.raw) })));
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    return handleRest(req, res, url.pathname.slice("/rest/v1/".length), url);
  }
  if (url.pathname.startsWith("/auth/v1/")) {
    const target = new URL(url.pathname.slice("/auth/v1".length) + url.search, GOTRUE);
    const proxied = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    });
    proxied.on("error", (e) => send(res, 502, { message: `gotrue unavailable: ${e.message}` }));
    return req.pipe(proxied);
  }
  send(res, 404, { message: "not found" });
});
server.listen(PORT, () => console.log(`[stack] gateway on http://localhost:${PORT}`));

// ---------------------------------------------------------------- smtp catcher
net
  .createServer((socket) => {
    let buffer = "";
    let inData = false;
    let rcpt = [];
    let raw = "";
    socket.write("220 localhost test smtp\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let idx;
      while ((idx = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            mail.push({ to: rcpt, raw, at: Date.now() });
            raw = "";
            rcpt = [];
            socket.write("250 OK queued\r\n");
          } else {
            raw += (line.startsWith("..") ? line.slice(1) : line) + "\r\n";
          }
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") socket.write("250-localhost\r\n250 8BITMIME\r\n");
        else if (cmd === "MAIL") socket.write("250 OK\r\n");
        else if (cmd === "RCPT") {
          rcpt.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, ""));
          socket.write("250 OK\r\n");
        } else if (cmd === "DATA") {
          inData = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (cmd === "QUIT") {
          socket.write("221 Bye\r\n");
          socket.end();
        } else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  })
  .listen(SMTP_PORT, () => console.log(`[stack] smtp on :${SMTP_PORT}`));
