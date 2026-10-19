// Content-Security-Policy for HTML responses (see Next.js "Content Security Policy" guide).
// Scripts: only Next.js' own scripts carrying this request's nonce ('strict-dynamic' lets
// them load their chunks). Styles: 'unsafe-inline' is needed for React `style` attributes
// (decoration positions etc.) — a nonce in style-src would disable it, so none is used there.
// Network: only this site and the Supabase project (auth, storage uploads, media).

export function buildCsp(opts: { nonce: string; supabaseUrl?: string; dev?: boolean; https?: boolean }) {
  let supabase = "";
  try {
    supabase = opts.supabaseUrl ? new URL(opts.supabaseUrl).origin : "";
  } catch {
    supabase = "";
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${opts.nonce}'`, "'strict-dynamic'", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase],
    "media-src": ["'self'", "blob:", supabase],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabase],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.filter(Boolean).join(" ")}`);
  if (opts.https) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Fresh unpredictable nonce for each request. */
export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
