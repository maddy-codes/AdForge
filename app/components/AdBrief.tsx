"use client";

import {
  BRIEF_QUESTIONS,
  type AdBrief,
  type BriefField,
  type BriefMode,
} from "@/lib/brief";

export default function AdBriefForm({
  mode,
  value,
  onChange,
  disabled,
}: {
  mode: BriefMode;
  value: AdBrief;
  onChange: (next: AdBrief) => void;
  disabled?: boolean;
}) {
  const questions = BRIEF_QUESTIONS[mode];

  function toggle(id: BriefField, chip: string) {
    onChange({
      ...value,
      [id]: value[id] === chip ? undefined : chip,
    });
  }

  return (
    <div className="rise rounded-[24px] border border-hairline bg-surface px-4 py-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
          Optional · skip anything
        </p>
        <p className="text-[11px] text-muted">
          Blank fields stay inferred from the page.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-medium text-ink">{q.prompt}</p>
            <div className="flex flex-wrap gap-1.5">
              {q.chips.map((chip) => {
                const on = value[q.id] === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(q.id, chip)}
                    className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase transition-colors disabled:opacity-40 ${
                      on
                        ? "bg-ink text-mint"
                        : "bg-canvas text-muted hover:text-ink"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink">
            Anything else we should know?
          </span>
          <textarea
            value={value.note ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...value,
                note: e.target.value.slice(0, 280) || undefined,
              })
            }
            rows={2}
            maxLength={280}
            placeholder="e.g. don’t show water, we’re launching in the UK first…"
            className="w-full resize-none rounded-2xl bg-canvas px-3 py-2.5 text-sm outline-none placeholder:text-muted/50 disabled:opacity-40"
          />
        </label>
      </div>
    </div>
  );
}
