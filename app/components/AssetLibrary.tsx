"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * The asset collection area — shared by the onboarding wizard and /assets.
 * Files go straight into Convex file storage (generateUploadUrl → POST →
 * save), so the pipeline trains on this library instead of re-scraping the
 * product page on every run.
 */

const KINDS = [
  { value: "product", label: "Product shots", hint: "trains the LoRA" },
  { value: "logo", label: "Logo", hint: "brand mark" },
  { value: "other", label: "Other", hint: "anything on-brand" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetLibrary() {
  const assets = useQuery(api.assets.list) ?? [];
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.save);
  const removeAsset = useMutation(api.assets.remove);

  const [kind, setKind] = useState<Kind>("product");
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      setError("Drop image files (png, jpg, webp…)");
      return;
    }
    setError(null);
    setUploading((n) => n + images.length);
    for (const file of images) {
      try {
        const postUrl = await generateUploadUrl();
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`upload failed (${res.status})`);
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        await saveAsset({ storageId, filename: file.name, kind });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const productCount = assets.filter((a) => a.kind === "product").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase transition-colors ${
              kind === k.value
                ? "bg-ink text-mint"
                : "bg-surface text-muted hover:text-ink"
            }`}
          >
            {k.label}
          </button>
        ))}
        <span className="ml-auto font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
          {productCount} product shot{productCount === 1 ? "" : "s"} ·{" "}
          {assets.length} total
        </span>
      </div>

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-coral bg-coral/5"
            : "border-hairline bg-surface hover:border-coral/60"
        }`}
      >
        <span className="font-display text-base font-semibold">
          {uploading > 0
            ? `Uploading ${uploading}…`
            : "Drop images here, or click to browse"}
        </span>
        <span className="text-xs text-muted">
          Saved as{" "}
          <span className="font-semibold text-ink">
            {KINDS.find((k) => k.value === kind)?.label.toLowerCase()}
          </span>{" "}
          — {KINDS.find((k) => k.value === kind)?.hint}. 4+ clean product shots
          make the best LoRA.
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </button>

      {error && (
        <p className="font-display text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <div
              key={asset._id}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface"
            >
              <div className="aspect-square bg-canvas">
                {asset.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {asset.filename}
                  </p>
                  <p className="text-[10px] text-muted uppercase">
                    {asset.kind} · {formatSize(asset.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAsset({ id: asset._id })}
                  aria-label={`Remove ${asset.filename}`}
                  className="rounded-full bg-ink px-2 py-0.5 font-display text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
