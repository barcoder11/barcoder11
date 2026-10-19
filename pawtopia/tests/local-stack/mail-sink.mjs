// Local SMTP catcher (like Supabase's Inbucket/Mailpit) for tests.
// SMTP on :54325, JSON API on :54324  ->  GET /messages?to=email  |  DELETE /messages
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const templatesDir = path.resolve(import.meta.dirname, "../../supabase/templates");

const messages = [];

const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((mail) => {
        messages.push({
          to: (mail.to?.value ?? []).map((v) => v.address?.toLowerCase()),
          from: mail.from?.text,
          subject: mail.subject,
          text: mail.text ?? "",
          html: typeof mail.html === "string" ? mail.html : "",
          receivedAt: new Date().toISOString(),
        });
        callback();
      })
      .catch(callback);
  },
});
smtp.listen(54325, "127.0.0.1");

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    // GoTrue fetches custom email templates over HTTP.
    if (url.pathname.startsWith("/templates/")) {
      const file = path.join(templatesDir, path.basename(url.pathname));
      if (!fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader("content-type", "text/html");
      res.end(fs.readFileSync(file));
      return;
    }
    if (req.method === "DELETE") {
      messages.length = 0;
      res.end("{}");
      return;
    }
    const to = url.searchParams.get("to")?.toLowerCase();
    const list = to ? messages.filter((m) => m.to.includes(to)) : messages;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(list));
  })
  .listen(54324, "127.0.0.1");

console.log("mail sink: smtp :54325, api :54324");
