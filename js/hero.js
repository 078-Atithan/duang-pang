/**
 * Hero cards share the real deck's filenames. Keep the illustrated backs visible
 * until a scan finishes loading, including when loading finishes before startup.
 */
export function initializeHero() {
  document.querySelectorAll('.hero-card-image').forEach((image) => {
    const card = image.closest('.hero-card');
    const revealArtwork = () => {
      if (image.naturalWidth > 0) card.classList.remove('is-awaiting-art');
    };

    if (image.complete) {
      revealArtwork();
    } else {
      image.addEventListener('load', revealArtwork, { once: true });
    }
    // A missing scan leaves the supplied card back in place, without an error UI.
  });
}
