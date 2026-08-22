"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import PipelineSteps from "./components/PipelineSteps";
import AdCard from "./components/AdCard";
import AuthWidget from "./components/AuthWidget";
import { DEMO_URL } from "@/lib/stages/extract";
import type {
  Concept,
  PipelineEvent,
  RenderResult,
  ReviewHook,
  Stage,
  StageStatus,
} from "@/lib/types";

type Card = { index: number; concept: Concept; result: RenderResult };

const SLOTS = [0, 1, 2];

export default function Home() {
  const saveGeneration = useMutation(api.generations.save);
  const [url, setUrl] = useState(DEMO_URL);
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Partial<Record<Stage, StageStatus>>>(
    {}
  );
  const [details, setDetails] = useState<Partial<Record<Stage, string>>>({});
  const [hooks, setHooks] = useState<ReviewHook[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [liveMs, setLiveMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => setLiveMs(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [running]);

  function apply(event: PipelineEvent) {
    switch (event.type) {
      case "stage":
        setStatuses((s) => ({ ...s, [event.stage]: event.status }));
        if (event.detail)
          setDetails((d) => ({ ...d, [event.stage]: event.detail }));
        break;
      case "facts":
      case "concepts":
        break;
      case "hooks":
        setHooks(event.hooks);
        break;
      case "video":
        setCards((c) => [
          ...c,
          { index: event.index, concept: event.concept, result: event.result },
        ]);
        break;
      case "lora":
        setDetails((d) => ({
          ...d,
          lora: event.cached ? "cached — hot" : "trained",
        }));
        break;
      case "done":
        setElapsed(event.elapsedMs);
        break;
      case "error":
        setError(event.message);
        break;
    }
  }

  async function run() {
    setRunning(true);
    setStatuses({});
    setDetails({});
    setHooks([]);
    setCards([]);
    setElapsed(null);
    setLiveMs(0);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.body) throw new Error("no response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collected: PipelineEvent[] = [];
      let productName: string | undefined;
      let finalElapsed: number | undefined;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PipelineEvent;
          apply(event);
          collected.push(event);
          if (event.type === "facts") productName = event.facts.name;
          if (event.type === "done") finalElapsed = event.elapsedMs;
        }
      }

      // Save the run for a signed-in user; a no-op mutation when signed out
      // (see convex/generations.ts). Never blocks or gates the demo itself.
      if (finalElapsed !== undefined) {
        void saveGeneration({
          url,
          productName,
          elapsedMs: finalElapsed,
          events: collected,
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const extra = cards.filter((c) => c.index > 2);
  const cta = running ? "Forging…" : error ? "Retry" : "Forge ads";
  const timer = elapsed ?? (running ? liveMs : null);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="orb orb-coral float-a top-[-8%] left-[-8%] h-[28rem] w-[28rem] opacity-80" />
        <span className="orb orb-mint float-b top-[8%] right-[-6%] h-[22rem] w-[22rem] opacity-90" />
        <span className="orb orb-lilac float-c right-[18%] bottom-[-10%] h-[26rem] w-[26rem] opacity-75" />
        <span className="orb orb-coral float-b top-[48%] left-[8%] h-40 w-40 opacity-50" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pt-6 pb-16">
        <nav className="mb-10 flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">
            AdForge
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-coral" />
          </span>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ink px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
              {running ? "Live" : "Ready"}
            </span>
            <AuthWidget />
          </div>
        </nav>

        <header className="rise mb-10 max-w-4xl">
          <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
            URL in → three ad films out
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

        <section className="rise mt-5" style={{ animationDelay: "180ms" }}>
          <PipelineSteps
            statuses={statuses}
            details={details}
            elapsed={timer}
          />
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
              const lift =
                slot === 1 ? "lg:-translate-y-8" : "lg:translate-y-2";
              if (!card)
                return (
                  <div key={slot} className={`w-full max-w-[280px] ${lift}`}>
                    <EmptyFrame index={slot} running={running} />
                  </div>
                );
              return (
                <div
                  key={card.index}
                  className={`w-full max-w-[280px] ${lift}`}
                >
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

        <footer className="mt-20 flex flex-col items-center gap-2 pt-6 text-center">
          <p className="font-display text-[12px] font-semibold tracking-wide text-muted uppercase">
            Forged with Pioneer · Tavily · fal · OpenAI
          </p>
          <p className="text-[11px] tracking-wide text-muted/70 uppercase">
            {"{Tech: Europe}"} × VEED Hackathon — London
          </p>
        </footer>
      </main>
    </div>
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
