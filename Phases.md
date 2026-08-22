# AdForge — Phase-by-Phase Implementation Plan

Reflects actual repo state as of 2026-08-22, cross-checked against `AdForge-PRD-and-Plan.md`
(§9 hour-by-hour plan) and `DECISIONS.md` (D9 build order, which supersedes the PRD's
5-role plan — team is Taran + Jatin).

Status key: ✅ done · 🟡 partial · ⬜ not started

---

## Phase 0 — Setup & scaffolding

**Maps to:** PRD §9 "10:00–11:00 Setup & freeze", DECISIONS open items.

| Subtask | Status |
|---|---|
| Next.js + Tailwind app scaffolded | ✅ |
| `.gitignore` covering keys/build output | ✅ (present, worktrees ignored per commit `fbce256`) |
| Interface contract agreed (`extract/reviews/concepts/render`) | ✅ — `lib/types.ts` |
| Demo product locked (D1 — Glow Recipe Watermelon Dew Drops) | ✅ |
| `.env.local` scaffolded with 4 key names | ✅ file exists |
| **Keys actually populated** (`OPENAI_API_KEY`, `FAL_KEY`, `TAVILY_API_KEY`, `PIONEER_API_KEY`) | ✅ all 4 set in `.env.local` |

**Blocking:** none. All 4 keys are in place — Phase 2 (fal) is unblocked.

---

## Phase 1 — Mocked pipeline, end to end (D9 step 0: "wire the whole thing first")

**Maps to:** PRD §9 Sprint 1–2, DECISIONS D9 opening line.

| Subtask | Status |
|---|---|
| `extract()` with `getMockFacts()` fallback | ✅ `lib/stages/extract.ts` |
| `reviews()` with `getMockReviews()` fallback | ✅ `lib/stages/reviews.ts` |
| `concepts()` with `getMockConcepts()` fallback (3 concepts per D8) | ✅ `lib/stages/concepts.ts` |
| `render()` with `getMockRender()` fallback + staggered streaming (D7) | ✅ `lib/stages/render.ts` |
| `trainLora()` with disk cache + mock id fallback (D3) | ✅ `lib/stages/lora.ts` |
| Orchestrator route streaming NDJSON pipeline events | ✅ `app/api/generate/route.ts` |
| LoRA kicked off async, non-blocking, "hot or fall back to style-prompt" logic | ✅ (lora starts before reviews/concepts, raced against render) |
| Frontend: URL input, pipeline step indicators, streaming consumption | ✅ `app/page.tsx`, `PipelineSteps.tsx` |
| Frontend: video gallery cards | ✅ `AdCard.tsx` |
| Mock assets (SVG keyframes, MP4 stand-ins) | ✅ `public/mock/*`, generated via `scripts/gen-mock-assets.mjs` |

**This phase is functionally complete.** A judge could click "Generate ads" right now and
watch the full mocked flow end to end, streamed, with the before/after asset pairs in place.

---

## Phase 2 — fal: LoRA + render (D9 step 1 — the moat, protected, never cut)

**Maps to:** PRD "G — Gen-media lead" track; DECISIONS D3 + D6.

| Subtask | Status |
|---|---|
| `fal-ai/flux-lora-fast-training` call in `trainLora()` | ✅ real call wired, gated on `FAL_KEY` — `lib/stages/lora.ts` |
| `fal-ai/flux-lora` keyframe generation (with LoRA) | ✅ `lib/stages/render.ts:generateKeyframe` |
| Generic (no-LoRA) keyframe generation for before/after toggle | ✅ same fn called with `loraId: null`, run in parallel |
| Kling 2.5 Turbo Pro image-to-video animation step | ✅ `lib/stages/render.ts:animateKeyframe` |
| Wire real `FAL_KEY`, confirm cache-key-by-URL still holds under real training | ✅ key set, cache guards against pre-key `mock-lora://` entries |
| Pre-train demo product's LoRA at boot, cache to disk (D3-C) | 🟡 cache + real train call both exist; still no explicit boot-time trigger — first live run trains cold |
| Before/after toggle in `AdCard.tsx` reading `keyframeUrl` vs `genericKeyframeUrl` | 🟡 not yet re-verified in UI this pass — check `AdCard.tsx` |

**This is the critical path — code complete.** Remaining: boot-time pre-train trigger, and
confirm the before/after toggle live once a real run is tested end to end.

---

## Phase 3 — Tavily: extract + reviews (D9 step 2 — partner requirement + review hooks)

**Maps to:** PRD "M — ML/extraction lead" track; DECISIONS D2, D5.

| Subtask | Status |
|---|---|
| Tavily Extract for page text + `imageUrls` (feeds LoRA training) | ✅ `lib/tavily.ts:extractPage`, wired in `lib/stages/extract.ts` — real product photos now flow into `trainLora()`. Structured fields (name/price/features/materials/category/tone) still mocked pending GLiNER2 (Phase 5) |
| Tavily Search for review crawl | ✅ `lib/tavily.ts:tavilySearch`, wired in `lib/stages/reviews.ts` |
| Dedupe / theme-cluster into `{quote, theme}` hooks | ✅ heuristic sentence-extraction + keyword theme bucketing in `reviews.ts:extractHooks` — no LLM yet, upgrade candidate once Phase 4 (OpenAI) lands |
| Wire real `TAVILY_API_KEY` (promo `AugustLondon` for 8k top-up — confirm claimed) | ✅ key set |

**Phase 3 code complete.** Not yet tested against a live run (Phase 7). `tsc --noEmit` passes.

---

## Phase 4 — OpenAI: creative director (D9 step 3)

**Maps to:** PRD "O — Orchestrator/backend" track (creative-director prompts specifically
owned by Taran per `AdForge_Team_Role_Division.md`).

| Subtask | Status |
|---|---|
| Structured-output call turning `facts + hooks` into 3 concepts | ⬜ `TODO(O)` in `lib/stages/concepts.ts:61` |
| Enforce verbatim review-quote inclusion in scripts (the whole point of the Tavily stage) | ⬜ not started |
| Wire real `OPENAI_API_KEY` | ⬜ blocked on key |

---

## Phase 5 — GLiNER2 fine-tune via Pioneer (D9 step 4 — last, has a working fallback)

**Maps to:** PRD "M — ML/extraction lead"; DECISIONS D4.

| Subtask | Status |
|---|---|
| Scrape ~150 product pages for synthetic training data | ⬜ not started |
| Label once with OpenAI | ⬜ not started |
| Fine-tune `fastino/gliner2-base-v1` via Pioneer | ⬜ not started |
| Benchmark vs plain LLM call (latency/cost/accuracy slide for the side-challenge story) | ⬜ not started |
| Zero-shot schema-driven GLiNER2 fallback if fine-tune doesn't converge by the 15:00 gate | ⬜ not started (currently `extract()` just returns mock, no GLiNER2 call of any kind yet) |
| Wire real `PIONEER_API_KEY` | ⬜ blocked on key |

**Correctly last per D9** — it has the only pure fallback (mock data) that costs nothing if
skipped entirely; time pressure should sacrifice this before Phase 2–4.

---

## Phase 6 — Extra: Convex auth + saved runs (not in original PRD scope)

Added post-scaffold (commit `4b30258`). Explicitly optional per its own code comment —
never gates the core demo, which must work fully signed-out.

| Subtask | Status |
|---|---|
| `convex/schema.ts` — `generations` table, indexed by user | ✅ |
| `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts` | ✅ |
| `generations.save` / `list` / `remove` mutations/query | ✅ |
| `AuthWidget.tsx` + wired into `AppShell` | ✅ |
| `/auth` email+password (+ guest) and `/runs` history | ✅ |
| `saveGeneration` fire-and-forget call after each forge run | ✅ |
| Decide: keep as demo bonus ("look, it persists your runs") or cut if it risks stage time | ⬜ decision not yet made — recommend keep only if Phase 2–5 finish early; it's real but not judged |

---

## Phase 7 — Integration checkpoints & hardening

**Maps to:** PRD §9 "15:00–16:00 Integration checkpoint 1" and "16:00–17:30 Sprint 3".

| Subtask | Status |
|---|---|
| First full mocked dry-run, timed | ✅ (Phase 1 complete, this is doable today) |
| First full **real** dry-run once Phases 2–5 land | ⬜ |
| Decision gate: LoRA usable? GLiNER2 beating the LLM? Cut what's failing | ⬜ pending real integration |
| Pre-generate + cache hero video to disk as network-failure fallback | ⬜ — mock assets exist but the *real* hero video isn't cached yet |
| Graceful fallback to cached results if a partner API times out mid-demo | 🟡 partial — every stage already silently falls back to mock when its key is absent, but there's no timeout/error fallback for a key that's present but the API call fails live |

---

## Phase 8 — Submission

**Maps to:** PRD §9 "17:30 Feature freeze" onward; §10 pre-day checklist.

| Subtask | Status |
|---|---|
| README with setup steps from clean clone, every API/framework listed | 🟡 `README.md` exists — verify it's current once real integrations land |
| Explicit fal + Pioneer usage called out in submission form | ⬜ (submission-time task) |
| 2-min Loom | ⬜ |
| Clean-clone verification | ⬜ |
| Submit before 19:00 | ⬜ |

---

## Where we actually are, in one line

**Phases 0–3 are done.** All 4 keys are set, Phase 1 (mocked pipeline) is done, Phase 2
(fal LoRA + render) and Phase 3 (Tavily extract + reviews) are wired to real APIs.
Phase 4 (OpenAI creative director) is next, per D9's ranked build order — `concepts.ts`
still returns `getMockConcepts()` unconditionally.
