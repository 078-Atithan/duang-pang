// Helpers for host/origin allowlists and numeric limits read from environment variables.
export const LOOPBACK_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/
export const list = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/\/+$/, ""))
    .filter(Boolean)
export const limit = (value, fallback) =>
  value === undefined || value === ""
    ? fallback
    : Math.max(0, Number(value) || 0)
export const hostOf = (origin) => {
  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return ""
  }
}
