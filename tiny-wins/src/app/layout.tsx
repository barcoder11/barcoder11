import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tiny Wins: Pip's Treehouse — Big dreams. Small steps.",
    template: "%s · Tiny Wins",
  },
  description:
    "Help Pip grow by doing tiny real-life quests. Earn acorns, level up, and decorate a cozy treehouse. From the Pip animated series on TikTok.",
  applicationName: "Tiny Wins",
  keywords: ["habit tracker", "self improvement", "cozy game", "Pip", "Tiny Wins", "daily quests"],
  openGraph: {
    title: "Tiny Wins: Pip's Treehouse",
    description: "Big dreams. Small steps. One acorn at a time.",
    siteName: "Tiny Wins",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiny Wins: Pip's Treehouse",
    description: "Big dreams. Small steps. One acorn at a time.",
  },
  appleWebApp: { capable: true, title: "Tiny Wins", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EA" },
    { media: "(prefers-color-scheme: dark)", color: "#111B18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
