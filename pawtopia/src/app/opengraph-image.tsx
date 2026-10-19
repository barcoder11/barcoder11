import { animalCard, OG_SIZE } from "@/lib/og";

export const alt = "Pawtopia — Every rescue deserves a new beginning";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return animalCard({
    animal: {
      name: "Pawtopia",
      species: "",
      placeholder_style: "raccoon",
      colors: {},
      tagline: "Adopt the animals from our fictional rescue stories and build their cozy forest sanctuary.",
    },
    eyebrow: "Every rescue deserves a new beginning",
    cta: "Play free",
  });
}
