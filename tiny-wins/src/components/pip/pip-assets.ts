/**
 * Pip's artwork registry — the ONE place to swap in official art.
 *
 * To use the official character: drop files into /public/pip (PNG, WebP or
 * SVG, ideally transparent and about 960x1120 / the same 6:7 ratio) and
 * update the paths below. Nothing else in the app needs to change.
 */
export type PipPose = "idle" | "happy" | "cheer" | "wave" | "sleepy";

export const PIP_ASSETS: Record<PipPose, { src: string; alt: string }> = {
  idle: { src: "/pip/pip-idle.svg", alt: "Pip the squirrel in his teal hoodie" },
  happy: { src: "/pip/pip-happy.svg", alt: "Pip smiling happily" },
  cheer: { src: "/pip/pip-cheer.svg", alt: "Pip cheering with both arms up" },
  wave: { src: "/pip/pip-wave.svg", alt: "Pip waving hello" },
  sleepy: { src: "/pip/pip-sleepy.svg", alt: "Pip napping" },
};

/** Width / height of the artwork. */
export const PIP_ASPECT = 240 / 280;

export const PIP_LINES = [
  "One acorn at a time!",
  "Tiny steps still move you forward.",
  "I believe in you. Like, a LOT.",
  "Wanna do one small thing together?",
  "Our treehouse is getting so cozy!",
  "Big dreams. Small steps.",
  "Even squirrels need breaks. You're doing great.",
  "Every win counts. Even the tiny ones!",
];
