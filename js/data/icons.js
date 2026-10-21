// Inline SVG paths are trusted constants, never user-supplied markup.
const ICON_PATHS = {
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  case: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12q9 5 18 0m-9 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  moon: '<path d="M20 14.2A9 9 0 0 1 9.8 4a9 9 0 1 0 10.2 10.2Z"/><path d="M18 2v5m-2.5-2.5h5"/>',
  leaf: '<path d="M20 3C9 2 3 8 5 15c6 7 16 2 15-12ZM3 22 15 9m-6 6v-5m0 5h6"/>',
  sparkle:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5ZM20 2v4m-2-2h4"/>',
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m0-17a3 3 0 1 1 0 6m3 3a5 5 0 0 1 3 4v4"/>'
}
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.sparkle}</svg>`
}
