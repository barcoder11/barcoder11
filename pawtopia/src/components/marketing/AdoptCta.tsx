"use client";
import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { track } from "./TrackView";

/** Primary "Virtually adopt X — Free" button; records the CTA click before navigating. */
export function AdoptCta({
  href,
  label,
  rescueSlug,
  animalSlug,
  className = "",
}: {
  href: string;
  label: string;
  rescueSlug?: string;
  animalSlug?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        track("adoption_cta_clicked", { rescueSlug, animalSlug });
      }}
      className={buttonClass("primary", "lg", `w-full sm:w-auto ${className}`)}
      data-testid="adopt-cta"
    >
      <span aria-hidden="true">🐾</span> {label}
    </Link>
  );
}
