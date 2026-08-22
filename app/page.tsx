"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppShell, { MODES } from "./components/AppShell";
import IntroSplash from "./components/IntroSplash";
import AuthForm from "./components/AuthForm";
import { useSessionGate } from "./components/useSessionGate";

export default function Home() {
  const router = useRouter();
  const { isLoaded, isIn, isSignedIn } = useSessionGate();
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);

  useEffect(() => {
    if (isIn) setIntro(false);
  }, [isIn]);

  // New signed-in users go through onboarding once (guests skip it — the
  // demo path stays auth-free). `undefined` means the query is still loading.
  const brand = useQuery(api.brands.get, isSignedIn ? {} : "skip");
  const needsOnboarding =
    isSignedIn && brand !== undefined && (!brand || !brand.onboardedAt);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  return (
    <>
      {intro && <IntroSplash onDone={endIntro} />}
      <AppShell quiet={intro}>
        {!intro && (
          <>
            {!isLoaded && (
              <div className="flex flex-1 items-center justify-center">
                <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
                  …
                </p>
              </div>
            )}
            {isLoaded && !isIn && (
              <div className="flex flex-1 items-center justify-center">
                <AuthForm />
              </div>
            )}
            {isLoaded && isIn && !needsOnboarding && (
              // Hold the landing back while we don't yet know if this signed-in
              // user has finished onboarding (brand === undefined → loading).
              (!isSignedIn || brand !== undefined) && <Landing />
            )}
          </>
        )}
      </AppShell>
    </>
  );
}

function Landing() {
  return (
    <>
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
    </>
  );
}
