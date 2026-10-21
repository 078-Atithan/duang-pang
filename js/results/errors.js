import { label } from "../dom.js"

// Server and client error codes mapped to the message keys in i18n/strings.js.
export const ERROR_KEYS = {
  quota: "errorQuota",
  daily_limit: "errorQuota",
  busy: "errorBusy",
  rate_limit: "errorRateLimit",
  timeout: "errorTimeout",
  incomplete: "errorIncomplete",
  blocked: "errorBlocked",
  network: "errorNetwork",
  config: "errorConfig"
}
export const errorText = (code) => label(ERROR_KEYS[code] || "readingError")
