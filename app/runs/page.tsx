"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppShell from "../components/AppShell";
import { useRunSession } from "../components/useRunSession";
import { runHref, runLabel } from "@/lib/runSession";

export default function RunsPage() {
  return (
    <AppShell status="History">
      <header className="rise mb-10 max-w-xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          All runs
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          What you’ve forged.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          Live and finished runs stay here. Leave a page mid-run — it keeps
          going. Open one to re-attach.
        </p>
      </header>

      <RunList />
    </AppShell>
  );
}

function RunList() {
  const sessionId = useRunSession();
  const history = useQuery(api.jobs.history, { sessionId });

  if (history === undefined) {
    return (
      <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
        Loading…
      </p>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rise max-w-md rounded-[28px] border border-hairline bg-surface p-6">
        <p className="font-display text-lg font-semibold tracking-tight">
          No runs yet.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Start a brand film, intel, or avatar spot. It’ll show up here even
          if you navigate away.
        </p>
        <Link
          href="/forge"
          className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 font-display text-[12px] font-semibold tracking-wide text-mint uppercase"
        >
          Open forge
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex max-w-2xl flex-col gap-3">
      {history.map((row, i) => {
        const seconds =
          row.finishedAt !== undefined
            ? `${((row.finishedAt - row.startedAt) / 1000).toFixed(1)}s`
            : null;
        const when = new Date(row.startedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const href = runHref(row.kind, row._id);
        return (
          <li
            key={row._id}
            className="rise flex flex-col gap-3 rounded-[24px] border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight">
                {row.productName || "Untitled run"}
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-muted">
                {row.url}
              </p>
              <p className="mt-2 font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
                {runLabel(row.kind)} · {row.status}
                {` · ${when}`}
                {seconds ? ` · ${seconds}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={href}
                className="rounded-full bg-ink px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-mint uppercase"
              >
                {row.status === "running" ? "Re-attach" : "Open"}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
