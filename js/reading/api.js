import { CONFIG } from "../config.js"
import { validateReading } from "./validate.js"

/** `reason` tells the UI why it is in demo mode: the server has AI off, or no server answered (e.g. GitHub Pages). */
export async function getServerConfig({ timeout = 2500 } = {}) {
  try {
    const response = await fetch(`${CONFIG.apiBase}/config`, {
      signal: AbortSignal.timeout(timeout),
      cache: "no-store"
    })
    if (!response.ok) return { mode: "demo", reason: "unavailable" }
    const config = await response.json()
    return config.mode === "ai"
      ? { mode: "ai" }
      : { mode: "demo", reason: "disabled" }
  } catch {
    return { mode: "demo", reason: "unavailable" }
  }
}

/** `code` is one of: aborted, network, rate_limit, quota, busy, timeout, incomplete, blocked, config, invalid_response, provider. */
export class ReadingError extends Error {
  constructor(code) {
    super(`Reading failed: ${code}`)
    this.code = code
  }
}

export async function requestReading(payload, signal) {
  let response
  try {
    response = await fetch(`${CONFIG.apiBase}/reading`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal
    })
  } catch {
    throw new ReadingError(signal?.aborted ? "aborted" : "network")
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const fallback =
      response.status === 429
        ? "rate_limit"
        : response.status === 504
          ? "timeout"
          : "provider"
    throw new ReadingError(typeof body.code === "string" ? body.code : fallback)
  }
  try {
    return validateReading(await response.json(), payload.cardIds)
  } catch {
    throw new ReadingError(signal?.aborted ? "aborted" : "invalid_response")
  }
}
