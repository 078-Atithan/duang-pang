// Local mode: the drawn cards and their traditional meanings only. Nothing about the visitor
// (name, question, details, topic) is used, so it never looks like a personal prediction.
export function createLocalReading(payload, cards) {
  return {
    mode: "demo",
    language: payload.language,
    cards: cards.map((card) => ({ img: card.img })),
    summary: ""
  }
}
