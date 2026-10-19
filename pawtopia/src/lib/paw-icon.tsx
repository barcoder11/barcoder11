import { ImageResponse } from "next/og";

/** Square PNG app icon (paw on forest green), used for home-screen installs. */
export function pawIcon(size: number) {
  const s = size / 48;
  const dot = (cx: number, cy: number) => (
    <div style={{ position: "absolute", left: (cx - 3.6) * s, top: (cy - 3.6) * s, width: 7.2 * s, height: 7.2 * s, borderRadius: 999, background: "#EDBC78" }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#2F6B58" }}>
        <div style={{ position: "absolute", left: 15 * s, top: 22.5 * s, width: 18 * s, height: 15 * s, borderRadius: 999, background: "#FFF8EC" }} />
        {dot(14.5, 21)}
        {dot(20, 15)}
        {dot(28, 15)}
        {dot(33.5, 21)}
      </div>
    ),
    { width: size, height: size },
  );
}
