/** Placeholder decoration illustrations, keyed by decor_catalog.art_key. */
export function DecorArt({ artKey, title, className = "" }: { artKey: string; title: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`overflow-visible ${className}`}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <ellipse cx="60" cy="112" rx="38" ry="6" fill="#183027" opacity="0.12" />
      {ART[artKey] ?? ART.generic}
    </svg>
  );
}

const ART: Record<string, React.ReactNode> = {
  blanket: (
    <g>
      <path d="M14 92 C20 74 40 70 60 72 C82 70 100 74 106 92 C100 106 80 110 60 108 C40 110 20 106 14 92 Z" fill="#E7A4A0" />
      <path d="M22 90 C32 82 46 80 60 81 C76 80 90 82 98 90" stroke="#FFF8EC" strokeWidth="3" fill="none" strokeDasharray="4 5" />
      <path d="M30 98 C44 94 76 94 90 98" stroke="#C97C78" strokeWidth="3" fill="none" />
      <circle cx="40" cy="88" r="3" fill="#FFF8EC" />
      <circle cx="80" cy="88" r="3" fill="#FFF8EC" />
    </g>
  ),
  bowl: (
    <g>
      <path d="M22 78 H98 C96 98 80 110 60 110 C40 110 24 98 22 78 Z" fill="#A86548" />
      <path d="M22 78 H98" stroke="#7E4A33" strokeWidth="4" strokeLinecap="round" />
      <circle cx="46" cy="74" r="8" fill="#5B3A8C" />
      <circle cx="60" cy="70" r="9" fill="#C0392B" />
      <circle cx="74" cy="74" r="8" fill="#5B3A8C" />
      <circle cx="58" cy="66" r="2" fill="#fff" opacity="0.7" />
      <path d="M40 92 C50 96 70 96 80 92" stroke="#C98763" strokeWidth="3" fill="none" />
    </g>
  ),
  flowers: (
    <g>
      <path d="M30 110 C34 90 34 80 36 70 M60 110 V60 M90 110 C86 92 86 82 84 72" stroke="#3E7C4F" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 100 C50 92 56 92 60 96 M76 100 C70 92 64 92 60 96" stroke="#3E7C4F" strokeWidth="4" fill="none" />
      {[[36, 64, "#FFF8EC"], [60, 52, "#8FB3E8"], [84, 66, "#FFF8EC"]].map(([x, y, col]) => (
        <g key={String(x)}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={Number(x)} cy={Number(y) - 8} rx="5" ry="8" fill={String(col)} transform={`rotate(${a} ${x} ${y})`} />
          ))}
          <circle cx={Number(x)} cy={Number(y)} r="5" fill="#EDBC78" />
        </g>
      ))}
    </g>
  ),
  ball: (
    <g>
      <circle cx="60" cy="84" r="24" fill="#E8577A" />
      <path d="M36 84 C48 72 72 72 84 84" stroke="#FFF8EC" strokeWidth="5" fill="none" />
      <path d="M40 96 C52 90 70 90 80 96" stroke="#FFF8EC" strokeWidth="4" fill="none" opacity="0.7" />
      <circle cx="50" cy="72" r="4" fill="#fff" opacity="0.6" />
    </g>
  ),
  lantern: (
    <g>
      <path d="M60 0 V22" stroke="#5E4634" strokeWidth="3" />
      <circle cx="60" cy="58" r="34" fill="#FFE08A" opacity="0.35" className="glow-pulse" />
      <path d="M44 28 H76 L72 34 H48 Z" fill="#5E4634" />
      <rect x="46" y="34" width="28" height="40" rx="8" fill="#FFD36E" stroke="#5E4634" strokeWidth="3" />
      <path d="M60 36 V72 M46 54 H74" stroke="#5E4634" strokeWidth="2" opacity="0.5" />
      <circle cx="60" cy="54" r="6" fill="#FFF3C4" />
      <path d="M48 74 H72 L68 80 H52 Z" fill="#5E4634" />
    </g>
  ),
  bunting: (
    <g>
      <path d="M0 10 C30 30 90 30 120 10" stroke="#5E4634" strokeWidth="2" fill="none" />
      {[[12, 16, "#E8A33D"], [34, 23, "#A86548"], [60, 26, "#5E9B75"], [86, 23, "#E8A33D"], [108, 16, "#A86548"]].map(([x, y, col]) => (
        <path key={String(x)} d={`M${Number(x) - 8} ${y} L${Number(x) + 8} ${y} L${x} ${Number(y) + 20} Z`} fill={String(col)} />
      ))}
    </g>
  ),
  tree: (
    <g>
      <path d="M54 112 C56 90 54 76 50 64 L70 64 C66 76 64 90 66 112 Z" fill="#7E4A33" />
      <circle cx="60" cy="44" r="30" fill="#D9663A" />
      <circle cx="38" cy="58" r="20" fill="#E8853F" />
      <circle cx="82" cy="58" r="20" fill="#C9542E" />
      <circle cx="60" cy="22" r="18" fill="#E8A33D" />
      <circle cx="50" cy="34" r="4" fill="#FFF8EC" opacity="0.4" />
    </g>
  ),
  den: (
    <g>
      <path d="M8 104 C8 66 34 46 60 46 C86 46 112 66 112 104 Z" fill="#8A5A3B" />
      <path d="M8 104 C8 66 34 46 60 46 C86 46 112 66 112 104" stroke="#6B4429" strokeWidth="4" fill="none" />
      <path d="M34 104 C34 82 46 72 60 72 C74 72 86 82 86 104 Z" fill="#3B2A25" />
      <path d="M14 76 C30 70 40 58 52 52 M66 50 C80 54 96 66 104 78" stroke="#5E9B75" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="98" r="5" fill="#E8D9B5" />
    </g>
  ),
  pond: (
    <g>
      <ellipse cx="60" cy="92" rx="54" ry="20" fill="#7FB9C9" />
      <ellipse cx="60" cy="90" rx="46" ry="15" fill="#9AD0DD" />
      <ellipse cx="40" cy="88" rx="10" ry="4" fill="#5E9B75" />
      <ellipse cx="78" cy="94" rx="9" ry="3.5" fill="#5E9B75" />
      <circle cx="80" cy="91" r="3" fill="#F2A7C3" />
      <g>
        <ellipse cx="58" cy="84" rx="7" ry="5" fill="#6FAE5A" />
        <circle cx="55" cy="80" r="2.4" fill="#fff" />
        <circle cx="61" cy="80" r="2.4" fill="#fff" />
        <circle cx="55" cy="80" r="1.2" fill="#183027" />
        <circle cx="61" cy="80" r="1.2" fill="#183027" />
      </g>
      <path d="M8 92 C6 70 10 60 14 52 M112 92 C114 72 110 62 106 54" stroke="#5E9B75" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  generic: (
    <g>
      <rect x="30" y="50" width="60" height="56" rx="12" fill="#EDBC78" />
      <path d="M30 70 H90" stroke="#A86548" strokeWidth="4" />
      <path d="M60 50 V106" stroke="#A86548" strokeWidth="4" />
    </g>
  ),
};
