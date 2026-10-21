// Footer dialogs: About, Privacy and Disclaimer share one <dialog> element.
import { t } from "../i18n/index.js"
import { $ } from "../dom.js"

export function openDialog(kind) {
  const keys = {
    about: ["footerAbout", "aboutDialog"],
    privacy: ["footerPrivacy", "privacyDialog"],
    disclaimer: ["footerDisclaimer", "disclaimerDialog"]
  }
  if (!keys[kind]) return
  $("#dialog-title").textContent = t(keys[kind][0])
  $("#dialog-body").textContent = t(keys[kind][1])
  $("#info-dialog").showModal()
}
