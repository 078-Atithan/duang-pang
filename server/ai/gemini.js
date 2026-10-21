import { validateReading } from "../../js/reading/validate.js"
import { RequestError } from "../errors.js"
import { SYSTEM_PROMPT, buildReadingInput } from "./prompt.js"

export async function generateAiReading(
  payload,
  { apiKey, model, fetchImpl = fetch }
) {
  const count = payload.cardIds.length
  const cardFields = [
    "position",
    "img",
    "cardName",
    "meaning",
    "reflection",
    "prompt"
  ]
  // Gemini's OpenAPI-style schema; cards come before summary so the summary is written last.
  const schema = {
    type: "OBJECT",
    required: ["cards", "summary"],
    propertyOrdering: ["cards", "summary"],
    properties: {
      cards: {
        type: "ARRAY",
        minItems: count,
        maxItems: count,
        items: {
          type: "OBJECT",
          required: cardFields,
          propertyOrdering: cardFields,
          properties: Object.fromEntries(
            cardFields.map((field) => [
              field,
              field === "img"
                ? { type: "STRING", format: "enum", enum: payload.cardIds }
                : { type: "STRING" }
            ])
          )
        }
      },
      summary: { type: "STRING" }
    }
  }
  const upstream = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(buildReadingInput(payload)) }]
          }
        ],
        // Thinking tokens count against maxOutputTokens, so leave generous headroom.
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.8,
          maxOutputTokens: 8192
        }
      })
    }
  )
  // Do not forward provider error bodies: they may expose internal configuration. Map the status to a stable code.
  if (!upstream.ok) {
    if (upstream.status === 429)
      throw new RequestError(
        "The AI service has reached its usage limit. Please try again later.",
        503,
        "quota"
      )
    if ([500, 502, 503, 504].includes(upstream.status))
      throw new RequestError(
        "The AI service is busy. Please try again shortly.",
        503,
        "busy"
      )
    if ([400, 401, 403, 404].includes(upstream.status))
      throw new RequestError(
        "The AI service is not configured correctly",
        502,
        "config"
      )
    throw new RequestError(
      "AI provider could not complete this reading",
      502,
      "provider"
    )
  }
  const data = await upstream.json()
  const candidate = data.candidates?.[0]
  if (
    data.promptFeedback?.blockReason ||
    ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(
      candidate?.finishReason
    )
  ) {
    throw new RequestError(
      "This question could not be interpreted. Please rephrase it.",
      422,
      "blocked"
    )
  }
  if (candidate?.finishReason !== "STOP")
    throw new RequestError("The AI response was incomplete", 502, "incomplete")
  const output = (candidate.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
  try {
    const parsed = JSON.parse(output)
    const cards = parsed.cards.map(
      ({ img, cardName, meaning, reflection, prompt }) => ({
        img,
        cardName,
        meaning,
        reflection,
        prompt
      })
    )
    return validateReading(
      {
        summary: parsed.summary,
        cards,
        mode: "ai",
        language: payload.language
      },
      payload.cardIds
    )
  } catch {
    throw new RequestError(
      "The AI response did not match the chosen cards",
      502,
      "invalid_response"
    )
  }
}
