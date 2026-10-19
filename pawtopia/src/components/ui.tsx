import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "honey" | "ghost" | "light" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-cream hover:bg-forest-600",
  honey: "bg-honey text-ink hover:bg-honey-600",
  ghost: "bg-transparent text-forest hover:bg-sage shadow-none",
  light: "bg-white text-ink hover:bg-cream-200 ring-1 ring-ink/10",
  danger: "bg-terracotta text-cream hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "min-h-14 px-8 py-3 text-lg leading-tight text-center",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  const shadow = variant === "ghost" ? "" : "btn-3d";
  return `inline-flex select-none items-center justify-center gap-2 rounded-full font-display font-semibold tracking-wide ${shadow} ${variants[variant]} ${sizes[size]} disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className = "", children, ...props }: ComponentProps<"div">) {
  return (
    <div className={`rounded-[1.75rem] bg-white/90 p-5 shadow-soft ring-1 ring-ink/5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-bold text-forest-700 ${className}`}
    >
      {children}
    </span>
  );
}

export function Label({
  children,
  htmlFor,
  className = "",
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`mb-1.5 block text-sm font-bold text-ink ${className}`}>
      {children}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-2xl border-2 border-sage-200 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-sage text-forest-700",
    success: "bg-[#E3F4E3] text-[#235B2E]",
    warning: "bg-[#FCEFD6] text-[#7A4B12]",
    error: "bg-[#FBE3DC] text-[#8A2E17]",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Required on every rescue / character / adoption page. */
export function FictionDisclosure({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-2xl bg-honey/25 px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-honey/60 ${compact ? "text-xs" : ""} ${className}`}
      data-testid="fiction-disclosure"
    >
      <span aria-hidden="true">✨</span>
      <span>
        Fictional AI-generated rescue story — Virtual adoption only. No real animals are adopted, and nothing here is a
        donation.
      </span>
    </p>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-bold text-forest ${className}`}>
      <PawIcon className="h-8 w-8" />
      Pawtopia
    </span>
  );
}

function PawIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#2F6B58" />
      <ellipse cx="24" cy="30" rx="9" ry="7.5" fill="#FFF8EC" />
      <circle cx="14.5" cy="21" r="3.6" fill="#EDBC78" />
      <circle cx="20" cy="15" r="3.6" fill="#EDBC78" />
      <circle cx="28" cy="15" r="3.6" fill="#EDBC78" />
      <circle cx="33.5" cy="21" r="3.6" fill="#EDBC78" />
    </svg>
  );
}

export function AcornIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3c-1 0-1.5.6-1.6 1.6C6.8 5 4 7 4 10h16c0-3-2.8-5-6.4-5.4C13.5 3.6 13 3 12 3z" fill="#7E4A33" />
      <path d="M5 10h14c0 6-3.2 11-7 11S5 16 5 10z" fill="#D9A35B" />
      <path
        d="M8 12c0 3 1.2 6 3 7"
        stroke="#FFF3D6"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="mb-1 text-sm font-extrabold uppercase tracking-widest text-terracotta">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {children && <p className="mt-2 max-w-2xl text-ink-soft">{children}</p>}
    </div>
  );
}
