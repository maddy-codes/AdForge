"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthWidget from "./AuthWidget";

export const MODES = [
  {
    href: "/forge",
    label: "Brand films",
    kicker: "fal · LoRA",
    blurb: "Paste a URL. Three on-brand short-form films, with a generic vs LoRA wipe.",
    tint: "bg-coral text-white",
  },
  {
    href: "/intel",
    label: "Competitor formulas",
    kicker: "Tavily · OpenAI",
    blurb: "See who else in the category went viral. Reverse-engineer the shape into a prompt you can shoot.",
    tint: "bg-mint text-ink",
  },
  {
    href: "/avatar",
    label: "Avatar spots",
    kicker: "VEED",
    blurb: "A talking-head spokesperson tailored to the brand — VO, captions, music bed.",
    tint: "bg-lilac text-ink",
  },
] as const;

export default function AppShell({
  children,
  status = "Ready",
}: {
  children: React.ReactNode;
  status?: string;
}) {
  const path = usePathname();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="orb orb-coral float-a top-[-8%] left-[-8%] h-[28rem] w-[28rem] opacity-80" />
        <span className="orb orb-mint float-b top-[8%] right-[-6%] h-[22rem] w-[22rem] opacity-90" />
        <span className="orb orb-lilac float-c right-[18%] bottom-[-10%] h-[26rem] w-[26rem] opacity-75" />
        <span className="orb orb-coral float-b top-[48%] left-[8%] h-40 w-40 opacity-50" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pt-6 pb-16">
        <nav className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            AdForge
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-coral" />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {MODES.map((m) => {
              const on = path === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase ${
                    on
                      ? "bg-ink text-mint"
                      : "bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {m.label}
                </Link>
              );
            })}
            <span className="rounded-full bg-ink px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
              {status}
            </span>
            <AuthWidget />
          </div>
        </nav>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="mt-20 flex flex-col items-center gap-2 pt-6 text-center">
          <p className="font-display text-[12px] font-semibold tracking-wide text-muted uppercase">
            Pioneer · Tavily · fal · OpenAI · VEED
          </p>
          <p className="text-[11px] tracking-wide text-muted/70 uppercase">
            {"{Tech: Europe}"} × VEED Hackathon — London
          </p>
        </footer>
      </div>
    </div>
  );
}
