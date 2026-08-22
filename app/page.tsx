"use client";

import { useState } from "react";
import PipelineSteps from "./components/PipelineSteps";
import AdCard from "./components/AdCard";
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
  const [url, setUrl] = useState(DEMO_URL);
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Partial<Record<Stage, StageStatus>>>(
    {}
  );
  const [details, setDetails] = useState<Partial<Record<Stage, string>>>({});
  const [hooks, setHooks] = useState<ReviewHook[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) apply(JSON.parse(line) as PipelineEvent);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const extra = cards.filter((c) => c.index > 2);
  const cta = running ? "Forging…" : error ? "Retry" : "Generate ads";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-5xl tracking-tight md:text-6xl">
          Ad<span className="text-tungsten">Forge</span>
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          Paste a product URL. Get on-brand short-form ads written around what
          real customers actually praise.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="https://…"
          className="flex-1 rounded-[4px] border border-hairline bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted/50 focus:border-tungsten"
        />
        <button
          onClick={run}
          disabled={running || !url}
          className="rounded-[4px] bg-tungsten px-6 py-3 text-sm font-medium text-canvas transition-opacity disabled:opacity-40"
        >
          {cta}
        </button>
      </div>

      <section className="mt-6">
        <PipelineSteps
          statuses={statuses}
          details={details}
          elapsed={elapsed}
        />
        <p className="mt-3 font-mono text-[11px] tracking-widest text-muted uppercase">
          Pioneer · Tavily · fal · OpenAI
        </p>
      </section>

      {error && (
        <p className="mt-6 font-mono text-sm text-danger">{error}</p>
      )}

      <section className="mt-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SLOTS.map((slot) => {
            const card = cards.find((c) => c.index === slot);
            if (!card) return <EmptyFrame key={slot} />;
            return (
              <AdCard
                key={card.index}
                index={card.index}
                concept={card.concept}
                result={card.result}
                review={hooks[card.index]}
              />
            );
          })}
          {extra.map((card) => (
            <AdCard
              key={card.index}
              index={card.index}
              concept={card.concept}
              result={card.result}
              review={hooks[card.index]}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function EmptyFrame() {
  return (
    <div
      className="overflow-hidden rounded-[12px] border border-hairline bg-surface"
      aria-hidden
    >
      <div className="aspect-[9/16] bg-canvas" />
      <div className="h-11 border-t border-hairline" />
    </div>
  );
}
