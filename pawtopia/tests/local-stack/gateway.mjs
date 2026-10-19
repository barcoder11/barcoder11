// Minimal stand-in for Supabase's API gateway (Kong) on :54321.
// /auth/v1/* -> GoTrue :9999, /rest/v1/* -> PostgREST :54330, /storage/v1/* -> storage :5000
import http from "node:http";

// GATEWAY_LOG=1 prints one line per request (useful for counting queries per page).
// GATEWAY_DELAY_MS=20 adds latency to every request, like the network hop from
// Vercel to Supabase, so sequential queries (waterfalls) show up in timings.
const logRequests = process.env.GATEWAY_LOG === "1";
const delayMs = Number(process.env.GATEWAY_DELAY_MS ?? 0);

const routes = [
  ["/auth/v1", 9999],
  ["/rest/v1", 54330],
  ["/storage/v1", 5000],
];

http
  .createServer((req, res) => {
    // Like Supabase's gateway: allow browser calls from any origin (auth is via headers, not cookies).
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, X-Total-Count");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const match = routes.find(([prefix]) => req.url.startsWith(prefix));
    if (!match) {
      res.writeHead(404).end("no route");
      return;
    }
    const [prefix, port] = match;
    if (logRequests) console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    if (delayMs > 0) req.pause();
    const headers = { ...req.headers };
    // Kong forwards the apikey as the bearer token when no user token is sent.
    if (!headers.authorization && headers.apikey) {
      headers.authorization = `Bearer ${headers.apikey}`;
    }
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port,
        path: req.url.slice(prefix.length) || "/",
        method: req.method,
        headers: { ...headers, host: `127.0.0.1:${port}` },
      },
      (up) => {
        const headers = { ...up.headers };
        for (const h of Object.keys(headers)) if (h.toLowerCase().startsWith("access-control-")) delete headers[h];
        res.writeHead(up.statusCode ?? 502, headers);
        up.pipe(res);
      },
    );
    upstream.on("error", (err) => {
      res.writeHead(502).end(String(err));
    });
    if (delayMs > 0) setTimeout(() => req.pipe(upstream), delayMs);
    else req.pipe(upstream);
  })
  .listen(54321, "127.0.0.1");

console.log("gateway: :54321");
