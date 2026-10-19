import type { NextConfig } from "next";

// Uploaded art is served from Supabase Storage and resized per device by Next's
// image optimizer. The project URL is inlined at build time anyway, so the
// allowed host is derived from it here.
const storage = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Nearly every page depends on the visitor's session, so we use the classic
  // dynamic rendering model instead of Cache Components. Personalised
  // responses are additionally marked `private, no-store` in src/proxy.ts.
  cacheComponents: false,
  poweredByHeader: false,
  images: {
    remotePatterns: storage
      ? [
          {
            protocol: storage.protocol === "http:" ? "http" : "https",
            hostname: storage.hostname,
            port: storage.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    qualities: [75],
    // Every upload gets a new path and files never change in place.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // Art is limited to 10 MB on upload.
    maximumResponseBody: 12_000_000,
    // Only the local dev/CI stack serves Storage from a loopback address.
    dangerouslyAllowLocalIP: storage?.hostname === "127.0.0.1" || storage?.hostname === "localhost",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
