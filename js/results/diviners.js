// Diviner helpers for the page: which diviners the server offers, and how long they usually take.
import { t } from "../i18n/index.js"
import { session } from "../state.js"

export const divinerById = (id) => session.serverConfig.diviners?.find((diviner) => diviner.id === id)

/** "10–30 seconds" or "2–5 minutes", from the server's estimate in seconds. */
export function estimateText(diviner) {
  const [low, high] = diviner?.estimate ?? [10, 60]
  return high >= 120
    ? t("estimateMinutes", { low: Math.round(low / 60), high: Math.round(high / 60) })
    : t("estimateSeconds", { low, high })
}

/** "0:42 so far" */
export function elapsedText(startedAt) {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  return t("elapsed", { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` })
}
