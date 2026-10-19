"use client";

// Last-resort boundary for failures in the root layout itself. It replaces the
// whole document, so it can't rely on the app's fonts or stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FFF8EC", color: "#183027" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 56 }} aria-hidden="true">🌧️</div>
            <h1 style={{ fontSize: 28 }}>Pawtopia is having a moment</h1>
            <p>Please try again in a few seconds. Your progress is safe.</p>
            {error.digest && <p style={{ fontSize: 12, opacity: 0.7 }}>Reference: {error.digest}</p>}
            <button
              onClick={reset}
              style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#2F6B58", color: "#FFF8EC", fontWeight: 700 }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
