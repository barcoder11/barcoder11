import { cn } from "@/lib/utils";

export function AcornIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-5", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M8 14 Q8 28 16 30 Q24 28 24 14 Z" fill="#C9844E" />
      <path d="M11 16 Q12 25 16 27" stroke="#E7AE76" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M5 14.5 Q6 6 16 6 Q26 6 27 14.5 Q16 17.5 5 14.5 Z" fill="#7A4D38" />
      <path d="M8 11 h16 M7 13.5 h18" stroke="#5B3726" strokeWidth="1" opacity="0.6" />
      <path d="M16 6 Q16 2 19 1.5" stroke="#5B3726" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function XpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-5", className)} aria-hidden>
      <path d="M16 2 L19.8 11 L29.5 11.6 L22 17.8 L24.4 27.4 L16 22.2 L7.6 27.4 L10 17.8 L2.5 11.6 L12.2 11 Z" fill="#F4C34D" stroke="#E0A92E" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="13" cy="12" r="2" fill="#FFF3C4" />
    </svg>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden fill="currentColor">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.59-2.59 2.59 2.59 0 0 1 3.37-2.47V9.68a5.7 5.7 0 0 0-.78-.05 5.69 5.69 0 0 0-5.69 5.69A5.69 5.69 0 0 0 9.86 21a5.69 5.69 0 0 0 5.69-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48z" />
    </svg>
  );
}
