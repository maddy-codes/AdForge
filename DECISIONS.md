# AdForge — Locked Decisions

Resolved via grilling session. These supersede `AdForge-PRD-and-Plan.md` where they conflict.
Team is **2 people (Taran + Jatin)** — the PRD's 5-role hour-by-hour plan does not apply.

---

## D1 — Demo product

**Glow Recipe — Watermelon Glow Niacinamide Dew Drops**
`https://www.glowrecipe.com/products/watermelon-glow-niacinamide-dew-drops`

Chosen for: distinct pastel palette (strong LoRA signal), 377+ reviews (rich Tavily hooks),
emotionally charged category. Three backups ranked in `demo-product-candidates.csv`
(Death Wish Coffee, Frank Body, Homesick) — all viable, one product ships.

## D2 — Asset sourcing: fully automated, no manual pre-download

`extract()` gains `imageUrls: string[]`. Tavily Extract with `include_images: true`
handles **both** page text (for GLiNER2) and product images (for LoRA training).
Single provider — no Firecrawl, no cheerio, no sixth vendor.

## D3 — LoRA timing: async in code, pre-cached for demo

- **In code (B):** training kicks off immediately on URL submit; videos generate via
  style-prompting while it trains; output swaps to LoRA when ready.
- **For the demo (C):** demo product's LoRA pre-trained at boot, cached to disk, hot.
- Cache key: hash of product URL.

## D4 — GLiNER2: synthetic distillation, timeboxed

Scrape ~150 product pages, label once with OpenAI, LoRA fine-tune `fastino/gliner2-base-v1`
via Pioneer. Narrative: *"GPT labeled the data once; we replaced it permanently with a
205M model that runs on CPU."* Produces the benchmark slide (latency / cost / accuracy)
that wins the side challenge.

**Hard gate 15:00.** Not converging → ship zero-shot schema-driven GLiNER2. Fallback stands
ready from the start; the fine-tune is never on the critical path.

## D5 — Scrape layer: Tavily only

Tavily Extract for text + images, Tavily Search for reviews. One dependency, and it
strengthens the partner-tech story.

## D6 — fal architecture: image LoRA → image-to-video (two-stage)

1. `fal-ai/flux-lora-fast-training` on product images (minutes, mature path)
2. `fal-ai/flux-lora` generates on-brand keyframes
3. Top-tier i2v (Kling 2.5 Turbo Pro) animates each keyframe

**Rejected:** Wan video-LoRA direct (`fal-ai/wan-trainer`) — slowest, riskiest thing
available, and lower quality than Kling/Veo.

Brand identity lives in the *frame*, not the motion. Bonus: the before/after toggle is
sharper on a still keyframe, where the LoRA difference is unmistakable.
External contract `render(shots, loraId)` is unchanged — two stages are internal.

## D7 — Time budget: progressive streaming, honest claim

Real budget is **2–4 minutes**, not 60 seconds. i2v is the entire cost.

- Cards stream in as each concept finishes; first video lands ~45s.
- Pitch claim changes to **"minutes, not weeks"** — defensible under Q&A.
- A visibly working pipeline is better theatre than a spinner, and reads as
  technical complexity to a jury.

**Killed:** the "under a minute" claim. A stopwatch that fails live loses more points
than a modest claim ever wins.

## D8 — Scope cuts (unconditional)

- **h computer-use agent — CUT.** Not "if time." Gone. Never scored.
- **4 concepts → 3.** Saves 25% render time and cost. Invisible to judges.
- **LoRA — protected.** The moat and the $1,000 fal challenge. Never cut.

## D9 — Build order

Wire the **entire mocked pipeline end-to-end first**. With two people, integration is the
risk, not any single component. Then swap mocks for real APIs in descending judging value:

1. **fal LoRA + render** — the moat, $1,000 challenge
2. **Tavily** — partner requirement + review hooks
3. **OpenAI concepts** — Taran, parallel
4. **GLiNER2 fine-tune** — last; the only piece with a working fallback

Running out of day costs you the smallest prize, not the demo.

---

## Open items (not decisions — actions)

- [ ] **Merge `.gitignore` to `main` now.** No `.gitignore` existed; one `git add .`
      commits every key to a public repo.
- [ ] **Fix `.env`** — currently `TAVILY_API_KEY=` (empty) plus one orphaned bare value
      on line 2 with no variable name. Nothing can read it.
- [ ] **Claim missing keys:** `OPENAI_API_KEY`, `FAL_KEY`, `PIONEER_API_KEY`
      (fal promo `techeuropexfal-london`, Tavily promo `AugustLondon`)
- [ ] Scaffold Next.js app — no `package.json` exists yet
