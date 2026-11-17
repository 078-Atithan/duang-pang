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
// An OpenAI-style chat completion, as returned by NVIDIA NIM.
export const chatResponse = (content, finishReason = "stop") => ({
  choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content } }]
})

// Diviners for server tests: real NVIDIA adapter, fake keys and models, short timeouts.
import * as nvidiaProvider from "../server/ai/nvidia.js"
export const testDiviners = (ids = [1]) =>
  ids.map((id) => ({
    id,
    provider: nvidiaProvider,
    apiKey: `private-test-key-${id}`,
    model: `test-model-${id}`,
    timeoutMs: 5000,
    estimate: [1, 2]
  }))
