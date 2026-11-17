// Asks whether to keep waiting for the next diviner after one fails.
// Resolves true to keep waiting, false for local mode (including Esc).
import { t } from "../i18n/index.js"
import { $ } from "../dom.js"
import { estimateText } from "../results/diviners.js"

const REASON_KEYS = { quota: "switchReason_quota", busy: "switchReason_busy", timeout: "switchReason_timeout" }

export function askToSwitch(failed, next, code) {
  const dialog = $("#diviner-dialog")
  $("#diviner-dialog-title").textContent = t("switchTitle", { n: failed.id })
  $("#diviner-dialog-body").textContent = `${t(REASON_KEYS[code] || "switchReason_other", { n: failed.id })} ${t("switchOffer", { next: next.id, estimate: estimateText(next) })}`
  $("#diviner-wait").textContent = t("switchWait", { next: next.id })
  $("#diviner-local").textContent = t("switchLocal")
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "wait"), { once: true })
    dialog.returnValue = ""
    dialog.showModal()
  })
}
