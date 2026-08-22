import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Sora } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AdForge — URL in, on-brand ads out",
  description:
    "Paste a product URL and get on-brand short-form video ads, written around what real customers praise.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${display.variable} ${sans.variable} ${mono.variable}`}
      >
        <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
