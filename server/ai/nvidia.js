// Models hosted on NVIDIA NIM (Nemotron Super and Ultra), an OpenAI-compatible chat completions API.
import { SYSTEM_PROMPT, buildReadingInput } from "./prompt.js"
import { CARD_FIELDS, blockedError, incompleteError, statusError, toReading } from "./shared.js"

export const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

function readingSchema(cardIds) {
  return {
    type: "object",
    additionalProperties: false,
    // Cards come before the summary so the summary is written last.
    required: ["cards", "summary"],
    properties: {
      cards: {
        type: "array",
        minItems: cardIds.length,
        maxItems: cardIds.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: CARD_FIELDS,
          properties: Object.fromEntries(
            CARD_FIELDS.map((field) => [
              field,
              field === "img" ? { type: "string", enum: cardIds } : { type: "string" }
            ])
          )
        }
      },
      summary: { type: "string" }
    }
  }
}

export async function generateAiReading(payload, { apiKey, model, timeoutMs = 90000, fetchImpl = fetch, systemPrompt = SYSTEM_PROMPT }) {
  const upstream = await fetchImpl(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: 4096,
      // Skip the separate thinking pass: it adds tokens and time without helping this task.
      // Nemotron reads `enable_thinking`; `thinking` covers DeepSeek-style models. Each ignores the other.
      chat_template_kwargs: { thinking: false, enable_thinking: false },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(buildReadingInput(payload)) }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "tarot_reading", strict: true, schema: readingSchema(payload.cardIds) }
      }
    })
  })
  if (!upstream.ok) throw statusError(upstream.status)
  const data = await upstream.json()
  const choice = data.choices?.[0]
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) throw blockedError()
  if (choice?.finish_reason !== "stop") throw incompleteError()
  return toReading(choice.message.content, payload)
}
