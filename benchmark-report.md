# Duang Pang: AI and prompt benchmark results

Run on 2026-11-17 by `scripts/run-benchmark.mjs`, following `duang_pang_ai_prompt_benchmark_spec.md`. The test matrix was 3 system prompts (A decisive, B empathetic, C analytical chain-of-thought) × 3 diviners, all with the same Thai career question:

> ฉันควรลาออกจากงานประจำตอนนี้เพื่อไปรับงานฟรีแลนซ์เต็มตัวเลยไหม หรือควรรออีกสักพัก?
> ("Should I quit my full-time job now to freelance full time, or wait a while?")

- **Cards:** The Fool → Eight of Wands → Ten of Pentacles (timeline spread: past, present, future).
- **Profile sent to the AI:** 28, female, single, Software Developer. Name and birth date were not sent.

Raw data is in `benchmark-results.json` (all 9 runs) and `benchmark-results-gemini35.json` (the Gemini substitute run).

## Key findings

1. **Only Nemotron (Diviner 2) completed the matrix.** It produced 3 of 3 valid readings in 4.7–11.9 s.
2. **DeepSeek (Diviner 3) is gone.** NVIDIA retired `deepseek-ai/deepseek-v4.1-flash` on 2026-11-16 (HTTP 410 "Gone"), and NVIDIA no longer lists any DeepSeek model for this key. All three DeepSeek runs failed instantly. **Diviner 3 needs a new model** before it can work again; until then the live site's last fallback fails straight away.
3. **Gemini (Diviner 1) was unavailable.** `gemini-flash-latest` returned 503 "high demand" or timed out at 45 s in all three runs. A substitute run on `gemini-3.5-flash` succeeded once (Prompt A, 32.5 s); B timed out and C was busy. Gemini's reliability was poor throughout this test period.
4. **Prompt A gives the most decisive answer, but it is risky advice.** Both models that answered said "ใช่ ลาออก… ภายใน 2 สัปดาห์" ("Yes, quit within 2 weeks") and promised financial security, which is a confident push into a major financial decision. Prompt A and the production prompt both forbid "investment advice" but not career or financial life decisions.
5. **Prompt B gave the most useful and contextual reading,** but it is long, repeats itself more, hedges ("อาจ"), and does not open with a verdict.
6. **Prompt C made Nemotron answer in English** although the request language was Thai. It also named cards inside the text ("Eight of Wands", "the Fool's"). Prompt C does not restate the language rule, so it fails the Thai requirement outright.

## Results matrix

Time is wall-clock per call. "Valid" means the reply passed `validate.js` (cards match the drawn IDs, in order).

| Prompt | Diviner 1: Gemini (`gemini-flash-latest`) | Diviner 2: Nemotron | Diviner 3: DeepSeek (`v4.1-flash`) |
| --- | --- | --- | --- |
| A Decisive | ✗ timeout (45.0 s) | ✓ valid, 11.9 s | ✗ 410 Gone (0.3 s) |
| B Empathetic | ✗ busy 503 (3.8 s) | ✓ valid, 10.2 s | ✗ 410 Gone (0.3 s) |
| C Analytical | ✗ busy 503 (1.7 s) | ✓ valid, 4.7 s | ✗ 410 Gone (0.4 s) |

Substitute Gemini run (`gemini-3.5-flash`, not the configured model):

| Prompt | Result |
| --- | --- |
| A | ✓ valid, 32.5 s |
| B | ✗ timeout (45.0 s) |
| C | ✗ busy 503 (26.2 s) |

## Automatic metrics (successful runs)

- **Overlap** is the share of shared character trigrams between fields (0 = no repetition, 1 = identical); higher values suggest circular phrasing.
- **Hedges** counts words such as อาจ, อาจจะ, น่าจะ, might.
- **Verdict first** means the summary opens with ใช่/ไม่.

| Run | Total chars | Summary chars | Overlap meaning↔reflection | Overlap reflection↔summary | Hedges | Card names | Verdict first | Language |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A × Nemotron | 807 | 169 | 0.17 | 0.24 | none | 0 | ✓ ใช่ | Thai |
| A × Gemini 3.5* | 862 | 245 | 0.27 | 0.38 | none | 0 | ✓ ใช่ | Thai |
| B × Nemotron | 1,915 | 366 | 0.34 | 0.30 | อาจ | 0 | ✗ | Thai |
| C × Nemotron | 1,722 | 485 | 0.18 | 0.28 | none | 1+ (English names) | ✗ | **English** ✗ |

\* Substitute model.

## Qualitative evaluation

Scores are out of 5, from reading the outputs.

| Run | Clarity / non-repetition | Thai naturalness | Contextual synthesis | Verdict |
| --- | --- | --- | --- | --- |
| A × Nemotron | 4: short, direct | 4: natural, slightly generic | 2: barely uses "Software Developer"; ignores the risk vs. stability tension | "Yes, quit within 2 weeks" |
| A × Gemini 3.5* | 3: summary repeats the card lines ("มั่งคั่ง… มั่นคง… สมบูรณ์") | 4 | 2: generic, little profile use | "Yes, quit within 2 weeks; wealthy within 3 months" |
| B × Nemotron | 3: thorough but long; each meaning restates the light/shadow pattern | 4: fluent, a little formal | **5**: uses age 28, developer, savings runway, a 1-month freelance trial | "Don't quit yet; build clients and savings first" |
| C × Nemotron | 4: tight cause-and-effect chain | **1**: answered in English | 4: "wait for 3 recurring clients or 6 months of runway" | "Wait" (in English) |

### How each prompt resolved the risk (The Fool) vs. stability (Ten of Pentacles) tension

- **Prompt A** let the Fool and the Eight of Wands win and treated the Ten of Pentacles as the reward for leaping. It is decisive but ignores the obvious caution.
- **Prompt B** treated the Ten of Pentacles as the goal that requires preparation first. This reads the tension best.
- **Prompt C** gave a strategic "wait until X" verdict with a concrete threshold, the best risk-mitigation action, but it was unusable because of the language.

### Example summaries

- **A × Nemotron:** "ใช่ คุณควรลาออกจากงานประจำเพื่อไปรับงานฟรีแลนซ์เต็มตัวภายในสองสัปดาห์นี้ เนื่องจากโอกาสกำลังเคลื่อนที่เข้ามาอย่างรวดเร็วและจะนำคุณไปสู่ความมั่นคงทางการเงินในอนาคตอันใกล้" ("Yes, you should quit to freelance full time within these two weeks, because opportunities are moving toward you fast and will bring financial security soon.")
- **B × Nemotron:** "…คำตอบสำหรับคำถามของคุณคือ ไม่ควรลาออกทันที แต่ควรใช้เวลานี้ในการสร้างฐานลูกค้าและวางแผนทางการเงินให้มั่นคงเสียก่อน…" ("…the answer to your question is not to quit right away, but to use this time to build a client base and a solid financial plan first…")
- **C × Nemotron:** "…The strategic verdict is to wait until you have secured at least three recurring freelance clients or a six-month financial runway before resigning…"

## Notes on the method

- **What changed for the test:** the benchmark prompts replaced the production `SYSTEM_PROMPT` through a new optional `systemPrompt` parameter on both adapters (`server/ai/gemini.js`, `server/ai/nvidia.js`). `server/ai/prompt.js` was never modified, so there was nothing to restore.
- **The three spec prompts are much shorter than the production prompt.** They have no input description, no field definitions and no explicit "write in the requested language" rule. That explains Prompt C's English output, and Prompt B swapping the roles of `reflection` (it became questions) and `prompt` (it became actions).
- **One sample per cell.** With temperature 0.8, wording varies between runs; latency and availability are the more reliable signals.

## Recommendations

1. **Replace Diviner 3.** DeepSeek no longer exists on NVIDIA. Pick another NVIDIA model available to this key, or another provider, then update `server/ai/diviners.js` and `.env`.
2. **Make Gemini more reliable.** `gemini-flash-latest` was overloaded for this whole period. Consider pinning a less busy Gemini model, or making Nemotron Diviner 1, since it was the only reliable and fast model here.
3. **Prompt direction: combine B's grounding with A's decisiveness, and keep the production prompt's structure.**
   - Keep: verdict first (from A); concrete thresholds and timeframes plus a risk-mitigation step (from C); profile-specific practical advice (from B).
   - Keep the production prompt's input and output field definitions and its explicit language rule; this benchmark shows they matter.
   - Add a limit: no telling the visitor to make a major financial or career move (quit a job, invest savings) on a fixed short deadline. Prompt A's "quit within 2 weeks" is the kind of confident advice that could cause real harm.
4. **Re-run** with `node --env-file=.env scripts/run-benchmark.mjs` once Diviners 1 and 3 work. Add `BENCH_DIVINERS=1,2` to limit which diviners run, and `BENCH_OUT=file.json` to write to another file.

## Update (2026-11-17): new Diviner 3, Nemotron Ultra

DeepSeek was replaced by `nvidia/nemotron-3-ultra-550b-a55b` (env `ULTRA_MODEL`; server timeout 120 s, shown estimate 20–60 s). Same payload, same three prompts; raw data is in `benchmark-results-ultra.json`.

| Prompt | Result | Time | Hedges | Card names in text | Verdict first | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A Decisive | ✓ valid | 31.8 s | none | 3 | ✓ ใช่ | "Quit within 2 weeks"; names cards in brackets |
| B Empathetic | ✓ valid | 29.1 s | อาจ | 4 | ✗ | Best framing: "not *when* to quit but *with what system*"; addresses her as เธอ |
| C Analytical | ✓ valid | 40.3 s | none | 9 | ✗ | One Chinese word leaked ("要求"); odd phrases ("โรงงานซอฟต์แวร์") |

**With the production prompt** (two live Thai readings): 35–36 s each, **0 card names, no Chinese characters**, and a clear "ใช่…" verdict with timeframes. The card-name and language slips above come from the short benchmark prompts. The production prompt's explicit style and language rules keep Ultra on track.

**Takeaways**

- **Speed:** Nemotron Ultra is slower than Nemotron Super (about 30–40 s vs 5–12 s), but far faster than DeepSeek was. It completed 3 of 3 runs.
- **Output quality:** with the production prompt it reads naturally and decisively in Thai, so it works as Diviner 3.
- **Risky advice:** it still told the visitor to resign "immediately". The recommendation above, a prompt limit on pushing major financial or career moves on short deadlines, applies to this model too.
