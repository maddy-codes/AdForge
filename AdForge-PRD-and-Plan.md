# AdForge — PRD & Hackathon Build Plan
### {Tech: Europe} × VEED Hackathon · London

> **Working name:** AdForge *(rename on the day if something better lands — "Reelforge", "AdSmith", etc.)*
> **One-liner:** Paste a product URL, get a set of on-brand short-form video ads in under a minute.
> **Status:** Pre-event planning doc. Freeze scope by 11:00 on the day.

---

## 1. The pitch in one breath

A plumber, a Shopify store, or any small trade business has zero chance of producing brand-consistent video ads — they can't afford a studio and generic AI tools produce off-brand slop. AdForge takes a live product page and, in under a minute, returns three to four scroll-stopping short-form video ads that match the brand's look and are written around what real customers actually praise.

**Demo shape:** URL in → finished ads out, live, on stage. That's the whole thing.

---

## 2. Why this wins *this* hackathon

The judging is creativity + technical complexity, with bonus points for partner-tech use, plus two side challenges with real money. This build is engineered backwards from those criteria.

| Requirement | How AdForge satisfies it |
|---|---|
| **Newly created at event** | Built fresh on the day. No Corea code, no prior repo. Boilerplate scaffolding only. |
| **Min. 3 partner technologies** | Uses **5**: fal, Pioneer (Fastino), Tavily, OpenAI, and h (stretch). |
| **fal side challenge ($1,000)** — gen-media must be the *main* feature; bonus for advanced use (LoRA/workflow) | Gen-media *is* the product. A **per-brand LoRA** trained on the day is the headline differentiator and hits "advanced" directly. |
| **Pioneer side challenge (€500)** — fine-tune a small model to replace a general-purpose LLM call; bonus for GLiNER2 | The product-attribute **extractor is a fine-tuned GLiNER2 model** replacing a frontier LLM call. Pitched exactly as asked. |
| **Creativity / wow factor** | Live URL → on-brand video in 60s is a genuine jaw-drop when the brand match is tight. |
| **Domain conviction (5-min final)** | Jatin lives this problem (digital marketing for Midlands trade businesses). The pain is pitched from lived experience, not invented. |

**The single differentiator to protect above all else:** the **brand LoRA**. Without it this collapses into the tenth generic "AI ad generator" of the day. The LoRA plus live-review personalisation are the entire moat. Everything else is hardcodeable.

---

## 3. Target user

- Primary: small/solo e-commerce and trade businesses (Shopify sellers, local traders) with no creative budget.
- Secondary: performance marketers who need to spin up creative variants fast.

Not building for: agencies, enterprise brand teams, anyone who'd want fine-grained manual editing. That's post-hackathon scope.

---

## 4. Core user flow

1. User pastes a product/landing-page URL.
2. **Extract** — GLiNER2 (fine-tuned) pulls structured fields: product name, price, key features, materials, category, tone signals.
3. **Listen** — Tavily crawls live reviews/mentions and surfaces the top things customers actually praise (the hooks).
4. **Brand-match** — pull the product's own images; train/apply a fal LoRA so generated frames look on-brand.
5. **Direct** — OpenAI acts as creative director: writes 3–4 ad concepts (hook, script, shot list) grounded in the extracted facts + real review sentiment.
6. **Generate** — fal produces the short-form video(s) from the shot list, styled by the brand LoRA.
7. **Deliver** — user sees 3–4 finished videos in a clean gallery. *(Stretch: h computer-use agent loads one straight into an ad manager.)*

---

## 5. Feature scope

### Must-have (the demo dies without these)
- URL input → working extraction (GLiNER2).
- Tavily review pull feeding at least one ad's hook.
- fal brand LoRA applied to generated frames.
- At least **one** genuinely on-brand finished video, start to finish, reliably.
- Clean single-screen UI: URL in at top, video gallery below.

### Should-have (strong but cuttable)
- 3–4 ad variants rather than one.
- OpenAI-written concepts visibly grounded in real review quotes.
- A "before/after" toggle showing generic vs brand-LoRA output — this *sells the differentiator* to the jury.

### Stretch (only if ahead of schedule)
- **h computer-use agent** auto-loading creative into Meta/TikTok Ads Manager as the closing beat. High wow, high risk — treat as entirely optional and cut without hesitation.

### Explicitly NOT building
- Accounts, auth, persistence, payments, multi-product handling, editing tools, mobile. One product, one run, hardcode the rest.

---

## 6. Architecture (keep it boring)

```
[ Next.js single page ]
        │  URL
        ▼
[ Orchestrator API route ]
        ├──► GLiNER2 extractor (Pioneer)      → structured product fields
        ├──► Tavily API                        → real review hooks
        ├──► fal: LoRA train (once) + gen      → on-brand frames/video
        └──► OpenAI                            → concept + script + shot list
        ▼
[ Gallery UI ]  ←── finished videos
        └──► (stretch) h agent → ad manager
```

- **Frontend:** Next.js + Tailwind, one page. Looks matter for the demo — spend real time here.
- **Backend:** one orchestrator route chaining the calls. Keep everything server-side; never expose keys.
- **The pipeline runs on ONE pre-chosen product.** Pre-download its images and cache the LoRA if training is slow. Live-typing the URL is theatre; the heavy lifting can be warmed up.

**Interface contract to agree at 11:00 so tracks build in parallel:**
```
extract(url)        -> { name, price, features[], materials[], category, tone }
reviews(url|name)   -> { hooks[]: {quote, theme} }
concepts(facts, hooks) -> [ { hook, script, shots[] } ]
render(shots, loraId)  -> { videoUrl }
```
Mock every one of these with hardcoded JSON from minute one so nobody is blocked waiting on anyone.

---

## 7. Risks & pre-committed decisions

| Risk | Mitigation / decision gate |
|---|---|
| LoRA training too slow / poor quality | Pre-train on the chosen product during setup hour; cache the result. If not usable **by 16:00, cut the LoRA** and fall back to strong style-prompting + reference images. Losing the LoRA weakens the fal entry but keeps a demo. |
| fal video gen unreliable / slow | Pre-generate the hero video during Sprint 3; the "live" run can play a cached result if the network dies. Have the cached MP4 on disk. |
| GLiNER2 fine-tune eats the day | Time-box to 2 hours. If it won't beat a plain LLM call by 15:00, ship a lightly-tuned/zero-shot GLiNER2 anyway — using it at all satisfies the challenge; "outperforms" is the bonus, not the bar. |
| h agent breaks the demo | It's stretch. Never let it into the critical path. Demo works fully without it. |
| Death by scope | One product. One run. Feature freeze **17:30, no exceptions.** |
| Submission panic | Dedicated owner for Loom + README from 17:30. This is half the score; teams always under-invest here. |

---

## 8. Judging-aligned demo script

**2-min Loom (pre-selection):**
1. (0:00–0:20) The pain — "brand-consistent video ads are out of reach for a small trader." Say it with conviction.
2. (0:20–0:35) Paste URL. One click.
3. (0:35–1:10) Show the pipeline surfacing *real* review hooks + on-brand frames. Name-drop the partner tech doing each step.
4. (1:10–1:45) The finished ads. **Before/after** generic-vs-LoRA toggle — this is the money shot.
5. (1:45–2:00) "Five partner techs, both side challenges, one minute end to end." Close.

**5-min live final** (if you advance): same arc, slower, plus one sentence each on the GLiNER2-replaces-LLM claim (Pioneer) and the LoRA (fal) so the side-challenge judges tick their boxes. Lead with the video, not the architecture.

**Golden rule:** open on the generated video. Never open on the tech stack.

---

## 9. Hour-by-hour plan (10:00 → 19:00)

Team of 5. Roles below; if you're fewer, collapse Frontend into Orchestration and make Pitch a shared duty.

**Roles**
- **G — Gen-media lead (fal):** LoRA + video pipeline. Strongest builder. This is the hero; guard it.
- **M — ML/extraction lead:** GLiNER2 fine-tune (Pioneer) + Tavily review crawling.
- **O — Orchestrator/backend:** the API route chaining everything, OpenAI creative-director prompts, the glue.
- **F — Frontend/demo:** the single-page UI. Must look polished.
- **P — Integrator & pitch lead:** unblocks everyone, owns README + Loom + pitch, attempts the h stretch only if free.

| Time | Everyone | G (fal) | M (extract) | O (backend) | F (frontend) | P (pitch/glue) |
|---|---|---|---|---|---|---|
| **10:00–11:00** Setup & freeze | Claim ALL credits/keys. Pick the ONE demo product now; download its images + reviews. Agree the interface contract (§6). Scaffold repo. | Start LoRA training on chosen product images (long pole — start first). | Stand up GLiNER2, define the entity schema. | Scaffold orchestrator route with **mocked** JSON for all four calls. | Scaffold single page: URL input + empty gallery. | Repo, README skeleton, keys in a shared vault. Confirm the 3-partner rule is met on paper. |
| **11:00–13:00** Sprint 1 (parallel, against mocks) | Get one fal video out of a hardcoded shot list. | First extraction pass on the demo URL. | Wire OpenAI concepts(facts,hooks). | Make the gallery render mock videos beautifully. | Wire Tavily; hand hooks to M/O. Draft pitch angle. |
| **13:00** Lunch | Grab food, keep pipelines warming. Don't stop the LoRA. | | | | | |
| **13:00–15:00** Sprint 2 (first real outputs) | Apply the trained LoRA to generated frames — first on-brand video. | Fine-tune GLiNER2; benchmark vs a plain LLM call (this is the Pioneer story). | Chain real extract → concepts. | Replace mock data with live API responses. | Assemble before/after toggle. Start README proper. |
| **15:00–16:00** Integration checkpoint 1 | **Wire the whole pipeline end-to-end**, however ugly. URL → real video must happen once. **Decision gate:** LoRA usable? GLiNER2 beating the LLM? Cut what's failing now. | | | | | P runs the first full dry-run and times it. |
| **16:00–17:30** Sprint 3 (the differentiators) | Quality pass: tighten LoRA output, pre-generate and **cache the hero video to disk**. | Personalise hooks from real reviews so ads quote genuine sentiment. | Harden the happy path; add graceful fallbacks to cached results. | Polish visuals — this is what the jury sees. | P attempts h stretch ONLY if green; else fully on submission prep. |
| **17:30** ⛔ FEATURE FREEZE | No new features. Full dry-run on the demo product, twice. | Confirm cached fallback plays if network dies. | Lock. | Lock. | Own the clock from here. |
| **17:30–18:00** Submission | | Sit with P for the video. | | | Final polish pass, then hands off. | **Record the 2-min Loom.** |
| **18:00–18:30** Finalise | Push repo. Final README: setup steps, every API/framework listed, partner-tech callouts, side-challenge confirmations (fal + Pioneer). | | | Merge, tag, verify the repo runs from a clean clone per the README. | | Fill submission form; **confirm fal + Pioneer usage explicitly** as both challenges require. |
| **18:30–19:00** Buffer & submit | **Submit before 19:00.** Opt into the competition. Breathe. Rehearse the live pitch for the 20:00 demos. | | | | | Lead rehearsal. |
| **20:00** | Live demos → 20:45 awards. | | | | | |

**Three non-negotiables baked into the plan:**
1. Start the LoRA training in the first hour — it's the longest pole.
2. Everything is mocked from minute one so no one is ever blocked.
3. Feature freeze at 17:30 and a cached hero video on disk, so a dead conference-centre network can't kill your demo.

---

## 10. Pre-day checklist

- [ ] Confirm on Discord whether reusing *any* of your own prior code counts against "newly created." Boilerplate is fine; a prior repo is not — get the boundary in writing.
- [ ] Note VEED is the **host**, not a required partner tech — route all video through **fal**.
- [ ] Have API keys/credit codes ready: OpenAI, fal (`techeuropexfal-london`), Pioneer/Fastino onboarding, Tavily (`AugustLondon` for the 8k top-up), h quickstart.
- [ ] Pick the demo product *before* you arrive if allowed — a visually rich Shopify product with plenty of reviews. Warm the whole pipeline on it.
- [ ] Skim the GLiNER2 + fal LoRA docs the night before so hour one isn't reading time.
