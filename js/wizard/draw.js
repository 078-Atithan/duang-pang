// Step 5 of the wizard: shuffling, picking cards and the reveal panel.
import { CONFIG } from "../config.js"
import { t, local } from "../i18n/index.js"
import { availableCards, shuffle } from "../reading/deck.js"
import { shuffleIntoFan, flyCardToSlot, closeDeck } from "../ui/effects.js"
import { state, session, motionLocked, currentSpread } from "../state.js"
import { $, escapeHtml, label, announce, actionButton } from "../dom.js"
import { renderWizard, renderStepper } from "./wizard.js"
import { errorText } from "../results/errors.js"
import { renderEmptyResults } from "../results/results.js"
import { divinerById, estimateText, elapsedText } from "../results/diviners.js"

const positions = () => local(currentSpread().positions)

function renderSlots() {
  return `<div class="selected-slots ${state.busy ? "is-waiting" : ""}" aria-label="${label("drawCount", { chosen: state.chosen.length, total: state.count })}">${positions()
    .map(
      (position, index) =>
        `<div class="selected-slot"><div class="slot-card ${state.chosen[index] ? "is-filled" : ""}" style="--i:${index}" data-slot="${index}">${state.chosen[index] ? `<img src="${CONFIG.cardBack}" alt="${label("hiddenCard")}">` : index + 1}</div><span>${escapeHtml(position)}</span></div>`
    )
    .join("")}</div>`
}

function waitingMarkup() {
  if (!state.diviner) return `<p class="waiting-status" role="status">${label("revealing")}</p>`
  const estimate = estimateText(divinerById(state.diviner))
  return `<p class="waiting-status" role="status">${label("waitingDiviner", { n: state.diviner, estimate })} <span class="waiting-elapsed" aria-hidden="true">${escapeHtml(elapsedText(state.waitStarted))}</span></p>`
}

export function renderDraw() {
  const ready = state.chosen.length === state.count
  const ai = session.serverConfig.mode === "ai"
  const canReveal = !state.busy && (state.result || !ai || state.consent)
  const deckMarkup = `<div class="deck-stage ${state.phase}" role="group" aria-label="${label("step4")}">${Array.from({ length: 12 }, (_, index) => `<button type="button" class="deck-card" style="--i:${index}" data-card-index="${index}" aria-label="${label("chooseCard", { number: index + 1 })}" ${state.phase !== "fanned" ? "disabled" : ""}><img src="${CONFIG.cardBack}" alt=""></button>`).join("")}</div><div class="draw-action">${state.phase === "fanned" ? `<p class="status-message">${label("pickHint")}</p>` : actionButton("shuffle", label("shuffle"), "button-dark")}</div>`
  const readyMarkup = `<div class="result-ready"><h3>${label("readyTitle")}</h3><p>${label("readyDescription")}</p>${actionButton("reveal", `${label(state.busy ? "revealing" : state.result ? "viewReading" : state.error ? "retry" : "reveal")} ✦`, "button-dark", canReveal ? "" : "disabled")}${state.busy ? waitingMarkup() : ""}${ai && !state.result ? `<label class="consent"><input type="checkbox" name="consent" ${state.consent ? "checked" : ""} ${state.busy ? "disabled" : ""}><span>${label("consent")}</span></label>${actionButton("demo", label("useDemo"), "button-plain", state.busy ? "disabled" : "")}` : ""}</div>`
  return `<div class="wizard-heading draw-heading"><p class="eyebrow">${label("drawEyebrow")}</p><h3 id="step-title" tabindex="-1">${label("drawTitle")}</h3><p>${label("drawDescription")}</p><span class="draw-counter">${label("drawCount", { chosen: state.chosen.length, total: state.count })}</span></div>${ready ? renderSlots() + readyMarkup : deckMarkup + renderSlots()}<p class="mode-bar"><span aria-hidden="true">✧</span>${label((state.result?.mode ?? session.serverConfig.mode) === "ai" ? "aiNotice" : "demoNotice")}</p>${state.error && !state.result ? `<p class="error-message" role="alert">${errorText(state.error)}</p>` : ""}<div class="wizard-footer">${actionButton("back", `← ${label("back")}`, "button-plain", motionLocked() ? "disabled" : "")}<span class="helper">${label("drawHint")}</span></div>`
}

/** Changing any earlier answer discards the drawn cards and any reading made from them. */
export function clearDraw() {
  session.drawController?.abort()
  session.activeRequest?.abort()
  state.chosen = []
  state.hand = []
  state.phase = "stacked"
  state.actions = []
  state.result = null
  state.resultPayload = null
  state.resultLanguages = {}
  state.error = ""
  state.consent = false
  renderEmptyResults()
}

function syncDrawControls() {
  renderStepper()
  $("#language-toggle").disabled = motionLocked()
  $("#wizard").setAttribute("aria-busy", String(motionLocked()))
  $('[data-action="back"]').disabled = motionLocked()
  document.querySelectorAll(".deck-card").forEach((card) => {
    card.disabled = state.phase !== "fanned"
  })
  $(".draw-action").innerHTML =
    `<p class="status-message">${label(state.phase === "fanned" ? "pickHint" : state.phase === "drawing" ? "drawing" : "shuffling")}</p>`
  $(".draw-counter").textContent = t("drawCount", {
    chosen: state.chosen.length,
    total: state.count
  })
}

async function runShuffle(signal) {
  state.hand = shuffle(availableCards(session.deck, state.chosen)).slice(0, 12)
  state.phase = "shuffling"
  state.actions.push({ type: "shuffle", at: Date.now() })
  syncDrawControls()
  await shuffleIntoFan($(".deck-stage"), signal)
  if (signal.aborted) return
  state.phase = "fanned"
  syncDrawControls()
  announce(t("pickHint"))
  $(".deck-card")?.focus({ preventScroll: true })
}

export async function beginShuffle() {
  if (state.phase !== "stacked" || state.chosen.length >= state.count) return
  const controller = (session.drawController = new AbortController())
  try {
    await runShuffle(controller.signal)
  } catch {
    if (!controller.signal.aborted) {
      state.phase = "stacked"
      renderWizard()
    }
  }
}

export async function pickCard(index) {
  if (
    state.phase !== "fanned" ||
    state.chosen.length >= state.count ||
    !state.hand[index]
  )
    return
  const card = state.hand[index]
  if (state.chosen.some((chosen) => chosen.img === card.img)) return
  session.drawController = new AbortController()
  const { signal } = session.drawController
  const stage = $(".deck-stage")
  const selected = $(`[data-card-index="${index}"]`)
  const slot = $(`[data-slot="${state.chosen.length}"]`)
  // Lock before the first await: fast taps and repeated keys cannot draw twice.
  state.phase = "drawing"
  stage.classList.add("drawing")
  syncDrawControls()
  try {
    await flyCardToSlot(selected, slot, signal)
    if (signal.aborted) return
    state.chosen.push(card)
    state.actions.push({ type: "pick", at: Date.now(), cardId: card.img })
    slot.innerHTML = `<img src="${CONFIG.cardBack}" alt="${label("hiddenCard")}">`
    slot.classList.add("is-filled")
    const progress = t("drawCount", {
      chosen: state.chosen.length,
      total: state.count
    })
    $(".draw-counter").textContent = progress
    $(".selected-slots").setAttribute("aria-label", progress)
    announce(
      t("selectedAnnouncement", {
        number: state.chosen.length,
        remaining: state.count - state.chosen.length
      })
    )
    if (state.chosen.length === state.count) {
      await closeDeck(stage, signal)
      state.hand = []
      state.phase = "stacked"
      renderWizard()
      $('[data-action="reveal"]')?.focus({ preventScroll: true })
    } else {
      // Keep the DOM mounted: the flight flows directly into the next shuffle.
      await runShuffle(signal)
    }
  } catch {
    if (!signal.aborted) {
      state.phase = "stacked"
      renderWizard()
    }
  }
}
