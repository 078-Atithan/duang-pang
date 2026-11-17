# Duang Pang

A responsive, bilingual tarot website built with semantic HTML, CSS variables, and native ES modules. The default experience works locally without an API key. An optional Node.js server can create AI readings with three AI diviners: two NVIDIA Nemotron models first, then Google Gemini as a fallback.

## Start locally

Requirements: **Node.js 22.9 or later**. No dependencies or build step are required for the application.

Open a terminal **inside this `duang-pang` folder** and run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop the server with Ctrl+C.

Do not double-click `index.html`: ES modules and JSON fetching need an HTTP server. For a frontend-only demo, the public files also work with a static HTTP server, such as VS Code Live Server. Without the optional API, the interface automatically uses local demo mode.

## Project architecture

Each feature has its own folder. There is no build step: the browser loads `js/main.js` as a native ES module, and the same files work locally and on GitHub Pages.

```text
duang-pang/
├── index.html                    Page markup; loads the CSS files and js/main.js
├── css/                          Loaded in this order (later files can override earlier ones)
│   ├── base.css                  Palette tokens, reset, typography, header, buttons
│   ├── home.css                  Hero and "how it works" section
│   ├── wizard.css                Reading workspace, stepper, topic/question/spread/details steps
│   ├── draw.css                  Deck, chosen slots, waiting bounce, reveal panel, messages
│   ├── results.css               Result header, card grid, summary, actions
│   ├── footer.css                Footer, dialogs, no-script notice
│   ├── thai.css                  Shared Thai typography
│   ├── responsive.css            Breakpoints, reduced motion, print
│   ├── motion.css                Hero, stars, buttons and card reveal effects
│   └── cosmic.css                Site-wide constellations and celestial styling
├── js/
│   ├── main.js                   Entry point: startup and page event handling
│   ├── config.js                 Asset paths and which reading server to use (REMOTE_API_BASE)
│   ├── state.js                  The reading in progress (state) and loaded data/in-flight work (session)
│   ├── dom.js                    DOM shortcuts, HTML escaping, buttons, dates
│   ├── data/                     topics.js, spreads.js, careers.js, icons.js
│   ├── i18n/                     strings.js (all UI text, EN/TH), index.js (t, language), card-text.js (Thai card text)
│   ├── wizard/                   wizard.js (stepper, navigation), steps.js (steps 1-4, details checks), career-picker.js (searchable career list), draw.js (shuffle and pick)
│   ├── reading/                  deck.js (shuffle, deck checks), local.js (local mode), api.js (server calls), validate.js
│   ├── results/                  reveal.js (make the reading), results.js (show it), errors.js (error messages), download.js
│   └── ui/                       effects.js (animations), hero.js, dialogs.js
├── server/
│   ├── server.js                 Entry point for `npm start`: reads settings and listens
│   ├── app.js                    Routes, host/origin checks, CORS, reading limits
│   ├── ai/prompt.js              SYSTEM_PROMPT and the data sent to the AI (only age, gender, status, occupation)
│   ├── ai/diviners.js            Diviner order, models, time limits and estimates
│   ├── ai/gemini.js              Gemini request (Diviner 3, last fallback)
│   ├── ai/nvidia.js              NVIDIA NIM request (Diviners 1 and 2)
│   ├── ai/shared.js              Reply checks and error codes shared by both
│   ├── validation.js             Checks every reading request against the trusted deck
│   ├── static.js                 Serves index.html, css/, js/ and assets/ only
│   ├── http.js                   Security headers and JSON helpers
│   ├── security.js               Allowlist and limit helpers
│   ├── deck.js                   Loads the trusted deck once
│   └── errors.js                 RequestError with a stable error code
├── assets/                       Card back, decorative SVGs, data/tarot-images.json, images/tarot/*.jpg
├── tests/
│   ├── unit/                     `npm test`: deck, local-reading, careers, validation, ai, server
│   ├── browser/                  Optional Playwright checks: smoke, motion, shuffle-variants, stepper
│   └── helpers.js                Shared test fixtures
├── scripts/
│   ├── check.mjs                 `npm run check`: syntax-checks every JS file
│   └── export-source.mjs         Regenerates SOURCE_CODE.md
├── render.yaml                   Render blueprint for hosting the reading server
├── .env.example                  Server settings template; no secrets
└── package.json
```

### Where to change what

| To change… | Edit |
| --- | --- |
| Interface text (English or Thai) | `js/i18n/strings.js` |
| Thai card names and meanings | `js/i18n/card-text.js` |
| Topics or spreads | `js/data/topics.js`, `js/data/spreads.js` |
| Career options (keep “Other” last) | `js/data/careers.js` |
| A wizard step's form | `js/wizard/steps.js` (+ `css/wizard.css`) |
| Shuffling and picking cards | `js/wizard/draw.js` (+ `css/draw.css`, `js/ui/effects.js`) |
| How the results page looks | `js/results/results.js` (+ `css/results.css`) |
| Error messages for failed readings | `js/results/errors.js` and the `error…` keys in `js/i18n/strings.js` |
| The AI's instructions or tone | `server/ai/prompt.js` |
| Diviner order, models or time limits | `server/ai/diviners.js` |
| Switching between diviners | `js/results/reveal.js`, `js/ui/diviner-dialog.js` |
| Which sites may use the server, and limits | `server/app.js`, `.env` / `render.yaml` |
| Which server the page talks to | `js/config.js` (`REMOTE_API_BASE`) |

## Add your images

All **78 scans from your `cards.zip` are included** in **`assets/images/tarot/`**. Their filenames match the `img` values from `assets/data/tarot-images.json`. Each supplied image is 350 × 600 pixels. If you replace the artwork later, retain these names:

```text
assets/images/tarot/m00.jpg  → The Fool
assets/images/tarot/m01.jpg  → The Magician
assets/images/tarot/c01.jpg  → Ace of Cups
```

The 78 expected filenames are listed in `assets/images/tarot/filenames.txt`. Use lowercase names, keep the `.jpg` extension, and do not rename the JSON references. If an image is unavailable, a styled placeholder shows the correct card name. A missing image does not prevent a reading. The supplied portrait scans are displayed without cropping.

The `m`, `c`, `s`, `w`, and `p` prefixes come directly from your dataset. The scans were imported from your supplied ZIP without modifying them. The hero uses `m18.jpg` (The Moon), `m17.jpg` (The Star), and `m19.jpg` (The Sun), with the original celestial card back as a loading or missing-file fallback. There are no substitute illustrated card faces.

## Magical theme and motion

The five requested colors are exposed as CSS variables in `css/base.css`: `#F6FFE9` ivory, `#F2E0A4` gold, `#CAC5E5` lavender, `#A230A4` magenta, and `#290087` purple. Deeper purple and muted text shades are derived companions for readable contrast. The header has larger links and more spacing, and the description has a centered introduction above three balanced steps.

The hero has independently floating cards, a luminous title, celestial rings, star twinkles, and an ambient aura. Buttons have hover sheen and press feedback. Motion is isolated in `css/motion.css` and `js/ui/effects.js` for easy tuning. `css/cosmic.css` adds constellation backgrounds, a moon seal, illuminated form borders, and celestial result panels and footer. The deck rests directly on the light reading surface with no background panel. While shuffling, sparse 3px gold/lavender motes and a few tiny stars drift away from the moving card edges, with a narrow sheen on the visible packets. Effects fade before selection resumes; there are no stacked neon halos. Deck cards are about 18% larger, with responsive fan angles to retain mobile fit. Enabled progress steps respond to hover and keyboard focus with a soft color wash and a small number-circle lift; future steps stay inactive.

Click Shuffle once to start a reading. Each shuffle randomly selects one of five motions: overhand, riffle, Hindu, strip, or weave. Every style uses the same `SHUFFLE_DURATION` of **1900ms** in `js/ui/effects.js`, including automatic reshuffles. Cards peel off individually at staggered times: overhand and Hindu transfers build a receiving stack, strip pulls cards out to alternating sides, and riffle/weave interleave the two halves. Each card lifts, travels, and lands with its own layer order; temporary stardust follows the moving card edges. The same deck elements remain mounted as the cards gather, shuffle, square up, and fan out in a single animation timeline, with no separate spread-animation restart. Cards hold their initial pose during animation delays, and selection no longer changes their vertical position before the flight. Selecting a card sends it into its position with a short sparkle burst, then automatically shuffles the remaining deck into the next choice. Controls lock during transitions to prevent duplicate draws. Results glow and flip from face-down to face-up as each card enters the viewport; lower cards on a phone reveal when you reach them. Changing language does not replay completed reveals.

The website respects the operating system's reduced-motion preference: animations are skipped, all results become readable immediately, and the reading flow stays functional. Particle effects are temporary and removed after playback; hero animations pause offscreen or when the browser tab is hidden.

## Included behavior

- Eight topics: love, finances, career, daily, monthly, wellbeing/health, luck, and friends/relationships.
- Optional question. Required name, birth date, relationship status, gender and career.
- Three 3-card spreads: Past / Present / Future; Your feelings / Their feelings / Future trends; Cause / Effect / Conclusion.
- One 4-card spread: Current situation / Obstacle / Advice / Conclusion. This uses the primary specification in the requirements document.
- A face-down stack, continuous shuffle-to-fan animation, a card flight into each slot, and automatic reshuffling until the spread is complete.
- Each fan displays 12 randomly sampled cards from the remaining deck. All 78 cards can be drawn; previously selected cards cannot repeat.
- Cards stay face-down until reveal. All cards use upright meanings; reversed draws are not part of this specification.
- Each result card has a prominent numbered role heading (for example, Current situation or Advice) and a short explanation of that position, in English and Thai. Source meanings, contextual reflections, a question to consider, and an overall reflection follow below.
- English and Thai interface controls, downloadable text readings, print styling, and privacy/about dialogs.
- Keyboard navigation, labeled forms, live selection announcements, reduced-motion support, and mobile layouts.

Changing the topic, question, spread, or personal details invalidates an existing draw, so the result always matches the current inputs. Navigating backward without changes preserves the draw. Refreshing clears the session.

## Local mode and AI diviners

**Local mode (default):** shows each drawn card's traditional meaning only: card name, keywords and meanings, under its spread position. Nothing about the visitor is used: no name, question, topic or personal reflection. It is used when no AI key is set, when the reading server cannot be reached (for example on GitHub Pages), when the visitor clicks "Show card meanings only", or when they decline to wait for the next diviner. All 78 card names, keywords and meanings have Thai translations in `js/i18n/card-text.js`; switching language rebuilds the page immediately.

**AI diviners:** readings are tried in this order. Visitors only see "Diviner 1/2/3"; model names stay on the server.

| Diviner | Model (`.env`) | Usual time | Server waits |
| --- | --- | --- | --- |
| 1 | Nemotron on NVIDIA NIM, `NEMOTRON_MODEL` | 10–60 s | 90 s |
| 2 | Nemotron Ultra on NVIDIA NIM, `ULTRA_MODEL` | 20–60 s | 120 s |
| 3 | Google Gemini, `GEMINI_MODEL` (default `gemini-flash-latest`) | 10–30 s | 45 s |

While a diviner works, the page shows which one it is, its usual time and a running timer. If it is out of quota, busy, too slow or returns an unusable answer, the page asks: keep waiting for the next diviner, or show the card meanings only (local mode). Esc also chooses local mode. If the last diviner fails, the visitor sees the error and can try again from Diviner 1 or use local mode. A blocked question, the server's own rate limits and network errors do not switch diviners. A diviner without its API key is skipped. Order, estimates and time limits are in `server/ai/diviners.js`; the switching logic is in `js/results/reveal.js`.

The server sends verified card context (each card's name, keywords, light and shadow meanings, and its spread position), the topic, the visitor's question, and only age (calculated from the birth date), gender, relationship status and occupation, and only after consent at the reveal step. Name and birth date are never sent. The prompt (`SYSTEM_PROMPT` in `server/ai/prompt.js`) asks for decisive readings: one clear outcome, no hedging, a direct "Yes"/"No" verdict for yes/no questions, timing through readiness milestones (never exact dates), and preparation rather than abrupt leaps for high-stakes decisions. It keeps a few limits: no illness or death predictions or treatment advice, no specific investments or bets, no accusing a named person of a concrete act, and support instead of predictions if self-harm is mentioned. Both adapters (`server/ai/gemini.js`, `server/ai/nvidia.js`) request strict JSON, check the cards come back in order, and map provider failures to stable error codes (`server/ai/shared.js`).

To configure AI:

1. Copy `.env.example` to `.env` inside this project.
2. Set `GEMINI_API_KEY` (from [Google AI Studio](https://aistudio.google.com/apikey)) and `NVIDIA_API_KEY` (from [NVIDIA build](https://build.nvidia.com)). Either can be left blank to skip those diviners.
3. Restart `npm start`. The console lists the active diviners.

```dotenv
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-flash-latest
NVIDIA_API_KEY=your-nvidia-key
NEMOTRON_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
ULTRA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
PORT=4173
```

**Never put a key in `js/config.js`, HTML, or any browser file.** The application has no frontend API-key field. API usage may incur charges on your provider accounts; Google's and NVIDIA's data-handling policies apply.

## API contract

`GET /api/config` returns `{ "mode": "demo" }`, or `{ "mode": "ai", "diviners": [{ "id": 1, "estimate": [10, 30], "timeoutSeconds": 45 }, …] }` without exposing credentials or model names. `POST /api/reading` takes an optional `"diviner": 1|2|3` (default: the first available) and returns the reading with `"diviner"` set.

`POST /api/reading` expects JSON, same-origin requests, and explicit consent:

```json
{
  "topic": "career",
  "question": "How can I approach my next project?",
  "spread": "timeline",
  "cardIds": ["m00.jpg", "m01.jpg", "m02.jpg"],
  "language": "en",
  "profile": {
    "name": "Alex",
    "birthDate": "",
    "status": "",
    "gender": "",
    "career": "Designer"
  },
  "actions": [],
  "consent": true
}
```

Response shape:

```json
{
  "mode": "ai",
  "language": "en",
  "summary": "An overall reflection…",
  "cards": [
    { "img": "m00.jpg", "cardName": "The Fool", "meaning": "What the card means in this position…", "reflection": "A contextual interpretation…", "prompt": "A question to consider?" },
    { "img": "m01.jpg", "cardName": "The Magician", "meaning": "…", "reflection": "…", "prompt": "…" },
    { "img": "m02.jpg", "cardName": "The High Priestess", "meaning": "…", "reflection": "…", "prompt": "…" }
  ]
}
```

The card order must match the submitted IDs. The server independently looks up all card meanings, validates unique card IDs and spread counts, limits request size and text lengths, and does not trust client-supplied card descriptions. Shuffle/pick events are sent to the server but are not sent to the AI provider or persisted.

## Privacy and deployment scope

The application does not use analytics, cookies, or persistent browser storage. Profile details, questions, and readings stay in memory. Local mode sends none of them to a provider. The optional server does not save reading data or log request bodies. Downloads are created only when requested by the user.

By default the server binds to **127.0.0.1** and permits only loopback Host headers. It protects private files with a static-file allowlist, checks request origins, enforces in-memory AI request limits, and never returns provider error bodies. Do not upload `.env`.

## Hosting

The same code supports three setups. Nothing changes for local use: `npm start` with a `.env` file works as before.

| Setup | Where the page is | Where AI readings come from |
| --- | --- | --- |
| Local | `http://127.0.0.1:4173` from `npm start` | The server on your computer |
| Static site | GitHub Pages | None. A banner says the site is in local mode |
| Static site + hosted server | GitHub Pages | A server deployed on Render (or similar) |

The page decides in `js/config.js`: when opened on this computer it always uses the local `/api`. Anywhere else it uses `REMOTE_API_BASE`, or stays in local mode while that is empty. If the hosted server does not answer (a free Render service sleeps and takes up to a minute to wake), the page shows a banner, keeps checking for about two minutes, and switches to AI as soon as the server responds.

### Deploy the reading server on Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. `render.yaml` configures the service; enter your `GEMINI_API_KEY` and `NVIDIA_API_KEY` when asked. Never commit the key.
3. When the service is live, note its address, for example `https://duang-pang.onrender.com`, and check that `https://duang-pang.onrender.com/api/config` returns `{"mode":"ai"}`.
4. In `js/config.js`, set `REMOTE_API_BASE` to that address followed by `/api`, then commit and push. GitHub Pages redeploys and the Pages site now creates AI readings.

To use another host, set the same environment variables: `HOST=0.0.0.0`, `GEMINI_API_KEY`, `NVIDIA_API_KEY` (and optionally the three model variables), `ALLOWED_ORIGINS` (your Pages origin), `ALLOWED_HOSTS` (the server's public hostname; Render's is added automatically) and `TRUST_PROXY=1` behind the platform's proxy.

### Protection on a public server

- **Allowlists:** only `ALLOWED_HOSTS` (plus loopback) are served, and only same-origin pages or `ALLOWED_ORIGINS` may request readings. CORS headers are sent only to allowed origins.
- **Limits:** `READINGS_PER_MINUTE` per visitor, `MAX_CONCURRENT_READINGS` at once, and `DAILY_READING_LIMIT` in total per day (default 200). The daily cap is the main spending control, because a visitor can fake their address.
- **Limitations:** limits are kept in memory, so they reset when the server restarts and apply per instance. There is no user login. Anyone who finds the site can use the daily allowance. For wider use, add authentication and durable limits, and set a usage alert for the NVIDIA key.

## Verification

```sh
npm run check
npm test
```

Six automated tests cover all 78 unique draws, 64 topic/spread/language combinations, invalid inputs and dates, AI request structure, refusal/incomplete/error responses, and HTTP privacy/origin/consent boundaries. They do not call the real provider.

An optional Playwright test checks 320/390/768/1440px layouts, both languages, 3/4-card flows, keyboard selection, safe text rendering, downloads, dialogs, and mocked AI consent/error/retry behavior. Run it with a separately installed Playwright and an installed browser:

```sh
# Start the app in another terminal, then:
node tests/browser/smoke.mjs
```

The optional script defaults to the installed Microsoft Edge browser. Set `BROWSER_CHANNEL=chrome` to use Chrome, and `TEST_URL` to test a different local port. `PLAYWRIGHT_MODULE` can point to an already-installed Playwright module URL. Screenshots are written to the ignored `tests/browser/.artifacts/` directory.

Run `node tests/browser/motion.mjs` for the additional normal-motion and reduced-motion checks. It exercises automatic reshuffling, duplicate-click protection, persistent deck elements, face-down reveal states, responsive layouts and hero image fallback behavior without a paid API call.

Run `node tests/browser/shuffle-variants.mjs` to verify all five styles share 1900ms timing, retain mobile fit, keep particles bounded, and clean up on completion or cancellation. Run `node tests/browser/stepper.mjs` to check enabled/disabled hover, keyboard focus, touch behavior, and reduced motion.

## Copy individual files

All files are provided separately in this folder. `SOURCE_CODE.md` additionally contains their exact UTF-8 source in separate labeled code blocks, including the original JSON dataset. Create the same relative paths when copying them. The project can be run directly without copying from that document.

After source edits, run `npm run export:source` to regenerate the copyable reference.
