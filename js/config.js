// Public configuration only. API keys belong in the server's environment.

// The deployed reading server, used when the page is opened anywhere other than this computer
// (e.g. GitHub Pages). Example: 'https://duang-pang.onrender.com/api'. Leave '' for demo-only static hosting.
const REMOTE_API_BASE = ""
// This module is also loaded by the Node server, where `location` does not exist.
const onThisComputer =
  typeof location === "undefined" ||
  /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
const useRemote = !onThisComputer && Boolean(REMOTE_API_BASE)

export const CONFIG = Object.freeze({
  deckUrl: "./assets/data/tarot-images.json",
  imageDirectory: "./assets/images/tarot/",
  cardBack: "./assets/card-back.svg",
  apiBase: useRemote ? REMOTE_API_BASE.replace(/\/+$/, "") : "/api",
  remoteApi: useRemote,
  maxQuestionLength: 1000
})
