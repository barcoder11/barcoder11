import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pawtopia",
    short_name: "Pawtopia",
    description: "A cozy virtual animal sanctuary. Every rescue deserves a new beginning.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#FFF8EC",
    theme_color: "#2F6B58",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
