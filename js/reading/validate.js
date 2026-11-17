// Shared by the browser and the server: a reading must match the chosen cards, in order.
// AI readings must also contain text for every card; local readings carry the cards only.
const textField = (value, max) => typeof value === "string" && value.trim() && value.length <= max
const optionalText = (value) => value === undefined || (typeof value === "string" && value.length <= 6000)

export function validateReading(result, cardIds) {
  if (
    !result ||
    !["demo", "ai"].includes(result.mode) ||
    !["en", "th"].includes(result.language) ||
    (result.mode === "ai" && !textField(result.summary, 10000)) ||
    !Array.isArray(result.cards) ||
    result.cards.length !== cardIds.length
  )
    throw new Error("Invalid reading response")
  result.cards.forEach((card, index) => {
    const aiTextOk =
      result.mode !== "ai" || (textField(card.reflection, 6000) && textField(card.prompt, 6000))
    if (card.img !== cardIds[index] || !aiTextOk || !optionalText(card.cardName) || !optionalText(card.meaning)) {
      throw new Error("Reading does not match the selected cards")
    }
  })
  return result
}
