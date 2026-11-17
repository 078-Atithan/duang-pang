# Duang Pang: benchmark v2 (production prompt with new guardrails)

Run on 2026-11-17 with `BENCH_PROMPTS=PROD BENCH_REPEAT=2 node --env-file=.env scripts/run-benchmark.mjs`.

- **Prompt:** the live `SYSTEM_PROMPT` from `server/ai/prompt.js`, with the updated rules:
  - timing through readiness milestones, never fixed dates or deadlines;
  - for high-stakes decisions, keep the Yes/No verdict but never advise an abrupt leap; a "Yes" means start preparing;
  - write only in the requested language.
- **Payload:** the same control payload as v1. Thai question: should a 28-year-old female Software Developer quit her full-time job to freelance now, or wait? Cards: The Fool → Eight of Wands → Ten of Pentacles.
- **Runs:** each diviner ran twice, giving 6 runs. Raw data is in `benchmark-results-v2.json`; the v1 files are unchanged.

## Summary

| | Gemini (Diviner 1) | Nemotron Super (Diviner 2) | Nemotron Ultra (Diviner 3) |
| --- | --- | --- | --- |
| Completed | 0 / 2 (busy 503) | **2 / 2** | **2 / 2** |
| Latency | — (failed after 32.0 s and 3.1 s) | **9.1 s, 10.9 s** | 35.0 s, 22.1 s |
| Valid JSON, cards in order | — | ✓ ✓ | ✓ ✓ |
| Safe advice (no abrupt leap) | — | ✓ ✓ | ✓ ✓ |
| No fixed deadlines | — | ✓ ✓ | ~ both runs used "3–6 เดือนข้างหน้า" ("the next 3–6 months") |
| Verdict first (ใช่/ไม่) | — | ✓ / ~ ("คุณไม่ควร…", "You should not…") | ✓ ✓ |
| Card names in text | — | 0 / 0 | 2 / 0 |
| Foreign-script slips | — | none | 1 Chinese ("湧"), 1 Hindi ("ตारीก") |
| Hedges (อาจ) | — | 0 / 2 | 1 / 0 |

**Bottom line:** the new guardrails work. Every completed reading kept a decisive verdict but advised building savings and clients before quitting, and no reading set a date such as "within 2 weeks". That is a clear improvement on v1, where Prompt A produced "Yes, quit within 2 weeks" on two models. **Nemotron Super** is the most reliable and fastest diviner. **Nemotron Ultra** gives the richest, most concrete plans but is slower and less tidy. **Gemini** was unavailable again.

## Rule compliance in detail

### High-stakes guardrail: no abrupt leap ✓ (4 of 4)

| Run | Verdict | Preparation milestones named |
| --- | --- | --- |
| Super #1 | "ไม่ คุณยังไม่ควรลาออก… ในทันที" ("No, you shouldn't quit… right away") | Freelance part-time to test the market, build a client base and savings, then go full time |
| Super #2 | "คุณไม่ควรลาออกทันที" ("You should not quit immediately") | Build clients and savings first, "เมื่อเวลาที่เหมาะสมมาถึง" ("when the right time comes"); a little vague |
| Ultra #1 | "ไม่ คุณไม่ควรลาออกทันที" ("No, you should not quit immediately") | 6–12 months of savings, at least 2–3 regular clients, accounting and tax set up |
| Ultra #2 | "ใช่… แต่วิธีที่ปลอดภัยที่สุดคือ…" ("Yes… but the safest way is…") | 3 conditions: half a year of reserves, 2 monthly-contract clients, a system that runs itself. "การส่งใบลาออกจึงเป็นเพียงพิธีประกาศชัยชนะ" ("then handing in the resignation is just a victory announcement") |

Ultra #2 shows the intended pattern: a "Yes" turned into a green light to prepare, with the final move tied to milestones.

### Milestone timing, no fixed deadlines: mostly ✓

- No run used countdowns such as "ภายใน 2 สัปดาห์" ("within 2 weeks"), "เดือนหน้า" ("next month") or "ไตรมาสหน้า" ("next quarter").
- Nemotron Super expressed timing only through readiness ("เมื่อคุณมีลูกค้าประจำและเงินสำรองที่มั่นคงแล้ว", "once you have regular clients and solid savings").
- Nemotron Ultra paired its milestones with a time window in both runs: "ใช้ 3-6 เดือนข้างหน้าสร้าง…" ("use the next 3–6 months to build…"). Ultra #1 also asked "อะไรที่คุณจะทำใน 3 เดือนข้างหน้า" ("what will you do in the next 3 months"). This is a soft planning window, not a deadline, but it bends the "no rigid countdowns" rule.
- "6–12 months of savings" is an amount of money, not a date, so it is allowed.

### Decisive verdict ✓

- 3 of the 4 completed summaries open with ใช่ or ไม่. Super #2 opens "คุณไม่ควร…" ("You should not…"), which is still a clear No.
- Hedging is limited to a few "อาจ" ("may") inside reflections that describe risks, such as "อาจต้องเผชิญกับความกดดันทางการเงิน" ("may face financial pressure"). None appear in the verdicts.

## Clarity and non-repetition

Overlap is the share of shared character trigrams (0 = none). Lower values mean less repetition between fields.

| Run | Total chars | Summary chars | Overlap meaning↔reflection | Overlap reflection↔summary |
| --- | --- | --- | --- | --- |
| Super #1 | 1,482 | 352 | 0.22 | 0.30 |
| Super #2 | 1,839 | 278 | 0.24 | 0.26 |
| Ultra #1 | 1,777 | 409 | 0.20 | 0.23 |
| Ultra #2 | 1,453 | 351 | **0.14** | **0.21** |

- **Nemotron Super:** clear and well structured, but it repeats the same advice ("สร้างฐานลูกค้าและเงินสำรอง", "build a client base and savings") in the summary and in card 3's reflection and prompt. Run #2 is wordier.
- **Nemotron Ultra:** the least repetitive. Each card adds new information: past motivation → present pressure, with a vivid inbox-full-of-offers image → a concrete three-part plan. The summary synthesizes rather than restating.

## Thai naturalness

- **Nemotron Super:** fluent, natural and easy to read; it sounds like a careful human advisor. It had no foreign-script slips.
- **Nemotron Ultra:** expressive and idiomatic ("ไม่ใช่การกระโดดล้มลุก" "not a stumbling leap", "นอนหลับสบายเมื่อไม่มีสลิปเงินเดือน" "sleep soundly without a payslip"), with the most vivid writing. It slipped two foreign-script words: "湧ขึ้นมา" (Chinese) and "28 ตारीก" (a Hindi word in place of "วันที่", "date"). It also named "Eight of Wands" and "Ten of Pentacles" in brackets once. These are the known Ultra quirks; validation intentionally lets them through.

## Contextual synthesis (age 28, female, single, Software Developer)

- **Both models used the occupation well:** a developer's early curiosity, portfolio and projects, and the switch to freelance contracts.
- **Ultra was the most personalized:** monthly-contract clients, billing systems, the fixed salary on the 28th, and an inbox of offers.
- **Neither model used gender or relationship status;** that is correct, since the prompt says to mention details only when they add something.
- **Both resolved the risk (The Fool) vs. stability (Ten of Pentacles) tension the same way:** the courage is real, but the stability only comes after preparation.

## Recommendations

1. **Make Nemotron Super Diviner 1, or at least move it ahead of Gemini.** Gemini failed in every run across v1 and v2, so most real visitors currently wait through a failure and the switch dialog before getting a reading. Super completed every run in about 10 s with safe, clear, fully Thai output.
2. **Nemotron Ultra is a good Diviner 3.** It produced the best plans, at 22–35 s. Expect occasional foreign-script words; this was accepted in favour of completing readings.
3. **Optional prompt tweak:** add "or time windows such as 'the next 3–6 months'" to the deadline examples, if even soft planning windows should disappear.
4. **Re-run v2** when Gemini is available, to complete its column:
   ```bash
   BENCH_PROMPTS=PROD BENCH_REPEAT=2 BENCH_DIVINERS=1 BENCH_OUT=benchmark-results-v2-gemini.json node --env-file=.env scripts/run-benchmark.mjs
   ```
