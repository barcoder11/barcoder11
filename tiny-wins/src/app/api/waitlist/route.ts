import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendWaitlistConfirmation } from "@/lib/waitlist/email";
import { createToken, hashIp } from "@/lib/waitlist/tokens";
import { verifyTurnstile } from "@/lib/waitlist/turnstile";
import { isDisposableEmail, looksLikeBot, waitlistRequestSchema } from "@/lib/waitlist/validation";

type JoinState = { state: "created" | "pending" | "confirmed"; should_send: boolean };

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return json(503, { ok: false, error: "The waitlist isn't connected yet. Please try again soon!" });
  }
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    return json(503, { ok: false, error: "Email confirmations aren't set up yet. Please try again soon!" });
  }

  // Only accept same-site form posts.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return json(403, { ok: false, error: "Not allowed." });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid request." });
  }
  const parsed = waitlistRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your email." });
  }
  const data = parsed.data;

  // Bots get a normal-looking response but nothing is stored.
  if (looksLikeBot(data)) {
    return json(200, { ok: true, state: "pending" });
  }
  if (isDisposableEmail(data.email)) {
    return json(400, { ok: false, error: "Please use a permanent email address so we can reach you at launch." });
  }

  const ip = clientIp(req);
  const ipHash = ip ? hashIp(ip) : null;

  const limits: [string, number, number][] = [
    [`waitlist:email:${data.email}`, 4, 3600],
    ...(ipHash
      ? ([
          [`waitlist:ip:${ipHash}`, 6, 600],
          [`waitlist:ip-day:${ipHash}`, 30, 86400],
        ] as [string, number, number][])
      : []),
  ];
  for (const [bucket, limit, windowSeconds] of limits) {
    const { data: allowed, error } = await admin.rpc("hit_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[waitlist] rate limit error", error.message);
      return json(500, { ok: false, error: "Something went wrong. Please try again." });
    }
    if (!allowed) {
      return json(429, { ok: false, error: "Whoa, that's a lot of tries! Please wait a few minutes." });
    }
  }

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return json(400, { ok: false, error: "Please complete the quick human check." });
  }

  const { token, hash } = createToken();
  const { data: joined, error } = await admin.rpc("waitlist_join", {
    p_email: data.email,
    p_token_hash: hash,
    p_source: data.source ?? null,
    p_referrer: data.referrer ?? null,
    p_ip_hash: ipHash,
  });
  if (error || !joined) {
    console.error("[waitlist] join error", error?.message);
    return json(500, { ok: false, error: "Something went wrong. Please try again." });
  }
  const result = joined as JoinState;

  let devConfirmUrl: string | undefined;
  if (result.should_send) {
    try {
      const sent = await sendWaitlistConfirmation(data.email, token);
      devConfirmUrl = sent.devUrl;
    } catch (e) {
      console.error("[waitlist] email error", e instanceof Error ? e.message : e);
      return json(502, { ok: false, error: "We couldn't send your confirmation email. Please try again in a few minutes." });
    }
  }

  return json(200, {
    ok: true,
    state: result.state === "confirmed" ? "confirmed" : "pending",
    ...(devConfirmUrl && process.env.NODE_ENV !== "production" ? { devConfirmUrl } : {}),
  });
}
