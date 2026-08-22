"use client";

import type { Stage, StageStatus } from "@/lib/types";

const STEPS: { stage: Stage; label: string; partner: string }[] = [
  { stage: "extract", label: "Extract", partner: "Pioneer · GLiNER2" },
  { stage: "reviews", label: "Listen", partner: "Tavily" },
  { stage: "lora", label: "Brand-match", partner: "fal · LoRA" },
  { stage: "concepts", label: "Direct", partner: "OpenAI" },
  { stage: "render", label: "Generate", partner: "fal · pack + Kling + VEED" },
];

export default function PipelineSteps({
  statuses,
  details,
  elapsed,
}: {
  statuses: Partial<Record<Stage, StageStatus>>;
  details: Partial<Record<Stage, string>>;
  elapsed?: number | null;
}) {
  return (
    <div className="relative rounded-[28px] border border-hairline bg-surface p-2.5 shadow-[0_16px_40px_-28px_rgb(17_17_17/0.35)]">
      {elapsed != null && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] tracking-widest text-mint uppercase tabular-nums">
          {(elapsed / 1000).toFixed(1)}s
        </span>
      )}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map(({ stage, label, partner }) => {
          const status = statuses[stage] ?? "pending";
          return (
            <li
              key={stage}
              className={`flex min-h-[4.75rem] flex-col justify-between rounded-2xl px-3 py-2.5 ${
                status === "running"
                  ? "bg-coral text-white"
                  : status === "done"
                    ? "bg-mint text-ink"
                    : "bg-canvas text-muted"
              }`}
            >
              <p className="font-display text-sm leading-none font-semibold tracking-tight">
                {label}
              </p>
              <p className="mt-1 truncate font-mono text-[9px] leading-none tracking-[0.1em] uppercase opacity-70">
                {partner}
              </p>
              <p className="mt-2 truncate text-[11px] leading-none font-medium">
                {details[stage] ?? "\u00a0"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
