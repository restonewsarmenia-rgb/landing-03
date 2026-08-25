# landing-03 — "05 / Industry panel"

Pixel-accurate HTML+CSS rebuild of a single Figma frame, exported by hand (no plugins, no build step) into plain HTML5 + CSS.

## Source

- Figma file: FAVORIT 1 (https://www.figma.com/design/L74HqJy6UaXDIbU4d3Hjib/FAVORIT-1?node-id=96-6702)
- Page: Page 4
- Root layer: `Group 89`
- Frame rebuilt: `05 / Industry panel` (1440 x 3096, frame origin is X0/Y0)

The frame turned out to be a full one-page site mock (header, hero, two
"operator" service panels, an about/photos block, a lead-capture form and a
footer) rather than a small isolated panel - the Figma layer is simply named
"05 / Industry panel" and that name is kept as-is for traceability.

## Method

Every layer under `Group 89 -> 05 / Industry panel` was selected one at a
time in Figma's layer tree and its values were read directly from the
right-hand Design panel: X/Y, W/H, fill (hex + opacity), stroke, corner
radius, effects (shadow x/y/blur/spread/color), and for text layers: font
family, weight, size, line-height, letter-spacing, alignment, color and the
exact string (copied verbatim, typos included).

Figma groups are coordinate-transparent: an element nested inside plain
Groups (not Frames) shows X/Y already relative to the root 1440-wide frame.
Elements nested inside a sub-Frame (marked with the # icon in the layers
panel, e.g. "01 Услуги") show X/Y relative to that sub-frame instead; this
is noted in SPEC.md wherever it applies.

No value in this repo was guessed from the rendered picture. Anything that
could not be read with confidence from the Design panel is listed in
UNKNOWNS.md instead of being invented.

## Files

- SPEC.md - the measured layer tree (positions, sizes, colors, typography, text).
- css/tokens.css - every distinct color / font-size / weight / line-height / radius / shadow as CSS custom properties.
- css/style.css - layout and components, built only from tokens.css, no hardcoded values.
- index.html - plain HTML5, links both CSS files, loads Manrope from Google Fonts.
- assets/ - placeholder folder for the 8 raster images (see ASSETS.md); шеф uploads the binaries himself.
- ASSETS.md - table of the 8 images this page expects (what it shows, size, filename).
- UNKNOWNS.md - anything that could not be measured from Figma.

## Scope

Desktop only, fixed 1440px canvas. No responsive behaviour, no media
queries, no theme switching. Glyph icons (chevrons, arrows, checkmarks) are
plain text characters, never images.
