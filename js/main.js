// Entry point: loads the deck and server mode, then routes page events to each feature.
import { CONFIG } from "./config.js"
import { getLanguage, setLanguage, t, translatePage } from "./i18n/index.js"
import { validateDeck } from "./reading/deck.js"
import { getServerConfig } from "./reading/api.js"
import { state, session, resetState, motionLocked } from "./state.js"
import { $, label, actionButton } from "./dom.js"
import { renderWizard, changeStep } from "./wizard/wizard.js"
import { validateDetails } from "./wizard/steps.js"
import { beginShuffle, pickCard, clearDraw } from "./wizard/draw.js"
import { reveal, generateReadingLanguage } from "./results/reveal.js"
import { renderResults, renderEmptyResults } from "./results/results.js"
import { downloadReading } from "./results/download.js"
import { openDialog } from "./ui/dialogs.js"
import { initializeHero } from "./ui/hero.js"
import { initializePageMotion } from "./ui/effects.js"

// A hosted server on a free plan can take a minute to wake up; keep checking and switch to AI once it answers.
async function watchRemoteServer() {
  for (
    let attempt = 0;
    attempt < 12 && session.serverConfig.mode !== "ai";
    attempt += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, 10000))
    const config = await getServerConfig({ timeout: 8000 })
    if (config.mode === "demo" && config.reason === "unavailable") continue
    session.serverConfig = config
    if (!motionLocked() && state.phase === "stacked" && !state.result)
      renderWizard()
    return
  }
}

document.addEventListener("input", (event) => {
  const { name, value } = event.target
  if (name === "question") {
    if (state.question !== value && state.chosen.length) clearDraw()
    state.question = value
    $("#question-count").textContent =
      `${value.length}/${CONFIG.maxQuestionLength}`
  } else if (Object.hasOwn(state.profile, name)) {
    if (state.profile[name] !== value && state.chosen.length) clearDraw()
    state.profile[name] = value
    event.target.setCustomValidity("")
  }
})

document.addEventListener("change", (event) => {
  const { name, value, checked } = event.target
  if (name === "topic") {
    if (state.topic !== value) clearDraw()
    state.topic = value
    $("#continue-button").disabled = false
  } else if (name === "count") {
    clearDraw()
    state.count = Number(value)
    state.spread = state.count === 4 ? "guidance" : "timeline"
    renderWizard()
    $(`input[name="count"][value="${state.count}"]`)?.focus()
  } else if (name === "spread") {
    if (state.spread !== value) clearDraw()
    state.spread = value
  } else if (name === "consent") {
    state.consent = checked
    $('[data-action="reveal"]').disabled = !checked
  }
})

document.addEventListener("submit", (event) => {
  if (event.target.id !== "step-form") return
  event.preventDefault()
  if (state.step === 0 && !state.topic) return
  if (state.step === 3 && !validateDetails()) return
  if (event.target.reportValidity()) changeStep(state.step + 1)
})

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-dialog]")
  if (!target || target.disabled) return
  if (target.id === "language-toggle") {
    if (motionLocked()) return
    setLanguage(getLanguage() === "en" ? "th" : "en")
    translatePage()
    if (session.deck.length) renderWizard()
    renderResults()
    return
  }
  if (
    state.busy &&
    ["restart", "save", "print"].includes(target.dataset.action)
  )
    return
  if (target.dataset.dialog) return openDialog(target.dataset.dialog)
  if (target.matches(".dialog-close")) return $("#info-dialog").close()
  if (
    target.dataset.step !== undefined &&
    Number(target.dataset.step) <= state.step
  )
    return changeStep(Number(target.dataset.step))
  if (target.dataset.cardIndex !== undefined)
    return pickCard(Number(target.dataset.cardIndex))
  switch (target.dataset.action) {
    case "back":
      changeStep(state.step - 1)
      break
    case "example":
      if (state.chosen.length) clearDraw()
      state.question = t("example")
      renderWizard()
      $("#question").focus()
      break
    case "shuffle":
      beginShuffle()
      break
    case "reveal":
      reveal()
      break
    case "demo":
      reveal({ demo: true })
      break
    case "reading-language":
      generateReadingLanguage()
      break
    case "save":
      downloadReading()
      break
    case "print":
      window.print()
      break
    case "restart":
      clearDraw()
      resetState()
      renderEmptyResults()
      changeStep(0)
      break
    case "retry":
      initialize()
      break
    default:
      break
  }
})

async function initialize() {
  $("#year").textContent = new Date().getFullYear()
  $("#wizard").setAttribute("aria-busy", "true")
  $("#wizard").innerHTML = `<p class="loading-message">${label("loading")}</p>`
  try {
    const [deckResponse, config] = await Promise.all([
      fetch(CONFIG.deckUrl, { signal: AbortSignal.timeout(10000) }),
      getServerConfig({ timeout: CONFIG.remoteApi ? 5000 : 2500 })
    ])
    if (!deckResponse.ok) throw new Error("Deck could not be loaded")
    session.deck = validateDeck(await deckResponse.json())
    session.serverConfig = config
    renderWizard()
    if (CONFIG.remoteApi && config.reason === "unavailable") watchRemoteServer()
  } catch {
    $("#wizard").setAttribute("aria-busy", "false")
    $("#wizard").innerHTML =
      `<p class="error-message" role="alert">${label("deckError")}</p><div class="result-actions">${actionButton("retry", label("retry"))}</div>`
  }
}

initializeHero()
initializePageMotion()
initialize()
