// Local SMTP catcher for the Docker-free stack (SMTP on :54325, HTTP on :54324).
// It speaks the small subset of the Mailpit HTTP API that the E2E tests use, so
// the same tests also run against `supabase start`, which ships Mailpit:
//   GET    /api/v1/search?query=to:"a@b.c"  -> { messages_count, messages: [summary] }, newest first
//   GET    /api/v1/message/:id              -> { ID, Subject, To, Text, HTML }
//   DELETE /api/v1/messages                 -> empties the mailbox
// GoTrue loads custom email templates over HTTP, so supabase/templates/* is served too.
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const templatesDir = path.resolve(import.meta.dirname, "../../supabase/templates");

/** Stored newest first, like Mailpit returns them. */
const messages = [];

const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((mail) => {
        messages.unshift({
          ID: crypto.randomUUID(),
          Subject: mail.subject ?? "",
          To: (mail.to?.value ?? []).map((v) => ({ Name: v.name ?? "", Address: v.address ?? "" })),
          Created: new Date().toISOString(),
          Text: mail.text ?? "",
          HTML: typeof mail.html === "string" ? mail.html : "",
        });
        callback();
      })
      .catch(callback);
  },
});
smtp.listen(54325, "127.0.0.1");

const summary = ({ ID, Subject, To, Created }) => ({ ID, Subject, To, Created });

/** Supports the `to:"address"` filter; any other query lists everything. */
function search(query) {
  const to = /^to:"?([^"\s]+)"?$/i.exec(query.trim())?.[1]?.toLowerCase();
  return to ? messages.filter((m) => m.To.some((r) => r.Address.toLowerCase().includes(to))) : messages;
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname.startsWith("/templates/")) {
      const file = path.join(templatesDir, path.basename(url.pathname));
      if (!fs.existsSync(file)) return res.writeHead(404).end();
      return res.writeHead(200, { "content-type": "text/html" }).end(fs.readFileSync(file));
    }
    if (req.method === "GET" && url.pathname === "/api/v1/search") {
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const found = search(url.searchParams.get("query") ?? "");
      return json(res, 200, { messages_count: found.length, messages: found.slice(0, limit).map(summary) });
    }
    const id = /^\/api\/v1\/message\/([\w-]+)$/.exec(url.pathname)?.[1];
    if (req.method === "GET" && id) {
      const message = messages.find((m) => m.ID === id);
      return message ? json(res, 200, message) : json(res, 404, { error: "not found" });
    }
    if (req.method === "DELETE" && url.pathname === "/api/v1/messages") {
      messages.length = 0;
      return json(res, 200, {});
    }
    json(res, 404, { error: "not found" });
  })
  .listen(54324, "127.0.0.1");

console.log("mail sink: smtp :54325, api :54324");
