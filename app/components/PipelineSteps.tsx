"use client";

import type { Stage, StageStatus } from "@/lib/types";

const STEPS: { stage: Stage; label: string; partner: string }[] = [
  { stage: "extract", label: "Extract", partner: "Pioneer · GLiNER2" },
  { stage: "reviews", label: "Listen", partner: "Tavily" },
  { stage: "lora", label: "Brand-match", partner: "fal · LoRA" },
  { stage: "concepts", label: "Direct", partner: "OpenAI" },
  { stage: "render", label: "Generate", partner: "fal · Kling i2v" },
];

const DOT: Record<StageStatus, string> = {
  pending: "bg-hairline",
  running: "bg-tungsten pulse-ring",
  done: "bg-tungsten",
  failed: "bg-danger",
  skipped: "bg-muted/40",
};

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
    <div className="flex items-end gap-4">
      <ol className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {STEPS.map(({ stage, label, partner }, i) => {
          const status = statuses[stage] ?? "pending";
          const idle = status === "pending";
          return (
            <li key={stage} className="flex min-w-0 flex-1 items-center">
              {i > 0 && (
                <span
                  className="mx-1 h-px min-w-3 flex-1 bg-hairline"
                  aria-hidden
                />
              )}
              <div
                className={`flex min-w-0 flex-col items-start px-1 transition-opacity ${
                  idle ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`}
                  />
                  <span className="text-sm whitespace-nowrap">{label}</span>
                </div>
                <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
                  {partner}
                </p>
                {details[stage] && (
                  <p className="max-w-full truncate font-mono text-[11px] text-tungsten">
                    {details[stage]}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {elapsed != null && (
        <span className="mb-0.5 shrink-0 font-mono text-[11px] tracking-widest text-muted uppercase">
          {(elapsed / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}
