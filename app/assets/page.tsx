"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppShell from "../components/AppShell";
import AssetLibrary from "../components/AssetLibrary";
import { useSessionGate } from "../components/useSessionGate";

/**
 * The standing asset collection area. Everything uploaded here persists in
 * Convex storage and is what /forge trains the brand LoRA on — no more
 * hot-loading images off the product page on every run.
 */

export default function AssetsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, convexReady } = useSessionGate();
  const brand = useQuery(api.brands.get, convexReady ? {} : "skip");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return <AppShell quiet>{null}</AppShell>;

  return (
    <AppShell status="Library">
      <header className="rise mb-8 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          {brand?.name ?? "Brand assets"}
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          Your asset library.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          These are stored, not scraped. Product shots here train the brand
          LoRA on every forge run
          {brand?.tone ? (
            <>
              {" "}
              — tone on file: <span className="text-ink">{brand.tone}</span>
            </>
          ) : null}
          .{" "}
          <Link
            href="/onboarding"
            className="font-semibold text-coral hover:underline"
          >
            Edit brand details →
          </Link>
        </p>
      </header>

      <section className="rise max-w-4xl" style={{ animationDelay: "120ms" }}>
        <AssetLibrary />
      </section>
    </AppShell>
  );
}
