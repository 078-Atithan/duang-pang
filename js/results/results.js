// The results section: empty placeholder, an AI reading, or local mode (card meanings only).
import { CONFIG } from "../config.js"
import { TOPICS } from "../data/topics.js"
import { SPREADS } from "../data/spreads.js"
import { getLanguage, local } from "../i18n/index.js"
import { cardText } from "../i18n/card-text.js"
import { createLocalReading } from "../reading/local.js"
import { observeCardReveals } from "../ui/effects.js"
import { state, session } from "../state.js"
import { $, escapeHtml, label, named, actionButton } from "../dom.js"
import { errorText } from "./errors.js"

export function renderEmptyResults() {
  if (state.result) return
  session.stopResultEffects()
  $("#results-content").className = "empty-results"
  $("#results-content").innerHTML =
    `<span class="empty-symbol" aria-hidden="true">☾</span><p class="eyebrow">${label("resultsEyebrow")}</p><h2 id="results-title">${label("emptyTitle")}</h2><p>${label("emptyText")}</p><a class="text-link" href="#reading">${label("emptyCta")} ↗</a>`
}

// Local mode leaves out everything about the visitor: name, question, topic and personal text.
function headerMarkup(payload, spread, isLocal) {
  const language = state.result.language.toUpperCase()
  if (isLocal)
    return `<div class="result-header"><p class="eyebrow">${label("resultEyebrow")}</p><h2 id="results-title" tabindex="-1">${label("resultTitle")}</h2><p>${label("localIntro")}</p><div class="result-badges"><span class="badge">${escapeHtml(named(spread))}</span><span class="badge">${label("demoBadge")} · ${language}</span><span class="badge">${label("upright")}</span></div></div>`
  const topic = TOPICS.find((item) => item.id === payload.topic)
  const diviner = state.result.diviner ? ` · ${label("diviner", { n: state.result.diviner })}` : ""
  const needsLanguage = state.result.language !== getLanguage()
  const languageNotice = needsLanguage
    ? `<div class="reading-language-notice" role="status"><p>${label("aiLanguageNotice")}</p>${actionButton("reading-language", label(state.busy ? "revealing" : "generateLanguage"), "button-outline", state.busy ? "disabled" : "")}${state.error ? `<p class="error-message" role="alert">${errorText(state.error)}</p>` : ""}</div>`
    : ""
  return `<div class="result-header"><p class="eyebrow">${label("resultEyebrow")}</p><h2 id="results-title" tabindex="-1">${payload.profile.name ? label("namedResultTitle", { name: payload.profile.name }) : label("resultTitle")}</h2><p>${label("resultIntro")}</p><div class="result-badges"><span class="badge">${escapeHtml(named(topic))}</span><span class="badge">${escapeHtml(named(spread))}</span><span class="badge">${label("aiBadge")}${diviner} · ${language}</span><span class="badge">${label("upright")}</span></div>${payload.question ? `<blockquote class="result-question">“${escapeHtml(payload.question)}”</blockquote>` : ""}${languageNotice}</div>`
}

function cardCopyMarkup(text, entry, isLocal) {
  const lang = getLanguage()
  const meaning = `<h4 class="card-name">${escapeHtml(text.name)}</h4><p class="card-keywords">${text.keywords.map(escapeHtml).join(" · ")}</p><h5>${label("cardMeaning")}</h5><p>${escapeHtml(text.meanings.join(lang === "th" ? " " : ". "))}${lang === "th" ? "" : "."}</p>`
  if (isLocal) return meaning
  const readingLang = state.result.language
  return `${meaning}${entry.meaning ? `<h5>${label("positionMeaning")}</h5><p lang="${readingLang}">${escapeHtml(entry.meaning)}</p>` : ""}<h5>${label("yourReflection")}</h5><p lang="${readingLang}">${escapeHtml(entry.reflection)}</p><div class="reflection-box"><h5>${label("reflectionPrompt")}</h5><p lang="${readingLang}">${escapeHtml(entry.prompt)}</p></div>`
}

export function renderResults({ animated = false } = {}) {
  if (!state.result) return renderEmptyResults()
  session.stopResultEffects()
  const payload = state.resultPayload
  if (state.result.mode === "demo" && state.result.language !== getLanguage()) {
    // Rebuild only the language; preserve the exact draw and order.
    state.result = createLocalReading(
      { ...payload, language: getLanguage() },
      payload.cardIds.map((id) => session.deck.find((card) => card.img === id))
    )
  } else if (state.resultLanguages[getLanguage()]) {
    state.result = state.resultLanguages[getLanguage()]
  }
  const isLocal = state.result.mode === "demo"
  const chosenSpread = SPREADS.find((item) => item.id === payload.spread)
  const chosenPositions = local(chosenSpread.positions)
  const positionDescriptions = local(chosenSpread.positionDescriptions)
  const resultCards = payload.cardIds.map((id) => session.deck.find((card) => card.img === id))
  const cardsMarkup = resultCards
    .map((card, index) => {
      const text = cardText(card, getLanguage())
      return `<article class="result-card" aria-labelledby="result-role-${index}"><header class="result-position"><span class="result-role-index" aria-hidden="true">0${index + 1}</span><div><h3 class="result-role-title" id="result-role-${index}">${escapeHtml(chosenPositions[index])}</h3><p class="result-role-description">${escapeHtml(positionDescriptions[index])}</p></div></header><div class="result-art"><div class="reveal-inner"><div class="reveal-back"><img src="${CONFIG.cardBack}" alt="${label("hiddenCard")}"></div><div class="reveal-front" aria-hidden="true"><div class="card-placeholder" aria-label="${escapeHtml(text.name)}"><span class="placeholder-number">${escapeHtml(card.number)}</span><span class="placeholder-star" aria-hidden="true">✧</span><strong>${escapeHtml(text.name)}</strong><span class="placeholder-label">${label("placeholder")}</span></div><img src="${CONFIG.imageDirectory}${encodeURIComponent(card.img)}" alt="${escapeHtml(text.name)}" loading="eager" data-card-image></div></div></div><div class="result-copy" inert aria-hidden="true">${cardCopyMarkup(text, state.result.cards[index], isLocal)}</div></article>`
    })
    .join("")
  const summary = isLocal
    ? `<aside class="result-summary"><h3>${label("demoBadge")}</h3><p>${label("localSummary")}</p></aside>`
    : `<aside class="result-summary"><h3>${label("takeWithYou")}</h3><p lang="${state.result.language}">${escapeHtml(state.result.summary)}</p></aside>`
  $("#results-content").className = ""
  $("#results-content").innerHTML =
    `${headerMarkup(payload, chosenSpread, isLocal)}<div class="result-grid ${resultCards.length === 4 ? "four" : ""}">${cardsMarkup}</div>${summary}<p class="result-source-note">${label("sourceNote")}</p><div class="result-actions">${actionButton("save", `${label("saveReading")} ↓`)}${actionButton("print", label("printReading"), "button-outline")}${actionButton("restart", `${label("newReading")} ↗`, "button-outline")}</div>`
  // Missing user-supplied images leave the intentional placeholder visible.
  $("#results-content")
    .querySelectorAll("[data-card-image]")
    .forEach((image) => {
      const hideMissing = () => {
        image.hidden = true
      }
      image.addEventListener("error", hideMissing, { once: true })
      if (image.complete && image.naturalWidth === 0) hideMissing()
    })
  session.stopResultEffects = observeCardReveals($("#results-content"), { animated })
}
