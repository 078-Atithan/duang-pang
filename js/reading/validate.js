// Shared by the browser and the server: a reading must match the chosen cards, in order.
export function validateReading(result, cardIds) {
  if (
    !result ||
    !["demo", "ai"].includes(result.mode) ||
    !["en", "th"].includes(result.language) ||
    typeof result.summary !== "string" ||
    !result.summary.trim() ||
    result.summary.length > 10000 ||
    !Array.isArray(result.cards) ||
    result.cards.length !== cardIds.length
  )
    throw new Error("Invalid reading response")
  result.cards.forEach((card, index) => {
    if (
      card.img !== cardIds[index] ||
      !["reflection", "prompt"].every(
        (key) =>
          typeof card[key] === "string" &&
          card[key].trim() &&
          card[key].length <= 6000
      ) ||
      !["cardName", "meaning"].every(
        (key) =>
          card[key] === undefined ||
          (typeof card[key] === "string" && card[key].length <= 6000)
      )
    ) {
      throw new Error("Reading does not match the selected cards")
    }
  })
  return result
}
