import "server-only";
import { ImageResponse } from "next/og";
import { CritterSvg } from "@/components/art/Critter";
import { svgToString } from "@/lib/svg-string";
import type { Animal, AnimalAsset } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };

/** Social preview card: character art on a soft forest card with name + tagline. */
export function animalCard(opts: {
  animal: Pick<Animal, "name" | "species" | "placeholder_style" | "colors" | "tagline">;
  assets?: AnimalAsset[];
  eyebrow: string;
  cta?: string;
}) {
  const { animal } = opts;
  const art = (opts.assets ?? []).find(
    (a) => a.is_active && a.media_kind === "image" && ["cover", "idle", "avatar", "happy"].includes(a.state),
  );
  const artSrc = art
    ? art.public_url
    : `data:image/svg+xml;base64,${Buffer.from(
        svgToString(
          <CritterSvg
            uid="og"
            variant={animal.placeholder_style}
            colors={animal.colors}
            state="happy"
            title={animal.name}
          />,
        ).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560"'),
      ).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #FFF8EC 0%, #DDEDE2 60%, #C9E1D1 100%)",
        fontFamily: "sans-serif",
        color: "#183027",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 0 60px 72px",
          width: 660,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#2F6B58" }}>Pawtopia</div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 26,
            fontWeight: 700,
            color: "#A86548",
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          {opts.eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1 }}>{animal.name}</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 32, lineHeight: 1.3, color: "#3D5A4E" }}>
          {(animal.tagline ?? `Virtually adopt ${animal.name} — free.`).slice(0, 110)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 34,
            alignSelf: "flex-start",
            background: "#2F6B58",
            color: "#FFF8EC",
            fontSize: 30,
            fontWeight: 700,
            padding: "16px 30px",
            borderRadius: 999,
          }}
        >
          {opts.cta ?? `Virtually adopt ${animal.name} — Free`}
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 20, color: "#3D5A4E" }}>
          Fictional AI-generated rescue story · Virtual adoption only
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: 540, paddingBottom: 30 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artSrc} width={500} height={500} alt="" style={{ objectFit: "contain" }} />
      </div>
    </div>,
    OG_SIZE,
  );
}
