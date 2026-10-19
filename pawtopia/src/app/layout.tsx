import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/SetupNotice";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Pawtopia — Every rescue deserves a new beginning", template: "%s · Pawtopia" },
  description:
    "A cozy virtual animal sanctuary game. Meet the characters from our fictional AI-generated rescue stories, virtually adopt them, and build their forest home.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { siteName: "Pawtopia", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#2F6B58",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh antialiased">{isSupabaseConfigured() ? children : <SetupNotice />}</body>
    </html>
  );
}
