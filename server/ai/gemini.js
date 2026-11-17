// Google Gemini (generateContent with a response schema).
import { SYSTEM_PROMPT, buildReadingInput } from "./prompt.js"
import { CARD_FIELDS, blockedError, incompleteError, statusError, toReading } from "./shared.js"

export const DEFAULT_MODEL = "gemini-flash-latest"
const BLOCKED_REASONS = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"]

// Gemini's OpenAPI-style schema; cards come before summary so the summary is written last.
function readingSchema(cardIds) {
  return {
    type: "OBJECT",
    required: ["cards", "summary"],
    propertyOrdering: ["cards", "summary"],
    properties: {
      cards: {
        type: "ARRAY",
        minItems: cardIds.length,
        maxItems: cardIds.length,
        items: {
          type: "OBJECT",
          required: CARD_FIELDS,
          propertyOrdering: CARD_FIELDS,
          properties: Object.fromEntries(
            CARD_FIELDS.map((field) => [
              field,
              field === "img" ? { type: "STRING", format: "enum", enum: cardIds } : { type: "STRING" }
            ])
          )
        }
      },
      summary: { type: "STRING" }
    }
  }
}

export async function generateAiReading(
  payload,
  { apiKey, model = DEFAULT_MODEL, timeoutMs = 45000, fetchImpl = fetch, systemPrompt = SYSTEM_PROMPT }
) {
  const upstream = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(buildReadingInput(payload)) }] }],
        // Thinking tokens count against maxOutputTokens, so leave generous headroom.
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: readingSchema(payload.cardIds),
          temperature: 0.8,
          maxOutputTokens: 8192
        }
      })
    }
  )
  if (!upstream.ok) throw statusError(upstream.status)
  const data = await upstream.json()
  const candidate = data.candidates?.[0]
  if (data.promptFeedback?.blockReason || BLOCKED_REASONS.includes(candidate?.finishReason)) throw blockedError()
  if (candidate?.finishReason !== "STOP") throw incompleteError()
  const text = (candidate.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
  return toReading(text, payload)
}
