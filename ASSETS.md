# ASSETS.md - images this page expects

Шеф uploads these 8 files into the assets/ folder (create the folder if it
does not exist yet - assets/.gitkeep already reserves it). Filenames and
pixel sizes below must match exactly what index.html references.

| # | What it shows | Where it sits | Size (W x H px) | Filename |
|---|---|---|---|---|
| 1 | Header wordmark logo (GLOBUS / CONTACT CENTER) | Header, top-left | 143 x 36 | assets/01-header-logo.png |
| 2 | Head-with-headset silhouette + globe graphic | Hero, right side | 743 x 465 | assets/02-hero-globe.png |
| 3 | Operator photo, outgoing-calls panel | Right operator panel, photo slot | 392 x 262 | assets/03-operator-outgoing.png |
| 4 | Operator photo, incoming-calls panel | Left operator panel, photo slot | 392 x 262 | assets/04-operator-incoming.png |
| 5 | Footer wordmark logo (GLOBUS / CONTACT CENTER) | Footer card, top-left | 117 x 66 | assets/05-footer-logo.png |
| 6 | Office building exterior | About section, photo 1 of 3 | 347.91 x 252.41 | assets/06-office-exterior.png |
| 7 | Call-center interior with operator desks | About section, photo 2 of 3 | 347.91 x 252.41 | assets/07-office-interior.png |
| 8 | Portrait of an agent wearing a headset | About section, photo 3 of 3 | 347.91 x 252.41 | assets/08-agent-photo.png |

Notes:
- All 8 images are referenced with plain `<img>` tags in index.html; each
  has a matching `alt` attribute already written.
- Sizes are the exact rendered box size measured in Figma. Export at 2x or
  3x for retina if desired, but keep the same aspect ratio.
- PNG is assumed based on how the layers were exported in Figma; JPG also
  works as long as the filename in index.html is updated to match.
