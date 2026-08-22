"use client";

import Link from "next/link";
import AppShell, { MODES } from "./components/AppShell";

export default function Home() {
  return (
    <AppShell>
      <header className="rise mb-12 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Pick what you want to make
        </p>
        <h1 className="font-display text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-6xl">
          Three ways in.
          <br />
          Same product URL.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Brand films, competitor formulas, and VEED avatar spots are different
          jobs. Choose one. Don’t mash them into a single gallery.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {MODES.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className="rise phone-lift group flex flex-col rounded-[28px] border border-hairline bg-surface p-5 transition-transform hover:-translate-y-1"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span
              className={`mb-6 inline-flex w-fit rounded-full px-3 py-1 font-display text-[11px] font-semibold tracking-wide uppercase ${m.tint}`}
            >
              {m.kicker}
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {m.label}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {m.blurb}
            </p>
            <span className="mt-6 font-display text-[12px] font-semibold tracking-wide text-coral uppercase">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
