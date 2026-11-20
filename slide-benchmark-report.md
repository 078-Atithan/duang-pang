# Duang Pang: AI and prompt benchmark (presentation report)

**Test set-up**

- **Matrix:** 3 prompts × 3 AI models, each run twice, for 18 runs on 2026-11-17. Raw data: `slide-benchmark-results.json`.
- **Same input every run:** a 28-year-old female Software Developer asks, in Thai, *"Should I quit my full-time job now to freelance full time, or wait?"*
  > ฉันควรลาออกจากงานประจำตอนนี้เพื่อไปรับงานฟรีแลนซ์เต็มตัวเลยไหม หรือควรรออีกสักพัก?
- **Cards:** The Fool → Eight of Wands → Ten of Pentacles (past → present → future).
- **Fair comparison:** all three prompts share the same input description, Thai-only language rule, strict JSON output rules, card-name rule and safety limits. Only the advice rules differ.

| Prompt | What it asks for |
| --- | --- |
| **Prompt 1: Baseline** | Original decisive prompt: a clear Yes/No verdict, no hedging, concrete timeframes such as "within three months" |
| **Prompt 2: Psychological** | An empathetic counsellor: deep profile use, explore the decision instead of giving a verdict |
| **Prompt 3: Final production** | Decisive Yes/No, with timing expressed as **readiness milestones** (never fixed dates), and **no abrupt leaps** on high-stakes decisions (a "Yes" means start preparing) |

**How the five metrics are measured**

1. **Availability:** pass or fail, with the error.
2. **Speed:** seconds per reading.
3. **Practicality, (4) Clarity and (5) Language:** scored 1–5 from the outputs, backed by automatic checks: repetition overlap between fields, hedge words, fixed deadlines, and leaked foreign characters.

---

## Table 1: AI model comparison

Each model has 6 runs (3 prompts × 2).

| Metric | **Nemotron Super** (Diviner 1) | **Nemotron Ultra** (Diviner 2) | **Gemini** (Diviner 3) |
| --- | --- | --- | --- |
| **1. Availability (ใช้งานได้ไหม)** | ✅ **Pass, 6/6** | ✅ **Pass, 6/6** | ❌ **Fail, 0/6**: 3× overloaded (HTTP 503 "high demand"), 3× timeout at 45 s |
| **2. Speed (ความไว)** | ⚡ **13.0 s** average (7.0–26.8 s) | 33.8 s average (27.1–48.8 s) | — (no reading) |
| **3. Practicality (การนำข้อมูลไปใช้จริง)** | **4/5**: sound, realistic steps (freelance part-time first, build savings and clients), but somewhat generic | **5/5**: most concrete plans: "6 months of savings", "2–3 signed clients", "rates at 1.5× current salary" | — |
| **4. Clarity / Non-repetition (การพูดวกวน)** | **3/5**: concise, but repeats the same advice across fields (overlap 0.24 / 0.29) | **4/5**: each card adds new information; least repetition (overlap 0.22 / 0.23) | — |
| **5. Language clarity (ความชัดเจนด้านภาษา)** | **5/5**: fluent, natural Thai; **0 foreign characters** in 6 runs | **3/5**: vivid, idiomatic Thai, but **5 of 6 runs leaked foreign characters** (Chinese "湧", Hindi "बुद्धि") | — |
| **Verdict** | **Best Diviner 1:** fast, reliable, clean Thai | **Best Diviner 2:** the richest advice, slower, occasional character slips | **Fallback only:** unavailable throughout testing |

**Slide takeaway, point 1: models perform very differently.** Gemini was never available, so it cannot be the first choice. Nemotron Super is **2.6× faster** with flawless Thai. Nemotron Ultra gives the **most practical advice** but is slower and sometimes mixes in foreign characters. This is why the site tries **Super → Ultra → Gemini** in that order.

---

## Table 2: Prompt comparison

Each prompt has 4 successful runs (Gemini failed every run).

| Metric | **Prompt 1: Baseline** | **Prompt 2: Psychological** | **Prompt 3: Final** ✅ |
| --- | --- | --- | --- |
| **1. Availability** | Pass, 4/4 on Nemotron | Pass, 4/4 on Nemotron | Pass, 4/4 on Nemotron |
| **2. Speed** | 20.3 s average | 24.5 s average | 25.4 s average |
| **3. Practicality** | **2/5**: decisive but **risky**: 3 of 4 said "Yes, quit"; **fixed deadlines in 4 of 4 runs** ("ภายใน 3 เดือน", "ส่งจดหมายลาออกในวันที่ 1 ของเดือนที่ 4"); one said "start your new life immediately" | **3/5**: sensible preparation ideas, but **no answer to the question** (0 of 4 gave a verdict): "ลองมองหาจุดกลาง" ("look for a middle ground") | **5/5**: **a clear answer plus a safe plan**: named milestones (6-month reserve, 2–3 signed clients, annual contracts) before resigning; **0 fixed deadlines and 0 reckless leaps** |
| **4. Clarity / Non-repetition** | **4/5**: short and direct (1,666 chars) | **2/5**: circles around the question; hedges in every run ("อาจ", "น่าจะ"); highest meaning↔reflection overlap (0.26) | **4/5**: answer first, then reasons, then the plan; stays on point |
| **5. Language clarity** | **4/5**: clear and natural; firm tone | **3/5**: soft and vague ("อาจไม่ใช่…แต่อาจเป็น…", "it may not be… but it may be…") | **4/5**: confident and natural; a firm but caring tone |
| **Verdict** | Decisive but **unsafe advice** | Safe but **doesn't answer** | ✅ **Decisive and safe and actionable** |

### Side-by-side proof: the same question, the same model (Nemotron Ultra)

| | Summary (actual output, abridged) | What it shows |
| --- | --- | --- |
| **Prompt 1: Baseline** | "**ใช่ คุณควรลาออก**และไปรับงานฟรีแลนซ์เต็มตัว**ภายใน 3 เดือน** … เดือนนี้เซ็นลูกค้าประจำ 2 แห่ง … แล้ว**ส่งจดหมายลาออกในวันที่ 1 ของเดือนที่ 4**" ("Yes, you should quit and go freelance full time **within 3 months** … sign 2 regular clients this month … then **hand in your resignation on the 1st of the 4th month**") | ❌ A rigid countdown to a major life decision. If the timing is wrong, the advice is harmful. |
| **Prompt 2: Psychological** | "ความสำคัญไม่ใช่ 'ควรลาออกตอนไหน' แต่คือ 'คุณจะสร้างพื้นที่ให้การเปลี่ยนผันนั้นปลอดภัยและยั่งยืนอย่างไร' **ลอง**นำรายได้จากงานฟรีแลนซ์ปัจจุบันมาทดสอบ…" ("What matters isn't 'when to quit' but 'how will you make the transition safe and sustainable'. **Try** testing your current freelance income…") | ⚠️ Thoughtful, but it never answers yes or no. The user leaves without a decision. |
| **Prompt 3: Final** ✅ | "**ใช่** คุณจะไปทำฟรีแลนซ์เต็มตัวและสร้างรายได้มั่นคงได้ — **แต่ไม่ใช่วันนี้พรุ่งนี้** … ให้**สร้างเงินสำรอง 6 เดือน และปิดสัญญาลูกค้าอย่างน้อย 2-3 รายก่อนส่งใบลาออก**" ("**Yes**, you will freelance full time and build a stable income — **but not today or tomorrow** … **build 6 months of savings and sign at least 2–3 clients before you resign**") | ✅ A clear **Yes**, made safe with **readiness milestones** instead of a date. Decisive and responsible. |

The same pattern holds on Nemotron Super:

| Prompt | Nemotron Super summary (abridged) |
| --- | --- |
| Prompt 1 | "ใช่ คุณควรลาออกจากงานประจำ… คุณควรลาออก**ภายในสามเดือนนี้**…" ("Yes, you should quit… you should quit **within these three months**…") ❌ deadline |
| Prompt 2 | "คำตอบ**อาจ**ไม่ใช่การเลือก…อย่างใดอย่างหนึ่งทันที แต่**อาจ**เป็นการเตรียมพร้อมทีละขั้น…" ("The answer **may** not be choosing one option right away, but **may** be preparing step by step…") ⚠️ no answer, hedged |
| Prompt 3 | "**คำตอบคือไม่ คุณไม่ควรลาออกทันที** … สร้างฐานลูกค้าและเงินสำรองให้มั่นคงก่อน จากนั้นเมื่อความพร้อมเต็มที่ คุณจึงค่อยก้าวสู่การเป็นฟรีแลนซ์เต็มตัว" ("**The answer is no, you should not quit immediately** … build a solid client base and savings first, then move to full-time freelancing once you're fully ready") ✅ |

**Slide takeaway, point 2: the prompt changes the quality as much as the model does.**

- **Prompt 1** is decisive but gives dangerous, date-bound advice: a fixed deadline in **4 of 4** runs.
- **Prompt 2** is safe but evasive: a verdict in **0 of 4** runs.
- **Prompt 3** keeps the decisive answer and adds named readiness milestones, with **0** fixed deadlines and **0** reckless leaps. That combination is why Prompt 3 is the production prompt.

---

## One-line summary for the closing slide

> **Nemotron Super + Prompt 3** gives the best experience: a clear answer in about 13 seconds, natural Thai, and advice that is decisive *and* safe. Nemotron Ultra and Gemini stand behind it as automatic fallbacks.

## Notes on method

- **Sample size:** 2 runs per cell at temperature 0.8. Exact wording varies between runs, but every pattern above (deadlines, verdicts, foreign characters, Gemini availability) appeared consistently across runs.
- **Automatic checks:**
  - deadlines: the deadline-pattern check in `scripts/run-benchmark.mjs`, fixed and re-applied to the saved outputs;
  - hedge words;
  - foreign characters: CJK and Devanagari;
  - repetition: character-trigram overlap between `meaning`, `reflection` and `summary`.
- **Scores 3–5** are reviewer judgements based on reading every output, supported by the checks above.
- **Re-run:**

  ```bash
  BENCH_PROMPTS=P1,P2,P3 BENCH_REPEAT=2 BENCH_OUT=slide-benchmark-results.json node --env-file=.env scripts/run-benchmark.mjs
  ```
