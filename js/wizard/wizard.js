// The five-step reading wizard: stepper, shared step chrome and navigation.
import { CONFIG } from "../config.js"
import { state, session, motionLocked } from "../state.js"
import { $, label, actionButton } from "../dom.js"
import {
  renderTopic,
  renderQuestion,
  renderSpread,
  renderDetails
} from "./steps.js"
import { renderDraw } from "./draw.js"
import { bindCareerPicker } from "./career-picker.js"

export function heading(title, description) {
  return `<div class="wizard-heading"><h3 id="step-title" tabindex="-1">${label(title)}</h3><p>${label(description)}</p></div>`
}
export function footer(hint, nextText = "continue") {
  return `<div class="wizard-footer">${state.step > 0 ? actionButton("back", `← ${label("back")}`, "button-plain") : `<span class="helper">✧ ${label(hint)}</span>`}<button type="submit" class="button button-dark" id="continue-button" ${state.step === 0 && !state.topic ? "disabled" : ""}>${label(nextText)} <span aria-hidden="true">→</span></button></div>`
}

export function renderStepper() {
  $("#stepper").innerHTML = Array.from({ length: 5 }, (_, index) => {
    const current = index === state.step
    const complete = index < state.step
    return `<li class="${current ? "active" : complete ? "complete" : ""}"><button type="button" class="step-button" data-step="${index}" ${current ? 'aria-current="step"' : ""} ${index > state.step || motionLocked() ? "disabled" : ""}><span class="step-number" aria-hidden="true">${complete ? "✓" : `0${index + 1}`}</span><span>${label(`step${index}`)}</span></button></li>`
  }).join("")
}

// Say plainly when no reading server answered, so a static copy (GitHub Pages) is not mistaken for AI.
function modeBanner() {
  if (
    session.serverConfig.mode !== "demo" ||
    session.serverConfig.reason !== "unavailable"
  )
    return ""
  return `<p class="mode-bar mode-banner" role="status"><span aria-hidden="true">✧</span>${label(CONFIG.remoteApi ? "remoteDownBanner" : "staticDemoBanner")}</p>`
}

export function renderWizard({ focus = false } = {}) {
  renderStepper()
  $("#language-toggle").disabled = motionLocked()
  $("#wizard").setAttribute("aria-busy", String(motionLocked()))
  $("#wizard").innerHTML =
    modeBanner() +
    [renderTopic, renderQuestion, renderSpread, renderDetails, renderDraw][
      state.step
    ]()
  if (state.step === 3) bindCareerPicker()
  if (focus) $("#step-title")?.focus({ preventScroll: true })
}

export function changeStep(step) {
  if (motionLocked() || step < 0 || step > 4) return
  state.step = step
  renderWizard({ focus: true })
  $("#reading").scrollIntoView({ behavior: "smooth", block: "start" })
}
