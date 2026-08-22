"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import AppShell from "../components/AppShell";
import AdBriefForm from "../components/AdBrief";
import RunRail from "../components/RunRail";
import { useRunSession } from "../components/useRunSession";
import { emptyBrief, parseBrief, type AdBrief } from "@/lib/brief";
import { ensureRunSession } from "@/lib/runSession";
import { DEMO_URL } from "@/lib/stages/extract";
import type { StolenFormula } from "@/lib/stages/intel";

export default function IntelPage() {
  return (
    <Suspense>
      <IntelInner />
    </Suspense>
  );
}

function IntelInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = useRunSession();
  const urlJob = (params.get("job") as Id<"jobs"> | null) ?? null;
  const [url, setUrl] = useState(params.get("url") || DEMO_URL);
  const [jobId, setJobId] = useState<Id<"jobs"> | null>(urlJob);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [brief, setBrief] = useState<AdBrief>(emptyBrief);

  useEffect(() => {
    setJobId(urlJob);
  }, [urlJob]);

  const snapshot = useQuery(api.jobs.watch, jobId ? { jobId } : "skip");
  const job = snapshot?.job;
  const result = job?.intel ?? null;
  const watching = job?.status === "running";
  const error = localError ?? job?.error ?? null;

  async function run() {
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          brief: parseBrief(brief),
          sessionId: sessionId ?? ensureRunSession(),
        }),
      });
      if (!res.ok) throw new Error(`kickoff failed (${res.status})`);
      const { jobId: id } = (await res.json()) as { jobId: Id<"jobs"> };
      setJobId(id);
      router.replace(`/intel?job=${id}`, { scroll: false });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPrompt(f: StolenFormula) {
    await navigator.clipboard.writeText(f.prompt);
    setCopied(f.competitor);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <AppShell status={watching || submitting ? "Crawling" : "Ready"}>
      <header className="rise mb-10 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Competitor formulas
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          See what went viral{" "}
          <span className="-rotate-1 inline-block rounded-[1.25rem] bg-mint px-2 py-0.5">
            next door
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Paste your product URL. We find rivals in the same category, pull
          ads that show up as viral, and reverse-engineer the <em>shape</em>{" "}
          into a prompt you could shoot for your product — not a clone of
          theirs.
        </p>
      </header>

      <div className="flex items-stretch gap-2 overflow-hidden rounded-[28px] border border-hairline bg-surface p-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !submitting && run()}
          placeholder="https://your-product-page…"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3 font-mono text-sm outline-none placeholder:text-muted/50"
        />
        <button
          onClick={run}
          disabled={submitting || !url}
          className="shrink-0 rounded-2xl bg-coral px-5 py-3 font-display text-sm font-bold whitespace-nowrap text-white disabled:opacity-40"
        >
          {submitting
            ? "Starting…"
            : watching
              ? "Find another"
              : "Find formulas"}
        </button>
      </div>

      <div className="mt-3">
        <AdBriefForm
          mode="intel"
          value={brief}
          onChange={setBrief}
          disabled={submitting}
        />
      </div>

      <div className="mt-5">
        <RunRail />
      </div>

      {error && (
        <p className="mt-6 font-display text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {watching && !result && (
        <p className="mt-6 font-display text-sm font-semibold text-muted">
          Reading rivals — you can leave this page, the run stays live.
        </p>
      )}

      {result && (
        <div className="mt-12 space-y-10">
          <div>
            <p className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
              Your brand
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {result.brand}
            </h2>
            <p className="text-sm text-muted">{result.category}</p>
          </div>

          <div>
            <p className="mb-3 font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
              Rivals we pulled ads from
            </p>
            <ul className="grid gap-3 sm:grid-cols-3">
              {result.rivals.map((r) => (
                <li
                  key={r.name}
                  className="rounded-2xl border border-hairline bg-surface p-4"
                >
                  <p className="inline-flex rounded-full bg-ink px-3 py-1 font-display text-sm font-semibold text-mint">
                    {r.name}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {r.angle}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {result.formulas.map((f) => (
              <article
                key={f.competitor + f.sourceTitle}
                className="phone-lift flex flex-col rounded-[28px] border border-hairline bg-surface p-5"
              >
                <p className="font-display text-[11px] font-semibold tracking-wide text-coral uppercase">
                  {f.competitor}
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
                  {f.hookType}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.whyItWorked}
                </p>
                <a
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 truncate text-xs text-muted underline decoration-hairline hover:text-ink"
                >
                  {f.sourceTitle}
                </a>
                {f.structure?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
                      The formula
                    </p>
                    <ol className="mt-2 space-y-1.5">
                      {f.structure.map((beat, i) => (
                        <li key={beat} className="flex gap-2 text-xs leading-relaxed">
                          <span className="font-display font-bold text-coral">
                            {i + 1}
                          </span>
                          <span>{beat}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <p className="mt-4 font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Prompt for your product
                </p>
                <pre className="mt-2 flex-1 overflow-auto rounded-2xl bg-canvas p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink">
                  {f.prompt}
                </pre>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void copyPrompt(f)}
                    className="rounded-full bg-ink px-4 py-2 font-display text-[11px] font-semibold tracking-wide text-mint uppercase"
                  >
                    {copied === f.competitor ? "Copied" : "Copy prompt"}
                  </button>
                  <Link
                    href={`/forge?url=${encodeURIComponent(url)}`}
                    className="rounded-full border border-hairline px-4 py-2 text-center font-display text-[11px] font-semibold tracking-wide text-muted uppercase hover:text-ink"
                  >
                    Make brand films for this URL
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
