// `npm run check`: syntax-checks every JavaScript file, so new modules are covered automatically.
import { readdir } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
async function collect(folder) {
  const entries = await readdir(path.join(root, folder), {
    withFileTypes: true
  })
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => {
        const child = path.join(folder, entry.name)
        return entry.isDirectory()
          ? collect(child)
          : /\.m?js$/.test(entry.name)
            ? [child]
            : []
      })
  )
  return nested.flat()
}

const files = (
  await Promise.all(["js", "server", "scripts", "tests"].map(collect))
).flat()
for (const file of files)
  execFileSync(process.execPath, ["--check", path.join(root, file)], {
    stdio: "inherit"
  })
console.log(`Checked ${files.length} files.`)
