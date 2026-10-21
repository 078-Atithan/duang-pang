import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { RequestError } from "./errors.js"
import { SAFE_HEADERS } from "./http.js"

// Only index.html and the css/, js/ and assets/ folders are public.
const ROOT = fileURLToPath(new URL("../", import.meta.url))
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
}

export async function serveStatic(url, response, method) {
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    throw new RequestError("Invalid path")
  }
  if (pathname === "/") pathname = "/index.html"
  if (
    pathname.includes("\\") ||
    pathname.includes("\0") ||
    pathname.includes(":") ||
    pathname.split("/").some((part) => part.startsWith(".")) ||
    !/^\/(index\.html|(?:css|js|assets)\/)/.test(pathname)
  )
    throw new RequestError("Not found", 404)
  const extension = path.extname(pathname).toLowerCase()
  if (!MIME_TYPES[extension]) throw new RequestError("Not found", 404)
  const filename = path.resolve(ROOT, `.${pathname}`)
  try {
    // Resolve symlinks as well as dot segments before reading a public asset.
    const resolved = await realpath(filename)
    const relative = path.relative(ROOT, resolved)
    const publicPrefix = ["assets", "css", "js"].some((folder) =>
      relative.startsWith(`${folder}${path.sep}`)
    )
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      (!publicPrefix && relative !== "index.html")
    )
      throw new RequestError("Not found", 404)
    const info = await stat(resolved)
    if (!info.isFile()) throw new RequestError("Not found", 404)
    const content = await readFile(resolved)
    response.writeHead(200, {
      ...SAFE_HEADERS,
      "Content-Type": MIME_TYPES[extension],
      "Content-Length": content.length
    })
    response.end(method === "HEAD" ? undefined : content)
  } catch (error) {
    if (error instanceof RequestError) throw error
    throw new RequestError("Not found", 404)
  }
}
