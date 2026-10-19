import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tiny Wins: Pip's Treehouse",
    short_name: "Tiny Wins",
    description: "Big dreams. Small steps. One acorn at a time.",
    start_url: "/home",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#397A69",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
