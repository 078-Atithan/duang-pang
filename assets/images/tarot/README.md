# Tarot card images

All 78 card scans from your supplied `cards.zip` are included in **this folder**. Each is 350 × 600 pixels. Their exact names are listed in `filenames.txt` and the `img` fields in `../../data/tarot-images.json`.

Examples:

```text
m00.jpg     The Fool
m01.jpg     The Magician
c01.jpg     Ace of Cups
```

The website resolves each image as `assets/images/tarot/<img>`. Use lowercase filenames and `.jpg` extensions. Missing files show a deliberate placeholder; you may add the images gradually and refresh the browser.

The hero uses `m18.jpg` (The Moon), `m17.jpg` (The Star), and `m19.jpg` (The Sun) from this same folder. If a file is temporarily unavailable, the hero shows the original celestial card back from `../../card-back.svg`. The former illustrative card faces have been removed.
