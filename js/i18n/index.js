import { COPY } from "./strings.js"

let language = "en"
export const getLanguage = () => language
export const setLanguage = (value) => {
  language = value === "th" ? "th" : "en"
}
export const local = (values, lang = language) => values[lang === "th" ? 1 : 0]
export function t(key, values = {}) {
  const template = local(COPY[key] || [key, key])
  return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}

export function translatePage() {
  document.documentElement.lang = language
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n)
  })
  const toggle = document.querySelector("#language-toggle")
  toggle.textContent = language === "en" ? "EN ⌄" : "ไทย ⌄"
  toggle.setAttribute(
    "aria-label",
    language === "en" ? "Switch language to Thai" : "Switch language to English"
  )
}
