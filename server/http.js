import { RequestError } from "./errors.js"

export const SAFE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
}

export function json(response, status, data, headers = {}) {
  response.writeHead(status, {
    ...SAFE_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  })
  response.end(JSON.stringify(data))
}

export async function readJson(request) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new RequestError("Content-Type must be application/json", 415)
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16384) throw new RequestError("Request is too large", 413)
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    throw new RequestError("Invalid JSON")
  }
}
