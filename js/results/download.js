// "Save reading": a plain-text copy of the current reading in the displayed language.
import { SPREADS } from "../data/spreads.js"
import { getLanguage, t, local } from "../i18n/index.js"
import { cardText } from "../i18n/card-text.js"
import { state, session } from "../state.js"
import { localToday } from "../dom.js"

export function downloadReading() {
  if (!state.result) return
  const payload = state.resultPayload
  const chosenSpread = SPREADS.find((item) => item.id === payload.spread)
  const lines = [
    "DUANG PANG",
    t(state.result.mode === "ai" ? "aiBadge" : "demoBadge"),
    `${t("readingLanguage")}: ${state.result.language === "th" ? "ไทย" : "English"}`,
    ...(state.result.mode === "ai" ? [payload.question] : []),
    ""
  ]
  state.result.cards.forEach((entry, index) => {
    const card = session.deck.find((item) => item.img === entry.img)
    const text = cardText(card, getLanguage())
    lines.push(
      `${index + 1}. ${local(chosenSpread.positions)[index]} — ${text.name}`,
      `${t("cardMeaning")}: ${text.meanings.join(getLanguage() === "th" ? " " : ". ")}`,
      ...(entry.meaning ? [`${t("positionMeaning")}: ${entry.meaning}`] : []),
      ...(state.result.mode === "ai" ? [entry.reflection, entry.prompt] : []),
      ""
    )
  })
  lines.push(state.result.mode === "ai" ? state.result.summary : t("localSummary"), "", t("readingFootnote"))
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `duang-pang-reading-${localToday()}.txt`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
