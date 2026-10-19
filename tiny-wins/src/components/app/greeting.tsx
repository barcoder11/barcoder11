"use client";

import { useSyncExternalStore } from "react";

function greet(timezone: string) {
  let h = 12;
  try {
    h = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  } catch {
    h = new Date().getHours();
  }
  if (h < 5) return "Hi, night owl";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const noop = () => () => {};

export function Greeting({ name, timezone }: { name: string; timezone: string }) {
  const hello = useSyncExternalStore(noop, () => greet(timezone), () => "Hi");
  return (
    <>
      {hello}, {name}!
    </>
  );
}
