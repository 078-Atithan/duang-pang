// The AI models that read cards, in the order they are tried. Visitors only ever see "Diviner 1/2/3";
// model names stay on the server. A diviner without an API key is left out.
// Order follows benchmark v2 (2026-11-17): Nemotron Super was fastest and most reliable;
// Gemini was overloaded in every run, so it is the last fallback.
import * as gemini from "./gemini.js"
import * as nvidia from "./nvidia.js"

export function configuredDiviners(env = process.env) {
  return [
    {
      id: 1,
      provider: nvidia,
      apiKey: env.NVIDIA_API_KEY,
      model: env.NEMOTRON_MODEL || "nvidia/nemotron-3.5-super-vl-120b-a12b",
      // Nemotron Super answered in 5-12 seconds, with an occasional stalled request.
      timeoutMs: 90000,
      estimate: [10, 60]
    },
    {
      id: 2,
      provider: nvidia,
      apiKey: env.NVIDIA_API_KEY,
      model: env.ULTRA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      // Nemotron Ultra (replaced DeepSeek, retired by NVIDIA on 2026-11-16) answered in 22-40 seconds.
      timeoutMs: 120000,
      estimate: [20, 60]
    },
    {
      id: 3,
      provider: gemini,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || gemini.DEFAULT_MODEL,
      // Gemini answered in 13-16 seconds when available, but was often overloaded (HTTP 503).
      timeoutMs: 45000,
      estimate: [10, 30]
    }
  ].filter((diviner) => diviner.apiKey)
}

/** What the browser may know about each diviner: no keys, no model names. */
export const publicDiviners = (diviners) =>
  diviners.map(({ id, estimate, timeoutMs }) => ({ id, estimate, timeoutSeconds: timeoutMs / 1000 }))
