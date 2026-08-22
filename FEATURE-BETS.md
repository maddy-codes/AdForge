# AdForge — feature bets to win

For Taran + Jatin. Not a backlog. Ranked by what actually moves a {Tech: Europe} × VEED jury.

**Rule 0.** Do not start any of this until one Glow Recipe run has produced three real fal videos and the LoRA is cached on disk. A wider product that plays mock MP4s loses to a narrower product that shows generic vs brand LoRA.

---

## The call

| When | Build | Why |
|---|---|---|
| Now | Live fal run + cached LoRA + cached hero video | The moat. $1,000 fal challenge. The before/after wipe. |
| Now (Jatin) | Pioneer GLiNER2, even zero-shot | Side-challenge points. Extract is still mocked on name/price/features. |
| In build | **Competitor formulas** (`/intel`) | Own page. Rivals → viral ads → prompts. Not stamped on the three films. |
| Only if the demo is hot | **VEED brand avatar spots** | Host-sponsor feature. Does not replace fal. |
| After freeze | Everything else below | README, Loom, rehearsal. |

---

## 1. VEED brand avatar (Taran's idea — keep)

**What.** Same product facts + review quote, but a second output row: a talking-head avatar that looks on-brand, with VO, captions, and a music bed, rendered through VEED.

**Why it can win.** The PRD said "VEED is the host, not a required partner — route video through fal." That was to protect the fal prize. Using VEED *as well* is the sponsor move. Jury from VEED scores "they actually used us." You walk out with two films: product-true (fal LoRA) and spokesperson-true (VEED avatar).

**How it stays on-brand.** Don't use a generic stock avatar. Condition it on extract: category, tone, materials. Same verbatim customer quote as the fal film. Same coral/mint end card. One product, two media types.

**Do not.** Replace Kling with VEED. LoRA is protected (D8). Avatar is a fourth card or a toggle: `Product film | Avatar spot`.

**Cut if.** VEED API/auth eats more than 45 minutes, or the avatar looks like every other AI spokesperson. Then ship an "Open in VEED" deep-link on the finished fal clip instead — still a sponsor mention, 10 minutes of work.

---

## 2. Competitor formulas — own page (`/intel`)

**What.** Paste a product URL (Apple, Glow Recipe, whoever). We name rivals in that category (Samsung / Oppo…), search their ads, reverse-engineer **structure** into a generation prompt for *your* product. Separate from Brand films and from Avatar spots.

**Q&A line.** "Their shape, our product. We do not clone the film."

**Wired.** `/intel` + `/api/intel`. Live Tavily + OpenAI, mock fallback. CTA copies the prompt or jumps to `/forge` for the LoRA films — it does not stamp formulas onto those three cards.

---

## 3. Other bets that fit this stack

Ranked. Each one uses a partner you already have, or VEED.

### Build-if-hot (one, not three)

| Bet | Partner | Jury sentence |
|---|---|---|
| **Open in VEED** | VEED | Finished fal clip + captions/music/resize in the host tool. Smallest sponsor win. |
| **UGC / studio / avatar** | fal + VEED | Three strategies, not three cuts of the same idea. You already ask OpenAI for distinct concepts — make the formats distinct too. |
| **Claims checker** | Pioneer or OpenAI | Script vs extracted facts. Red-flag invented ingredients. Makes GLiNER2 look useful even if the fine-tune didn't converge. |
| **9:16 → 1:1 → 16:9** | VEED | Same ad, three placements. Boring, but buyers nod. |

### Pitch-only (say it, mock one screen, do not wire)

| Bet | Jury sentence |
|---|---|
| **Remix** | "Make it funnier / more clinical / more ASMR" re-runs concepts on the same facts. |
| **Hook score** | Rank the 3 concepts by how specific the Tavily quote is. Specificity = proof. |
| **Comment → ad** | Paste a 1-star or 5-star comment, that becomes concept 3. Same verbatim-quote trick. |
| **Brand kit from photos** | Palette + type vibe pulled off `imageUrls` before LoRA. Explains why the LoRA looks right. |
| **Localize** | Same shots, VO in EN / DE / FR. VEED captions. Europe jury, Europe markets. |

### Cut (looks like product, costs the demo)

- Multi-URL / multi-product campaigns
- Real Meta/TikTok ads-manager export
- Auth, saved runs, accounts (already optional — do not demo it)
- Training a face LoRA on a founder
- "Predict views" ML scores
- Anything that needs a new API key you don't have in `.env.local`

---

## Demo script if we add one thing

1. Paste Glow Recipe URL. Pipeline theatre. Three fal films. Wipe **No LoRA | Brand LoRA**. Stop. That is the win condition.
2. If VEED avatar landed: "Same quote, now a spokesperson." Play 8 seconds. "Edited in VEED."
3. If formula chips landed: tap one. "That's The Ordinary's listicle structure on *their* serum."
4. Never mention Convex. Never mention how long training took. Claim: **minutes, not weeks.**

---

## Jatin / Taran split

- **Jatin:** Pioneer (even zero-shot) + keep fal/Tavily from falling over + LoRA cache on disk.
- **Taran:** VEED avatar *or* Open-in-VEED + formula chips as UI + pitch. Not both avatar *and* live competitor crawl.
