import http from "node:http"
import { RequestError } from "./errors.js"
import { validatePayload } from "./validation.js"
import { deck } from "./deck.js"
import { SAFE_HEADERS, json, readJson } from "./http.js"
import { serveStatic } from "./static.js"
import { LOOPBACK_HOST, hostOf, limit, list } from "./security.js"
import { generateAiReading } from "./ai/gemini.js"

export function createAppServer({
  apiKey = process.env.GEMINI_API_KEY || "",
  model = process.env.GEMINI_MODEL || "",
  fetchImpl = fetch,
  // Sites allowed to call the API from another origin, e.g. https://078-atithan.github.io
  allowedOrigins = list(process.env.ALLOWED_ORIGINS),
  // Public hostnames this server answers to (loopback is always allowed). Render provides its own hostname.
  allowedHosts = [
    ...list(process.env.ALLOWED_HOSTS),
    ...list(process.env.RENDER_EXTERNAL_HOSTNAME)
  ],
  readingsPerMinute = limit(process.env.READINGS_PER_MINUTE, 5),
  dailyLimit = limit(process.env.DAILY_READING_LIMIT, 200),
  maxConcurrent = limit(process.env.MAX_CONCURRENT_READINGS, 2),
  // Only behind a proxy you control (Render, Cloud Run...) does X-Forwarded-For identify the visitor.
  trustProxy = process.env.TRUST_PROXY === "1",
  now = () => Date.now()
} = {}) {
  const aiEnabled = Boolean(apiKey && model)
  // Host and origin allowlists, per-visitor and daily limits protect the API key and its quota.
  // Limits are in memory: they reset on restart and are per server instance.
  const visitors = new Map()
  let day = ""
  let dayCount = 0
  let activeReadings = 0
  const visitorId = (request) =>
    (trustProxy && request.headers["x-forwarded-for"]?.split(",")[0].trim()) ||
    request.socket.remoteAddress ||
    "unknown"
  const takeVisitorSlot = (id) => {
    const time = now()
    if (visitors.size > 5000)
      for (const [key, entry] of visitors)
        if (time - entry.start > 60000) visitors.delete(key)
    const entry = visitors.get(id)
    if (!entry || time - entry.start > 60000) {
      visitors.set(id, { start: time, count: 1 })
      return true
    }
    if (entry.count >= readingsPerMinute) return false
    entry.count += 1
    return true
  }

  return http.createServer(async (request, response) => {
    let cors = {}
    try {
      const host = (request.headers.host || "").toLowerCase()
      if (
        !LOOPBACK_HOST.test(host) &&
        !allowedHosts.includes(host.replace(/:\d+$/, ""))
      )
        throw new RequestError("Invalid host", 403)
      const url = new URL(request.url, `http://${host}`)
      const origin = request.headers.origin?.toLowerCase().replace(/\/+$/, "")
      const sameOrigin = Boolean(origin) && hostOf(origin) === host
      const allowedCrossOrigin =
        Boolean(origin) && !sameOrigin && allowedOrigins.includes(origin)
      if (allowedCrossOrigin && url.pathname.startsWith("/api/"))
        cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" }

      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        if (!allowedCrossOrigin)
          throw new RequestError("Cross-origin requests are not allowed", 403)
        response.writeHead(204, {
          ...SAFE_HEADERS,
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600"
        })
        return response.end()
      }
      if (request.method === "GET" && url.pathname === "/api/config")
        return json(response, 200, { mode: aiEnabled ? "ai" : "demo" }, cors)
      if (url.pathname === "/api/reading") {
        if (request.method !== "POST")
          return json(
            response,
            405,
            { error: "Method not allowed" },
            { ...cors, Allow: "POST" }
          )
        if (origin && !sameOrigin && !allowedCrossOrigin)
          throw new RequestError("Cross-origin requests are not allowed", 403)
        if (!origin && request.headers["sec-fetch-site"] === "cross-site")
          throw new RequestError("Cross-site requests are not allowed", 403)
        const payload = validatePayload(await readJson(request), deck)
        if (!aiEnabled)
          throw new RequestError(
            "AI is not configured. Use the local demo.",
            503,
            "config"
          )
        if (!payload.consent)
          throw new RequestError(
            "Consent is required before sending data to the provider",
            400
          )
        const today = new Date(now()).toISOString().slice(0, 10)
        if (today !== day) {
          day = today
          dayCount = 0
        }
        if (dailyLimit && dayCount >= dailyLimit)
          throw new RequestError(
            "The daily reading limit has been reached",
            503,
            "daily_limit"
          )
        if (
          activeReadings >= maxConcurrent ||
          !takeVisitorSlot(visitorId(request))
        ) {
          return json(
            response,
            429,
            {
              error: "Please wait before trying another reading",
              code: "rate_limit"
            },
            { ...cors, "Retry-After": "60" }
          )
        }
        dayCount += 1
        activeReadings += 1
        try {
          return json(
            response,
            200,
            await generateAiReading(payload, { apiKey, model, fetchImpl }),
            cors
          )
        } finally {
          activeReadings -= 1
        }
      }
      if (!["GET", "HEAD"].includes(request.method))
        return json(
          response,
          405,
          { error: "Method not allowed" },
          { Allow: "GET, HEAD" }
        )
      await serveStatic(url, response, request.method)
    } catch (error) {
      const timedOut = error.name === "TimeoutError"
      const status =
        error instanceof RequestError ? error.status : timedOut ? 504 : 500
      const code =
        error instanceof RequestError
          ? error.code
          : timedOut
            ? "timeout"
            : undefined
      if (!response.headersSent)
        json(
          response,
          status,
          {
            error:
              error instanceof RequestError
                ? error.message
                : timedOut
                  ? "The AI took too long to respond"
                  : "The request could not be completed",
            ...(code ? { code } : {})
          },
          cors
        )
      else response.end()
    }
  })
}
