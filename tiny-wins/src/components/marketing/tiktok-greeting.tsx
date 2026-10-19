"use client";

import { useSyncExternalStore } from "react";
import { TikTokIcon } from "@/components/brand/icons";

function fromTikTok(): boolean {
  const params = new URLSearchParams(window.location.search);
  const src = `${params.get("utm_source") ?? ""} ${params.get("ref") ?? ""} ${document.referrer}`.toLowerCase();
  return src.includes("tiktok");
}
const noop = () => () => {};

/** A friendly hello for people who tapped the link in Pip's TikTok bio. */
export function TikTokGreeting() {
  const tiktok = useSyncExternalStore(noop, fromTikTok, () => false);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-card/80 px-3.5 py-1.5 text-sm font-bold text-forest-deep shadow-soft backdrop-blur dark:text-sage">
      {tiktok ? (
        <>
          <TikTokIcon className="size-4" /> Hey TikTok friend! Pip saved you a spot 👋
        </>
      ) : (
        <>🌰 From the Pip animated series</>
      )}
    </span>
  );
}
