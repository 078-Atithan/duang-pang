import { readFile } from "node:fs/promises"
import { validateDeck } from "../js/reading/deck.js"

// The trusted deck, loaded once. Card details sent to the AI come from here, never from the browser.
export const deck = validateDeck(
  JSON.parse(
    await readFile(
      new URL("../assets/data/tarot-images.json", import.meta.url),
      "utf8"
    )
  )
)
