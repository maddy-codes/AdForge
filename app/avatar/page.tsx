"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import AdBriefForm from "../components/AdBrief";
import { emptyBrief, parseBrief, type AdBrief } from "@/lib/brief";
import { DEMO_URL } from "@/lib/stages/extract";
import type { AvatarSpot } from "@/lib/stages/avatar";

export default function AvatarPage() {
  const [url, setUrl] = useState(DEMO_URL);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spot, setSpot] = useState<AvatarSpot | null>(null);
  const [brief, setBrief] = useState<AdBrief>(emptyBrief);

  async function run() {
    setRunning(true);
    setError(null);
    setSpot(null);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, brief: parseBrief(brief) }),
      });
      const data = (await res.json()) as AvatarSpot & { error?: string };
      if (!res.ok) throw new Error(data.error || "avatar failed");
      setSpot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell status={running ? "Casting" : "Ready"}>
      <header className="rise mb-10 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Avatar spots · VEED
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          A spokesperson who looks like{" "}
          <span className="-rotate-1 inline-block rounded-[1.25rem] bg-lilac px-2 py-0.5">
            the brand
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Separate from the LoRA product films. We write the avatar, VO,
          captions, and music bed for VEED to render — host-sponsor path,
          talking-head energy.
        </p>
      </header>

      <div className="flex flex-col gap-2 rounded-[28px] border border-hairline bg-surface p-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="https://your-product-page…"
          spellCheck={false}
          className="flex-1 rounded-2xl bg-canvas px-4 py-3.5 font-mono text-sm outline-none placeholder:text-muted/50"
        />
        <button
          onClick={run}
          disabled={running || !url}
          className="cta-pop rounded-2xl bg-coral px-8 py-3.5 font-display text-base font-bold text-white transition-transform disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {running ? "Writing brief…" : "Cast avatar"}
        </button>
      </div>

      <div className="mt-3">
        <AdBriefForm
          mode="avatar"
          value={brief}
          onChange={setBrief}
          disabled={running}
        />
      </div>

      {error && (
        <p className="mt-6 font-display text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {spot && (
        <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="phone-lift mx-auto w-full max-w-[280px] rounded-[36px] border border-white bg-surface p-2.5">
            <div className="relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-[28px] bg-ink p-5">
              <span className="absolute top-2.5 left-1/2 h-5 w-[72px] -translate-x-1/2 rounded-full bg-black/90" />
              <span className="absolute top-3 left-3 rounded-full bg-lilac px-2 py-0.5 font-display text-[10px] font-bold text-ink">
                VEED
              </span>
              <p className="font-display text-lg leading-snug font-semibold text-white">
                {spot.brand}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                {spot.avatarLook}
              </p>
            </div>
            <p className="mt-2 rounded-full bg-canvas py-2 text-center font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
              Avatar brief
            </p>
          </div>

          <div className="space-y-5">
            <Block label="Voiceover" body={spot.vo} />
            <Block label="Director script" body={spot.script} />
            <Block label="Music bed" body={spot.musicBed} />
            <Block label="Captions" body={spot.captions} />
            <p className="text-sm text-muted">
              Render this in VEED (host). Product films stay on{" "}
              <Link href="/forge" className="underline decoration-hairline hover:text-ink">
                Brand films
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-hairline bg-surface p-5">
      <p className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
