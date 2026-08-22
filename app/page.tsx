"use client";

import { useState } from "react";
import PipelineSteps from "./components/PipelineSteps";
import AdCard from "./components/AdCard";
import { DEMO_URL } from "@/lib/stages/extract";
import type {
  Concept,
  PipelineEvent,
  ProductFacts,
  RenderResult,
  ReviewHook,
  Stage,
  StageStatus,
} from "@/lib/types";

type Card = { index: number; concept: Concept; result: RenderResult };

export default function Home() {
  const [url, setUrl] = useState(DEMO_URL);
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Partial<Record<Stage, StageStatus>>>(
    {}
  );
  const [details, setDetails] = useState<Partial<Record<Stage, string>>>({});
  const [facts, setFacts] = useState<ProductFacts | null>(null);
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
        setFacts(event.facts);
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
    setFacts(null);
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">
          Ad<span className="text-melon">Forge</span>
        </h1>
        <p className="mt-2 max-w-xl text-white/50">
          Paste a product URL. Get on-brand short-form ads written around what
          real customers actually praise. Minutes, not weeks.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="https://…"
          className="flex-1 rounded-xl border border-white/10 bg-ink-soft px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-melon/60"
        />
        <button
          onClick={run}
          disabled={running || !url}
          className="rounded-xl bg-melon px-6 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
        >
          {running ? "Forging…" : "Generate ads"}
        </button>
      </div>

      <section className="mt-8">
        <PipelineSteps statuses={statuses} details={details} />
      </section>

      {error && (
        <p className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {(facts || hooks.length > 0) && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {facts && (
            <div className="rounded-2xl border border-white/10 bg-ink-soft p-5">
              <h2 className="text-xs tracking-wider text-white/40 uppercase">
                Extracted — GLiNER2
              </h2>
              <p className="mt-2 font-medium">
                {facts.name}{" "}
                <span className="text-white/40">· {facts.price}</span>
              </p>
              <p className="mt-1 text-xs text-white/40">{facts.category}</p>
              <ul className="mt-3 space-y-1 text-sm text-white/55">
                {facts.features.slice(0, 3).map((f, i) => (
                  <li key={i}>· {f}</li>
                ))}
              </ul>
            </div>
          )}
          {hooks.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-ink-soft p-5">
              <h2 className="text-xs tracking-wider text-white/40 uppercase">
                Real review hooks — Tavily
              </h2>
              <ul className="mt-3 space-y-2.5">
                {hooks.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-white/70">“{h.quote}”</span>
                    <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-[10px] tracking-wide text-white/45 uppercase">
                      {h.theme}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {cards.length > 0 ? `${cards.length} ads` : "Ads"}
          </h2>
          {elapsed !== null && (
            <span className="text-xs text-white/40">
              {(elapsed / 1000).toFixed(1)}s end to end
            </span>
          )}
        </div>

        {cards.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-[9/16] rounded-2xl border border-dashed border-white/10 bg-ink-soft/40"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <AdCard
                key={c.index}
                index={c.index}
                concept={c.concept}
                result={c.result}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
