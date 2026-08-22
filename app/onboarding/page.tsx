"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppShell from "../components/AppShell";
import AssetLibrary from "../components/AssetLibrary";
import { useSessionGate } from "../components/useSessionGate";

/**
 * First-run wizard for signed-in users: brand basics, then the asset
 * collection area. Finishing stamps `onboardedAt` on the brand row, which is
 * what lets the landing page stop redirecting here. Guests never see this —
 * the demo path stays friction-free.
 */

type Step = "brand" | "assets";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, convexReady } = useSessionGate();
  const brand = useQuery(api.brands.get, convexReady ? {} : "skip");
  const assets = useQuery(api.assets.list, convexReady ? {} : "skip");
  const upsert = useMutation(api.brands.upsert);
  const complete = useMutation(api.brands.completeOnboarding);

  const [step, setStep] = useState<Step>("brand");
  const [name, setName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [tone, setTone] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding is for signed-in users only; guests keep the instant demo.
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  // Prefill once from an existing row (revisits / resumed onboarding).
  useEffect(() => {
    if (prefilled || !brand) return;
    setName(brand.name);
    setProductUrl(brand.productUrl ?? "");
    setTone(brand.tone ?? "");
    setPrefilled(true);
  }, [brand, prefilled]);

  async function saveBrand() {
    setBusy(true);
    setError(null);
    try {
      await upsert({
        name: name.trim(),
        productUrl: productUrl.trim() || undefined,
        tone: tone.trim() || undefined,
      });
      setStep("assets");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await complete({});
      router.push("/forge");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!isLoaded || !isSignedIn) return <AppShell quiet>{null}</AppShell>;

  const steps: { id: Step; label: string }[] = [
    { id: "brand", label: "1 · Your brand" },
    { id: "assets", label: "2 · Your assets" },
  ];

  return (
    <AppShell status="Setup">
      <header className="rise mb-8 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Welcome to AdForge
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          Set up once.
          <br />
          Every run stays on-brand.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Tell us who you are and hand over your product shots. We store them —
          so the LoRA trains on your library instead of whatever we can scrape
          off the page each time.
        </p>
      </header>

      <div className="rise mb-6 flex gap-2" style={{ animationDelay: "80ms" }}>
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id === "brand" && setStep("brand")}
            className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase ${
              step === s.id ? "bg-ink text-mint" : "bg-surface text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <section
        className="rise max-w-3xl rounded-[28px] border border-hairline bg-surface p-6 md:p-8"
        style={{ animationDelay: "140ms" }}
      >
        {step === "brand" ? (
          <div className="flex flex-col gap-5">
            <Field label="Brand name" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Glow Recipe"
                className="w-full rounded-2xl bg-canvas px-4 py-3.5 text-sm outline-none placeholder:text-muted/50"
              />
            </Field>
            <Field label="Main product URL">
              <input
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://your-product-page…"
                spellCheck={false}
                className="w-full rounded-2xl bg-canvas px-4 py-3.5 font-mono text-sm outline-none placeholder:text-muted/50"
              />
            </Field>
            <Field label="Tone of voice">
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Playful, fresh, pastel, self-care ritual"
                className="w-full rounded-2xl bg-canvas px-4 py-3.5 text-sm outline-none placeholder:text-muted/50"
              />
            </Field>
            <button
              onClick={saveBrand}
              disabled={busy || !name.trim() || !convexReady}
              className="cta-pop mt-2 self-start rounded-2xl bg-coral px-8 py-3.5 font-display text-base font-bold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Continue →"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AssetLibrary />
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={finish}
                disabled={busy || !convexReady || (assets ?? []).length === 0}
                className="cta-pop rounded-2xl bg-coral px-8 py-3.5 font-display text-base font-bold text-white disabled:opacity-40"
              >
                {busy ? "Finishing…" : "Finish setup"}
              </button>
              <button
                onClick={finish}
                disabled={busy || !convexReady}
                className="font-display text-[12px] font-semibold tracking-wide text-muted uppercase hover:text-ink"
              >
                Skip for now — scrape the page instead
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 font-display text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </section>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
        {required && <span className="text-coral"> *</span>}
      </span>
      {children}
    </label>
  );
}
