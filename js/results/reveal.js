// Turning the drawn cards into a reading: AI request or local demo, then showing the results.
import { getLanguage, t } from "../i18n/index.js"
import { createDemoReading } from "../reading/demo.js"
import { requestReading } from "../reading/api.js"
import { state, session } from "../state.js"
import { $, announce } from "../dom.js"
import { renderWizard } from "../wizard/wizard.js"
import { renderResults } from "./results.js"
import { ERROR_KEYS } from "./errors.js"
import { careerText } from "../data/careers.js"

// Runs after the final re-render so layout changes above #results cannot cut the scroll short.
function scrollToResults() {
  requestAnimationFrame(() => {
    const headerHeight = $(".site-header")?.offsetHeight ?? 0
    const top =
      $("#results").getBoundingClientRect().top + window.scrollY - headerHeight
    window.scrollTo({
      top: Math.max(0, top),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth"
    })
    $("#results-title")?.focus({ preventScroll: true })
  })
}

function readingPayload() {
  return {
    topic: state.topic,
    question: state.question.trim(),
    spread: state.spread,
    cardIds: state.chosen.map((card) => card.img),
    profile: {
      name: state.profile.name,
      birthDate: state.profile.birthDate,
      status: state.profile.status,
      gender: state.profile.gender,
      career: careerText(state.profile)
    },
    language: getLanguage(),
    actions: [...state.actions],
    consent: state.consent
  }
}

export async function reveal({ demo = false } = {}) {
  if (
    state.busy ||
    state.chosen.length !== state.count ||
    (!demo && session.serverConfig.mode === "ai" && !state.consent)
  )
    return
  // Revisiting a completed reading must not make another billable AI request.
  if (state.result) return scrollToResults()
  const payload = readingPayload()
  state.busy = true
  state.error = ""
  renderWizard()
  const request = (session.activeRequest = new AbortController())
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    request.abort()
  }, 65000)
  let revealed = false
  try {
    state.result =
      demo || session.serverConfig.mode !== "ai"
        ? createDemoReading(payload, state.chosen)
        : await requestReading(payload, request.signal)
    state.resultPayload = payload
    state.resultLanguages[payload.language] = state.result
    renderResults({ animated: true })
    revealed = true
  } catch (error) {
    // Navigating away or starting over aborts the request; that is not a failure to report.
    if (error.code === "aborted" && !timedOut) return
    state.error = timedOut ? "timeout" : error.code || "provider"
    announce(t(ERROR_KEYS[state.error] || "readingError"))
  } finally {
    clearTimeout(timeout)
    if (session.activeRequest === request) {
      state.busy = false
      session.activeRequest = null
      renderWizard()
    }
    if (revealed) scrollToResults()
  }
}

// A new AI-language version requires an explicit click. Cache it for free toggling.
export async function generateReadingLanguage() {
  if (
    state.busy ||
    state.result?.mode !== "ai" ||
    !state.resultPayload?.consent
  )
    return
  state.busy = true
  state.error = ""
  renderWizard()
  renderResults()
  const request = (session.activeRequest = new AbortController())
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    request.abort()
  }, 65000)
  try {
    const language = getLanguage()
    const result = await requestReading(
      { ...state.resultPayload, language },
      request.signal
    )
    state.resultLanguages[language] = result
    state.result = result
  } catch (error) {
    if (error.code === "aborted" && !timedOut) return
    state.error = timedOut ? "timeout" : error.code || "provider"
    announce(t(ERROR_KEYS[state.error] || "readingError"))
  } finally {
    clearTimeout(timeout)
    if (session.activeRequest === request) {
      state.busy = false
      session.activeRequest = null
      renderWizard()
      renderResults()
      $("#results-title")?.focus({ preventScroll: true })
    }
  }
}
