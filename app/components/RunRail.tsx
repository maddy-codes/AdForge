"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { runHref, runLabel } from "@/lib/runSession";
import { useRunSession } from "./useRunSession";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function RunRail() {
  const sessionId = useRunSession();
  const params = useSearchParams();
  const activeId = params.get("job");
  const history = useQuery(api.jobs.history, { sessionId });

  return (
    <div className="rounded-[28px] border border-hairline bg-surface p-2.5 shadow-[0_16px_40px_-28px_rgb(17_17_17/0.35)]">
      {!history?.length ? (
        <p className="px-3 py-3 font-display text-sm text-muted">
          Other runs show up here. Start another without leaving this one.
        </p>
      ) : (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {history.slice(0, 8).map((run) => {
            const href = runHref(run.kind, run._id);
            const on = activeId === run._id;
            const title = run.productName || hostOf(run.url);
            return (
              <li key={run._id}>
                <Link
                  href={href}
                  className={`flex min-h-[4.75rem] flex-col justify-between rounded-2xl px-3 py-2.5 ${
                    on
                      ? "bg-ink text-mint"
                      : run.status === "running"
                        ? "bg-coral text-white"
                        : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  <p className="font-display text-sm leading-none font-semibold tracking-tight">
                    {runLabel(run.kind)}
                  </p>
                  <p className="mt-1 truncate font-mono text-[9px] leading-none tracking-[0.1em] uppercase opacity-70">
                    {run.status === "running" ? "live" : run.status}
                  </p>
                  <p className="mt-2 truncate text-[11px] leading-none font-medium">
                    {title}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
