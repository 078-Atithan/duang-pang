import { getLanguage, t } from "./i18n/index.js"

export const $ = (selector) => document.querySelector(selector)
// Escape every dynamic value before composing markup, including provider output.
export const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]
  )
export const label = (key, values) => escapeHtml(t(key, values))
export const named = (item) => item[getLanguage()]
export const announce = (message) => {
  $("#announcement").textContent = message
}
export const actionButton = (
  action,
  text,
  variant = "button-dark",
  extra = ""
) =>
  `<button type="button" class="button ${variant}" data-action="${action}" ${extra}>${text}</button>`

export function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}
