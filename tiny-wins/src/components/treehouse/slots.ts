import type { RoomSlot } from "@/lib/game/types";

export type Box = { x: number; y: number; w: number; h: number };

/**
 * Where each decoration sits in the 400x500 treehouse scene. Every item is
 * drawn inside its slot's box, so a future 3D or illustrated version only
 * needs new art with the same boxes.
 */
export const SLOT_BOXES: Record<RoomSlot, Box> = {
  wallpaper: { x: 60, y: 150, w: 280, h: 196 },
  floor: { x: 60, y: 342, w: 280, h: 58 },
  lights: { x: 64, y: 152, w: 272, h: 40 },
  window: { x: 104, y: 182, w: 84, h: 84 },
  wall_art: { x: 250, y: 186, w: 58, h: 58 },
  shelf: { x: 226, y: 254, w: 100, h: 42 },
  bed: { x: 70, y: 300, w: 120, h: 88 },
  rug: { x: 148, y: 362, w: 156, h: 32 },
  desk: { x: 262, y: 300, w: 74, h: 88 },
  lamp: { x: 300, y: 296, w: 28, h: 36 },
  plant_left: { x: 62, y: 330, w: 34, h: 64 },
  plant_right: { x: 344, y: 354, w: 40, h: 52 },
};

/** Lamp stands on the desk when there is one, otherwise on the floor. */
export const LAMP_ON_FLOOR: Box = { x: 304, y: 352, w: 28, h: 36 };

/** Back-to-front drawing order inside the room. */
export const SLOT_ORDER: RoomSlot[] = [
  "wallpaper",
  "floor",
  "window",
  "wall_art",
  "shelf",
  "rug",
  "bed",
  "desk",
  "lamp",
  "plant_left",
  "lights",
  "plant_right",
];

export const SLOT_LABELS: Record<RoomSlot, string> = {
  wallpaper: "Walls",
  floor: "Floor",
  lights: "Ceiling lights",
  window: "Window",
  wall_art: "Wall art",
  shelf: "Shelf",
  bed: "Bed",
  rug: "Rug",
  desk: "Desk",
  lamp: "Lamp",
  plant_left: "Corner plant",
  plant_right: "Porch plant",
};
