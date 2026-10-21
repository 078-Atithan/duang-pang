import { readFile } from "node:fs/promises"
import { validateDeck } from "../js/reading/deck.js"

// Shared fixtures for the unit tests.
export const deck = validateDeck(
  JSON.parse(
    await readFile(
      new URL("../assets/data/tarot-images.json", import.meta.url),
      "utf8"
    )
  )
)
export const payload = () => ({
  topic: "career",
  spread: "timeline",
  cardIds: ["m00.jpg", "m01.jpg", "m02.jpg"],
  language: "en",
  question: "How can I approach my next project?",
  profile: {
    name: "Alex",
    birthDate: "1990-06-15",
    status: "single",
    gender: "other",
    career: "Designer"
  },
  consent: true,
  actions: []
})
export const responseFixture = (ids = payload().cardIds) => ({
  summary: "Reflect, then choose a practical step.",
  cards: ids.map((img) => ({
    img,
    reflection: "Consider a new perspective.",
    prompt: "What is within your control?"
  }))
})
export const providerResponse = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
export const geminiResponse = (text, finishReason = "STOP") => ({
  candidates: [
    {
      finishReason,
      content: { role: "model", parts: [{ text, thoughtSignature: "opaque" }] }
    }
  ]
})
