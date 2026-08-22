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
  pending: "bg-white/15",
  running: "bg-melon pulse-ring",
  done: "bg-mint",
  failed: "bg-red-400",
  skipped: "bg-white/25",
};

export default function PipelineSteps({
  statuses,
  details,
}: {
  statuses: Partial<Record<Stage, StageStatus>>;
  details: Partial<Record<Stage, string>>;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {STEPS.map(({ stage, label, partner }) => {
        const status = statuses[stage] ?? "pending";
        return (
          <li
            key={stage}
            className={`rounded-xl border border-white/10 bg-ink-soft/70 p-4 transition-opacity ${
              status === "pending" ? "opacity-45" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[status]}`} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-2 text-[11px] tracking-wide text-white/40 uppercase">
              {partner}
            </p>
            {details[stage] && (
              <p className="mt-1 truncate text-xs text-mint/80">
                {details[stage]}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
