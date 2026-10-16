# Duang Pang

A responsive, bilingual tarot website built with semantic HTML, CSS variables, and native ES modules. The default experience works locally without an API key. An optional Node.js server can create AI readings with the Google Gemini API.

## Start locally

Requirements: **Node.js 22.9 or later**. No dependencies or build step are required for the application.

Open a terminal **inside this `duang-pang` folder** and run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop the server with Ctrl+C.

Do not double-click `index.html`: ES modules and JSON fetching need an HTTP server. For a frontend-only demo, the public files also work with a static HTTP server, such as VS Code Live Server. Without the optional API, the interface automatically uses local demo mode.

## Project architecture

```text
duang-pang/
├── index.html                    Semantic page and application landmarks
├── css/
│   ├── style.css                 Magical palette, type and responsive layouts
│   ├── motion.css                Hero, stars, buttons and card reveal effects
│   └── cosmic.css                Site-wide constellations and celestial styling
├── js/
│   ├── app.js                    Form state, drawing interaction and rendering
│   ├── config.js                 Public configuration, topics, spreads and icons
│   ├── card-text.js              Thai names, keywords, meanings and prompts for 78 cards
│   ├── deck.js                   Deck validation and unbiased random shuffling
│   ├── effects.js                Continuous shuffle, card flights and reveal effects
│   ├── hero.js                   Real hero scan loading with card-back fallback
│   ├── i18n.js                   English / Thai interface strings
│   └── reading.js                Local demo and optional API client
├── assets/
│   ├── favicon.svg
│   ├── card-back.svg             Original face-down card artwork
│   ├── constellations.svg         Decorative star map
│   ├── celestial-seal.svg         Decorative moon and star seal
│   ├── data/
│   │   └── tarot-images.json     Your original dataset, unchanged
│   └── images/
│       └── tarot/
│           ├── README.md         Card image details and replacement guidance
│           ├── filenames.txt     Exact expected filenames
│           └── *.jpg             All 78 supplied card scans
├── server/
│   ├── server.js                 Local server and optional AI adapter
│   └── validation.js             Input validation against the trusted deck
├── tests/
│   ├── reading.test.js           Deck, readings, validation and HTTP tests
│   ├── browser-smoke.mjs         Optional browser / responsive checks
│   ├── motion-browser.mjs        Normal/reduced motion and animation checks
│   ├── shuffle-variants.mjs      All five styles, timing, particles and cleanup
│   └── stepper-browser.mjs       Step hover, focus and touch behavior
├── scripts/
│   └── export-source.mjs         Regenerates the copyable source reference
├── package.json
├── .env.example                  Optional server settings; no secrets
├── .gitignore
├── README.md
└── SOURCE_CODE.md                Each source file in its own copyable block
```

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

The five requested colors are exposed as CSS variables in `css/style.css`: `#F6FFE9` ivory, `#F2E0A4` gold, `#CAC5E5` lavender, `#A230A4` magenta, and `#290087` purple. Deeper purple and muted text shades are derived companions for readable contrast. The header has larger links and more spacing, and the description has a centered introduction above three balanced steps.

The hero has independently floating cards, a luminous title, celestial rings, star twinkles, and an ambient aura. Buttons have hover sheen and press feedback. Motion is isolated in `css/motion.css` and `js/effects.js` for easy tuning. `css/cosmic.css` adds constellation backgrounds, a moon seal, illuminated form borders, and celestial result panels and footer. The deck rests directly on the light reading surface with no background panel. While shuffling, sparse 3px gold/lavender motes and a few tiny stars drift away from the moving card edges, with a narrow sheen on the visible packets. Effects fade before selection resumes; there are no stacked neon halos. Deck cards are about 18% larger, with responsive fan angles to retain mobile fit. Enabled progress steps respond to hover and keyboard focus with a soft color wash and a small number-circle lift; future steps stay inactive.

Click Shuffle once to start a reading. Each shuffle randomly selects one of five motions: overhand, riffle, Hindu, strip, or weave. Every style uses the same `SHUFFLE_DURATION` of **1900ms** in `js/effects.js`, including automatic reshuffles. Cards peel off individually at staggered times: overhand and Hindu transfers build a receiving stack, strip pulls cards out to alternating sides, and riffle/weave interleave the two halves. Each card lifts, travels, and lands with its own layer order; temporary stardust follows the moving card edges. The same deck elements remain mounted as the cards gather, shuffle, square up, and fan out in a single animation timeline, with no separate spread-animation restart. Cards hold their initial pose during animation delays, and selection no longer changes their vertical position before the flight. Selecting a card sends it into its position with a short sparkle burst, then automatically shuffles the remaining deck into the next choice. Controls lock during transitions to prevent duplicate draws. Results glow and flip from face-down to face-up as each card enters the viewport; lower cards on a phone reveal when you reach them. Changing language does not replay completed reveals.

The website respects the operating system's reduced-motion preference: animations are skipped, all results become readable immediately, and the reading flow stays functional. Particle effects are temporary and removed after playback; hero animations pause offscreen or when the browser tab is hidden.

## Included behavior

- Eight topics: love, finances, career, daily, monthly, wellbeing/health, luck, and friends/relationships.
- Optional question, name, birth date, relationship status, gender and career.
- Three 3-card spreads: Past / Present / Future; Your feelings / Their feelings / Future trends; Cause / Effect / Conclusion.
- One 4-card spread: Current situation / Obstacle / Advice / Conclusion. This uses the primary specification in the requirements document.
- A face-down stack, continuous shuffle-to-fan animation, a card flight into each slot, and automatic reshuffling until the spread is complete.
- Each fan displays 12 randomly sampled cards from the remaining deck. All 78 cards can be drawn; previously selected cards cannot repeat.
- Cards stay face-down until reveal. All cards use upright meanings; reversed draws are not part of this specification.
- Each result card has a prominent numbered role heading (for example, Current situation or Advice) and a short explanation of that position, in English and Thai. Source meanings, contextual reflections, a question to consider, and an overall reflection follow below.
- English and Thai interface controls, downloadable text readings, print styling, and privacy/about dialogs.
- Keyboard navigation, labeled forms, live selection announcements, reduced-motion support, and mobile layouts.

Changing the topic, question, spread, or personal details invalidates an existing draw, so the result always matches the current inputs. Navigating backward without changes preserves the draw. Refreshing clears the session.

## Demo versus AI mode

**Local demo (default):** the browser assembles reflections from the supplied card meanings, the selected topic, and spread positions. It is explicitly labeled as a local demo. It does not make semantic AI predictions about the user's question. All 78 card names, displayed keywords, meanings, and reflection questions have Thai translations in `js/card-text.js`. Switching language rebuilds the demo text immediately while preserving your selected cards, order, and inputs. Downloaded readings use the displayed language. Thai form and result text share the same Tahoma-based font stack; Thai quotes and reflection prompts use normal, non-italic text. The English source JSON and lettering printed on the supplied card images remain unchanged.

**Optional AI:** the server sends verified card context (each card's name, keywords, light and shadow meanings, and its spread position), the topic, the user's question, and only age (calculated from the birth date), gender, relationship status, and occupation to Google Gemini, and only after consent at the reveal step. Name and birth date are never sent. For each position the model returns the card name, its meaning in that position, a reflection, and a reflection question. It requests a new contextual interpretation in the selected language. Source card meanings remain visible separately from the generated interpretation. The UI shows an AI error and lets the user retry with the same cards or explicitly use the local demo. Viewing a completed result does not make a second request. Switching interface language reuses a cached reading when available. Otherwise, a clearly labeled button offers a new AI interpretation of the same cards in the selected language; only clicking it makes another provider request. Completed language versions remain cached in page memory.

To configure AI:

1. Copy `.env.example` to `.env` inside this project.
2. Set `GEMINI_API_KEY` to your own key from [Google AI Studio](https://aistudio.google.com/apikey).
3. Set `GEMINI_MODEL` to a Gemini model that supports structured JSON output, for example `gemini-flash-latest`.
4. Restart `npm start`.

```dotenv
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-flash-latest
PORT=4173
```

**Never put the key in `js/config.js`, HTML, or any browser file.** The application has no frontend API-key field. If either server setting is blank, it stays in demo mode. API usage may incur charges on your provider account.

The adapter calls `generateContent` with a system instruction (`SYSTEM_PROMPT` in `server/server.js`) and a `responseSchema` for [structured output](https://ai.google.dev/gemini-api/docs/structured-output). It validates the returned card order, treats blocked prompts and safety stops as a request to rephrase, and treats any other non-`STOP` finish as incomplete. Google's Gemini API data-handling policies apply.

## API contract

`GET /api/config` returns `{ "mode": "demo" }` or `{ "mode": "ai" }` without exposing credentials.

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

The application does not use analytics, cookies, or persistent browser storage. Profile details, questions, and readings stay in memory. Local demo mode sends none of them to a provider. The optional server does not save reading data or log request bodies. Downloads are created only when requested by the user.

By default the server binds to **127.0.0.1** and permits only loopback Host headers. It protects private files with a static-file allowlist, checks request origins, enforces in-memory AI request limits, and never returns provider error bodies. Do not upload `.env`.

## Hosting

The same code supports three setups. Nothing changes for local use: `npm start` with a `.env` file works as before.

| Setup | Where the page is | Where AI readings come from |
| --- | --- | --- |
| Local | `http://127.0.0.1:4173` from `npm start` | The server on your computer |
| Static demo | GitHub Pages | None. A banner says the site is in demo mode |
| Static site + hosted server | GitHub Pages | A server deployed on Render (or similar) |

The page decides in `js/config.js`: when opened on this computer it always uses the local `/api`. Anywhere else it uses `REMOTE_API_BASE`, or stays in demo mode while that is empty. If the hosted server does not answer (a free Render service sleeps and takes up to a minute to wake), the page shows a banner, keeps checking for about two minutes, and switches to AI as soon as the server responds.

### Deploy the reading server on Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. `render.yaml` configures the service; enter your `GEMINI_API_KEY` when asked. Never commit the key.
3. When the service is live, note its address, for example `https://duang-pang.onrender.com`, and check that `https://duang-pang.onrender.com/api/config` returns `{"mode":"ai"}`.
4. In `js/config.js`, set `REMOTE_API_BASE` to that address followed by `/api`, then commit and push. GitHub Pages redeploys and the Pages site now creates AI readings.

To use another host, set the same environment variables: `HOST=0.0.0.0`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ALLOWED_ORIGINS` (your Pages origin), `ALLOWED_HOSTS` (the server's public hostname; Render's is added automatically) and `TRUST_PROXY=1` behind the platform's proxy.

### Protection on a public server

- **Allowlists:** only `ALLOWED_HOSTS` (plus loopback) are served, and only same-origin pages or `ALLOWED_ORIGINS` may request readings. CORS headers are sent only to allowed origins.
- **Limits:** `READINGS_PER_MINUTE` per visitor, `MAX_CONCURRENT_READINGS` at once, and `DAILY_READING_LIMIT` in total per day (default 200). The daily cap is the main spending control, because a visitor can fake their address.
- **Limitations:** limits are kept in memory, so they reset when the server restarts and apply per instance. There is no user login. Anyone who finds the site can use the daily allowance. For wider use, add authentication and durable limits, and set a budget alert in Google Cloud for the Gemini key.

## Verification

```sh
npm run check
npm test
```

Six automated tests cover all 78 unique draws, 64 topic/spread/language combinations, invalid inputs and dates, AI request structure, refusal/incomplete/error responses, and HTTP privacy/origin/consent boundaries. They do not call the real provider.

An optional Playwright test checks 320/390/768/1440px layouts, both languages, 3/4-card flows, keyboard selection, safe text rendering, downloads, dialogs, and mocked AI consent/error/retry behavior. Run it with a separately installed Playwright and an installed browser:

```sh
# Start the app in another terminal, then:
node tests/browser-smoke.mjs
```

The optional script defaults to the installed Microsoft Edge browser. Set `BROWSER_CHANNEL=chrome` to use Chrome, and `TEST_URL` to test a different local port. `PLAYWRIGHT_MODULE` can point to an already-installed Playwright module URL. Screenshots are written to the ignored `tests/.artifacts/` directory.

Run `node tests/motion-browser.mjs` for the additional normal-motion and reduced-motion checks. It exercises automatic reshuffling, duplicate-click protection, persistent deck elements, face-down reveal states, responsive layouts and hero image fallback behavior without a paid API call.

Run `node tests/shuffle-variants.mjs` to verify all five styles share 1900ms timing, retain mobile fit, keep particles bounded, and clean up on completion or cancellation. Run `node tests/stepper-browser.mjs` to check enabled/disabled hover, keyboard focus, touch behavior, and reduced motion.

## Copy individual files

All files are provided separately in this folder. `SOURCE_CODE.md` additionally contains their exact UTF-8 source in separate labeled code blocks, including the original JSON dataset. Create the same relative paths when copying them. The project can be run directly without copying from that document.

After source edits, run `npm run export:source` to regenerate the copyable reference.
