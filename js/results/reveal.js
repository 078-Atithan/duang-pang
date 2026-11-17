// Turning the drawn cards into a reading: AI diviners in order (asking before each switch),
// or local mode with the card meanings only.
import { getLanguage, t } from "../i18n/index.js"
import { createLocalReading } from "../reading/local.js"
import { requestReading, ReadingError } from "../reading/api.js"
import { state, session } from "../state.js"
import { $, announce } from "../dom.js"
import { renderWizard } from "../wizard/wizard.js"
import { renderResults } from "./results.js"
import { ERROR_KEYS } from "./errors.js"
import { elapsedText } from "./diviners.js"
import { careerText } from "../data/careers.js"
import { askToSwitch } from "../ui/diviner-dialog.js"

// Failures another diviner can fix. Our own limits, network problems and blocked questions are not.
const SWITCHABLE = new Set(["quota", "busy", "timeout", "incomplete", "config", "provider", "invalid_response"])
// The browser waits a little longer than the server, so the server's clearer error arrives first.
const CLIENT_GRACE_MS = 15000

// Runs after the final re-render so layout changes above #results cannot cut the scroll short.
function scrollToResults() {
  requestAnimationFrame(() => {
    const headerHeight = $(".site-header")?.offsetHeight ?? 0
    const top = $("#results").getBoundingClientRect().top + window.scrollY - headerHeight
    window.scrollTo({
      top: Math.max(0, top),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
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

/** One request to one diviner, with the waiting message and a running timer. */
async function askDiviner(payload, diviner) {
  const request = (session.activeRequest = new AbortController())
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    request.abort()
  }, diviner.timeoutSeconds * 1000 + CLIENT_GRACE_MS)
  state.diviner = diviner.id
  state.waitStarted = Date.now()
  renderWizard()
  const ticker = setInterval(() => {
    const elapsed = $(".waiting-elapsed")
    if (elapsed) elapsed.textContent = elapsedText(state.waitStarted)
  }, 1000)
  try {
    const reading = await requestReading({ ...payload, diviner: diviner.id }, request.signal)
    return { ...reading, diviner: diviner.id }
  } catch (error) {
    throw timedOut ? new ReadingError("timeout") : error
  } finally {
    clearTimeout(timeout)
    clearInterval(ticker)
  }
}

/** Tries each diviner in order. Returns the reading, or null when the visitor chooses local mode. */
async function readWithDiviners(payload) {
  const diviners = session.serverConfig.diviners
  for (let index = 0; ; index += 1) {
    try {
      return await askDiviner(payload, diviners[index])
    } catch (error) {
      const next = diviners[index + 1]
      if (!next || !SWITCHABLE.has(error.code)) throw error
      if (!(await askToSwitch(diviners[index], next, error.code))) return null
    }
  }
}

function finishWaiting() {
  state.busy = false
  state.diviner = null
  session.activeRequest = null
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
  let revealed = false
  try {
    const useAi = !demo && session.serverConfig.mode === "ai"
    const aiReading = useAi ? await readWithDiviners(payload) : null
    // No AI reading (local mode chosen or no AI configured): show the card meanings only.
    state.result = aiReading ?? createLocalReading(payload, state.chosen)
    state.resultPayload = payload
    state.resultLanguages[payload.language] = state.result
    renderResults({ animated: true })
    revealed = true
  } catch (error) {
    // Navigating away or starting over aborts the request; that is not a failure to report.
    if (error.code === "aborted") return
    state.error = error.code || "provider"
    announce(t(ERROR_KEYS[state.error] || "readingError"))
  } finally {
    finishWaiting()
    renderWizard()
    if (revealed) scrollToResults()
  }
}

// A new AI-language version requires an explicit click. Cache it for free toggling.
// Choosing local mode in the switch dialog here just keeps the current reading.
export async function generateReadingLanguage() {
  if (state.busy || state.result?.mode !== "ai" || !state.resultPayload?.consent) return
  state.busy = true
  state.error = ""
  renderWizard()
  renderResults()
  try {
    const language = getLanguage()
    const result = await readWithDiviners({ ...state.resultPayload, language })
    if (result) {
      state.resultLanguages[language] = result
      state.result = result
    }
  } catch (error) {
    if (error.code === "aborted") return
    state.error = error.code || "provider"
    announce(t(ERROR_KEYS[state.error] || "readingError"))
  } finally {
    finishWaiting()
    renderWizard()
    renderResults()
    $("#results-title")?.focus({ preventScroll: true })
  }
}
