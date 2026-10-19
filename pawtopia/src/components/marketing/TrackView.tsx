"use client";
import { useEffect } from "react";

type EventName = "rescue_landing_viewed" | "animal_page_viewed" | "adoption_cta_clicked" | "signup_started";

export function track(event: EventName, data: { rescueSlug?: string; animalSlug?: string } = {}) {
  const params = new URLSearchParams(window.location.search);
  const body = JSON.stringify({
    event,
    rescue_slug: data.rescueSlug ?? null,
    animal_slug: data.animalSlug ?? null,
    utm: {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      content: params.get("utm_content"),
    },
  });
  // keepalive lets the request finish even if the user navigates away.
  return fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
    () => undefined,
  );
}

/** Fires one page-view event per page load (server dedupes per visitor per day). */
export function TrackView({ event, rescueSlug, animalSlug }: { event: EventName; rescueSlug?: string; animalSlug?: string }) {
  useEffect(() => {
    track(event, { rescueSlug, animalSlug });
  }, [event, rescueSlug, animalSlug]);
  return null;
}
