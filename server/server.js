// Entry point: `npm start`. Settings come from .env locally or the host's environment variables.
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createAppServer } from "./app.js"
import { configuredDiviners } from "./ai/diviners.js"
import { LOOPBACK_HOST, list } from "./security.js"

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 4173)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535")
  // 127.0.0.1 keeps the server private to this computer; hosting platforms need HOST=0.0.0.0.
  const bindHost = process.env.HOST || "127.0.0.1"
  const publicHosts = [
    ...list(process.env.ALLOWED_HOSTS),
    ...list(process.env.RENDER_EXTERNAL_HOSTNAME)
  ]
  const server = createAppServer()
  server.requestTimeout = 70000
  server.listen(port, bindHost, () => {
    console.log(
      `Duang Pang: http://${bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost}:${port}`
    )
    console.log(
      `Reading mode: ${configuredDiviners().map((d) => `Diviner ${d.id} = ${d.model}`).join(", ") || "local mode only (no AI keys set)"}`
    )
    if (!LOOPBACK_HOST.test(bindHost)) {
      console.log(
        `Public hostnames: ${publicHosts.join(", ") || "none"} · Allowed origins: ${list(process.env.ALLOWED_ORIGINS).join(", ") || "none"}`
      )
      if (!publicHosts.length)
        console.warn(
          "Warning: set ALLOWED_HOSTS to this server's public hostname, or every public request is rejected."
        )
    }
  })
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "This port is already in use. Set a different PORT."
        : "The local server could not start."
    )
    process.exitCode = 1
  })
}
