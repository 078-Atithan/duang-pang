// Pieces every AI provider shares: the reading's JSON shape, error codes and the final check.
import { validateReading } from "../../js/reading/validate.js"
import { RequestError } from "../errors.js"

export const CARD_FIELDS = ["position", "img", "cardName", "meaning", "reflection", "prompt"]

// Do not forward provider error bodies: they may expose internal configuration. Map the status to a stable code.
export function statusError(status) {
  if (status === 429)
    return new RequestError("The AI service has reached its usage limit. Please try again later.", 503, "quota")
  if ([500, 502, 503, 504].includes(status))
    return new RequestError("The AI service is busy. Please try again shortly.", 503, "busy")
  if ([400, 401, 403, 404, 422].includes(status))
    return new RequestError("The AI service is not configured correctly", 502, "config")
  return new RequestError("AI provider could not complete this reading", 502, "provider")
}

export const blockedError = () =>
  new RequestError("This question could not be interpreted. Please rephrase it.", 422, "blocked")
export const incompleteError = () => new RequestError("The AI response was incomplete", 502, "incomplete")

/** The JSON object in a reply, ignoring any ```json fences or text around it. */
export function extractJson(text = "") {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end < start) throw new Error("No JSON object in the reply")
  return JSON.parse(text.slice(start, end + 1))
}

/** Keeps only the fields the page shows and checks the cards match the draw, in order. */
export function toReading(text, payload) {
  try {
    const parsed = extractJson(text)
    const cards = parsed.cards.map(({ img, cardName, meaning, reflection, prompt }) => ({
      img,
      cardName,
      meaning,
      reflection,
      prompt
    }))
    return validateReading(
      { summary: parsed.summary, cards, mode: "ai", language: payload.language },
      payload.cardIds
    )
  } catch {
    throw new RequestError("The AI response did not match the chosen cards", 502, "invalid_response")
  }
}
