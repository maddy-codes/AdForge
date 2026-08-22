import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdForge — URL in, on-brand ads out",
  description:
    "Paste a product URL and get on-brand short-form video ads, written around what real customers praise.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
