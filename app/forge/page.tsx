"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import PipelineSteps from "../components/PipelineSteps";
import AdCard from "../components/AdCard";
import AdBriefForm from "../components/AdBrief";
import AppShell from "../components/AppShell";
import { emptyBrief, parseBrief, type AdBrief } from "@/lib/brief";
import { DEMO_URL } from "@/lib/stages/extract";
import type { Concept, RenderResult, Stage, StageStatus } from "@/lib/types";

type Card = { index: number; concept: Concept; result: RenderResult };

const SLOTS = [0, 1, 2];

function ForgeInner() {
  const params = useSearchParams();
  const [url, setUrl] = useState(params.get("url") || DEMO_URL);
  // Re-attach to a live run after a refresh: the job id rides the URL and
  // all state comes back through the subscription below.
  const [jobId, setJobId] = useState<Id<"jobs"> | null>(
    (params.get("job") as Id<"jobs"> | null) ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [liveMs, setLiveMs] = useState(0);
  const [brief, setBrief] = useState<AdBrief>(emptyBrief);

  const snapshot = useQuery(api.jobs.watch, jobId ? { jobId } : "skip");
  const job = snapshot?.job;
  const renders = snapshot?.renders ?? [];

  const running = submitting || job?.status === "running";
  const startedAt = job?.startedAt;

  useEffect(() => {
    if (!running || startedAt === undefined) return;
    const id = setInterval(
      () => setLiveMs(Math.max(0, Date.now() - startedAt)),
      100
    );
    return () => clearInterval(id);
  }, [running, startedAt]);

  const statuses: Partial<Record<Stage, StageStatus>> = {};
  const details: Partial<Record<Stage, string>> = {};
  if (job) {
    for (const [stage, state] of Object.entries(job.stages)) {
      statuses[stage as Stage] = state.status;
      if (state.detail) details[stage as Stage] = state.detail;
    }
  }

  const hooks = job?.hooks ?? [];
  const cards: Card[] = renders
    .filter((r) => r.status === "done" && r.videoUrl)
    .map((r) => ({
      index: r.index,
      concept: r.concept,
      result: {
        videoUrl: r.videoUrl!,
        keyframeUrl: r.keyframeUrl,
        genericKeyframeUrl: r.genericKeyframeUrl,
      },
    }));

  const error = localError ?? job?.error ?? null;
  const elapsed =
    job?.finishedAt !== undefined && job.startedAt !== undefined
      ? job.finishedAt - job.startedAt
      : null;

  async function run() {
    setSubmitting(true);
    setLocalError(null);
    setJobId(null);
    setLiveMs(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, brief: parseBrief(brief) }),
      });
      if (!res.ok) throw new Error(`kickoff failed (${res.status})`);
      const { jobId: id } = (await res.json()) as { jobId: Id<"jobs"> };
      setJobId(id);
      window.history.replaceState(null, "", `/forge?job=${id}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const extra = cards.filter((c) => c.index > 2);
  const cta = running ? "Forging…" : error ? "Retry" : "Forge ads";
  const timer = elapsed ?? (running && jobId ? liveMs : null);

  return (
    <AppShell status={running ? "Live" : "Ready"}>
      <header className="rise mb-10 max-w-4xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Brand films
        </p>
        <h1 className="font-display text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-6xl">
          Ads that look like{" "}
          <span className="-rotate-1 inline-block rounded-[1.25rem] bg-mint px-2 py-0.5">
            your brand
          </span>
          <br />
          not like AI.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Paste a product URL. We study the page, steal the quotes customers
          actually use, train a LoRA on your own shots — then drop three
          short-form films onto the stage.
        </p>
      </header>

      <div
        className="rise flex flex-col gap-2 rounded-[28px] border border-hairline bg-surface p-2 shadow-[0_20px_50px_-30px_rgb(17_17_17/0.4)] sm:flex-row"
        style={{ animationDelay: "100ms" }}
      >
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
          {cta}
        </button>
      </div>

      <div className="mt-3" style={{ animationDelay: "140ms" }}>
        <AdBriefForm
          mode="forge"
          value={brief}
          onChange={setBrief}
          disabled={running}
        />
      </div>

      <section className="rise mt-5" style={{ animationDelay: "180ms" }}>
        <PipelineSteps statuses={statuses} details={details} elapsed={timer} />
      </section>

      {error && (
        <p className="mt-6 font-display text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <section className="mt-14">
        <div className="mx-auto grid max-w-[980px] justify-items-center gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {SLOTS.map((slot) => {
            const card = cards.find((c) => c.index === slot);
            const lift = slot === 1 ? "lg:-translate-y-8" : "lg:translate-y-2";
            if (!card)
              return (
                <div key={slot} className={`w-full max-w-[280px] ${lift}`}>
                  <EmptyFrame index={slot} running={running} />
                </div>
              );
            return (
              <div key={card.index} className={`w-full max-w-[280px] ${lift}`}>
                <AdCard
                  index={card.index}
                  concept={card.concept}
                  result={card.result}
                  review={hooks[card.index]}
                />
              </div>
            );
          })}
          {extra.map((card) => (
            <div key={card.index} className="w-full max-w-[280px]">
              <AdCard
                index={card.index}
                concept={card.concept}
                result={card.result}
                review={hooks[card.index]}
              />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export default function ForgePage() {
  return (
    <Suspense>
      <ForgeInner />
    </Suspense>
  );
}

const EMPTY_GLOW = [
  "shadow-[0_24px_60px_-24px_rgb(255_77_46/0.4)]",
  "shadow-[0_24px_60px_-24px_rgb(200_245_74/0.5)]",
  "shadow-[0_24px_60px_-24px_rgb(201_183_255/0.5)]",
];

function EmptyFrame({ index, running }: { index: number; running: boolean }) {
  return (
    <div
      className={`phone-lift rounded-[36px] border border-white bg-surface p-2.5 ${EMPTY_GLOW[index]} ${
        running ? "" : "bob"
      }`}
      style={{ animationDelay: `${index * 700}ms` }}
      aria-hidden
    >
      <div
        className={`relative aspect-[9/16] overflow-hidden rounded-[28px] bg-ink ${
          running ? "shimmer" : ""
        }`}
      >
        <span className="absolute top-2.5 left-1/2 h-5 w-[72px] -translate-x-1/2 rounded-full bg-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="font-display text-4xl font-semibold text-white/15">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-display text-[10px] font-semibold tracking-wide text-white/50 uppercase">
            {running ? "Forging" : "Awaiting"}
          </span>
        </div>
      </div>
      <div className="mt-2 rounded-full bg-canvas py-2 text-center font-display text-[11px] font-semibold tracking-wide text-muted/50 uppercase">
        — · —
      </div>
    </div>
  );
}
