# G16 — Final QA

Subject: the board block at the bottom of the landing — that it is whole, that one theme
switch drives both documents, and above all that the rest of the page is exactly where it
was. Measured with Playwright 1.62.1 headless Chromium against the real files;
`reducedMotion: 'reduce'` on every capture switches off the landing's own colour
transitions, so no diff can be blamed on an animation caught mid-way. Scripts and raw JSON
in `data/`. The "before" side is the rebuilt pre-task page described in
`G14-performance.md`, proved pixel-identical to a capture taken before the first edit.

Скилл `mosweb` на машине НЕ установлен, поэтому `mosweb-qa-final-audit` заменён
независимыми подагентами, пересчитывающими всё с нуля. Правило «исполнитель не принимает
сам себя» соблюдено: первый аудит вернул FAIL, дефекты исправлены, назначена повторная
независимая проверка. Уверенность понижена и об этом сказано прямо.

## 1. Nothing above the block moved

Bounding boxes of `.header`, `.hero`, `.svc`, `.about`, `.form-card` and the three
`.about__photo` images, live DOM, before against after, **both themes at 1280 / 1440 /
1920 / 2560** — eight combinations:

**Worst movement across all eight: 0.0000 px.** Confirmed independently by the auditor
over the same 32 box comparisons per configuration. (`data/cmp-geom.py`,
`data/geom-before.json`, `data/geom-after.json`.)

## 2. The block

| viewport | block x / y | block w × h | ratio | width vs viewport | inner scrollbar |
|---|---|---|---|---|---|
| 1280 | 0 / 2600 | 1440 × 900 | 1.6 | **1440 — the width the page already scrolls to, not the 1280 viewport** | none |
| 1440 | 0 / 2600 | 1440 × 900 | 1.6 | equal to the viewport | none |
| 1920 | 0 / 2600 | 1920 × 1200 | 1.6 | equal to the viewport | none |
| 2560 | 0 / 2600 | 2560 × 1600 | 1.6 | equal to the viewport | none |

The wording "never wider than the viewport" was wrong and the auditor was right to refuse
it: below 1440 the block is deliberately floored at 1440, because the page itself is a
fixed 1440 canvas that already scrolls sideways there. Matching the canvas rather than the
viewport is what keeps the block from adding a *second*, wider overflow.

`top: 2600px` is the form card's own bottom edge (2528) plus half of the 144 px gap the
form and the footer already had, so the page's rhythm is kept: 72 px above, 72 px below.

## 3. The board fills the block at its own size

| viewport | frame box | board stage | `--board-scale` | fills the block |
|---|---|---|---|---|
| 1280 | 1455 × 900 | 1440 × 900 | 0.75 | exactly |
| 1440 | 1455 × 900 | 1440 × 900 | 0.75 | exactly |
| 1920 | 1935 × 1200 | **1920 × 1200** | **1.0 — native size** | exactly |
| 2560 | 2575 × 1600 | 2560 × 1600 | 1.3333 | exactly |

The frame is 15 px wider than the block on purpose: the board's document reserves a
scrollbar gutter (`scrollbar-gutter: stable`, its own cure for scale oscillation), measured
from the loaded frame — never assumed, 0 on overlay-scrollbar platforms — and pushed outside
the block's clip. Without it the board sat 15 px narrow and left a strip. No inner
scrollbar, horizontal or vertical, at any width. (`data/frame-fit.js`.)

## 4. The footer

| viewport | footer y before → after | shift | x / width / height |
|---|---|---|---|
| 1280, 1440 | 2672 → 3572 | 900 | identical |
| 1920 | 2672 → 3872 | 1200 | identical |
| 2560 | 2672 → 4272 | 1600 | identical |

The shift equals the block's height exactly at every width and in both themes. The footer's
own rule is untouched: it keeps `left: 115px; width: 1213px; height: 322px`, and only its
`top` is restated by the new stylesheet. The canvas keeps `height: 3096px` and grows a
bottom margin instead.

### Where it is NOT bit-identical, and why — corrected after audit

The first claim said the shifted footer band was pixel-identical. At **1440 that is true —
0 differing pixels** in both themes. At **1920 and 2560 it is false**: 10 / 16 / 22 / 21
pixels differ, by at most **2–4 of 255**, on the anti-aliasing of the card's rounded corners
and the social buttons. The auditor found it; it is real and reproducible (noise floor,
measured by re-shooting the same site twice: **0 px**).

The cause was then pinned by measurement rather than argued (`data/seam.js`):

| test | 1920 | 2560 |
|---|---|---|
| footer moved with `transform: translateY()` | 10 px | 22 px |
| footer moved with `top:` instead (what ships) | 10 px | 22 px |
| shipped page **with** the frame in the DOM | 10 px | 22 px |
| shipped page with the frame **never built** | 10 px | 22 px |
| same page shot twice (noise floor) | 0 px | 0 px |

So it is neither the transform nor the iframe's compositing layer: the footer simply
rasterises a few anti-aliased edge pixels differently at a different absolute Y. Any way of
moving it down the page hits this. It is 0.003 % of the band, invisible at 2–4 levels of 255,
and the honest wording is "identical to within the renderer's own anti-aliasing", not
"bit-identical".

The independent re-audit tried to refute that diagnosis and could not. It went further than
this file did: the **pre-task page with nothing but `.footer-card{top: 2672+1200}`** — no
block, no stylesheet, no iframe — reproduces exactly 10 px at 1920 and 22 px at 2560 and is
0-diff against the shipped footer; three different capture methods, including one holding the
footer at a fixed on-screen y, give identical counts, so it is a function of document Y and
nothing else. Its offset sweep also found that *particular* shifts (+1216 or +1220 at 1920,
+1606 and up at 2560) happen to land 0-diff — but the offset is `viewportWidth × 0.625` and
cannot be chosen without quantising the block's height and breaking the board's 1920:1200
ratio. So: not fixable, and not worth breaking the ratio for.

A comment in `css/board-block.css` that claimed the opposite — that a transform was to blame
and that `top` kept it bit-identical — was wrong, was caught by the re-audit, and has been
rewritten to say what the measurements say.

## 5. Pixel diff — the whole task in one comparison

Full-page captures at 1440, both themes, board loaded, lazy images primed on both sides:

| region | dark | light |
|---|---|---|
| everything above the block | 252 297 px differ — **every one inside the three "О компании" photo boxes** (bbox x 128…1313, y 1665…1915); **0 px outside them**; max Δ 34, mean 1.94 inside | identical figures |
| footer band, shift applied | **0 differing px** | **0 differing px** |
| page tail below the footer | **0 differing px** | **0 differing px** |

The only visual change outside the new block is the deliberate photo re-encode, judged in
`G14-performance.md`. (`data/diff.py`.)

## 6. One theme, two documents, no reload

Each side is driven through its **own** switch rather than by writing the other's attribute:
the landing clicks the board's `#theme-toggle`, the board's changes click the landing's. The
first audit caught why that matters — writing the attribute behind the button's back left it
announcing the opposite of what the board was showing. Now:

| step | landing | board | board button `aria-pressed` | frame reloaded |
|---|---|---|---|---|
| after load | dark | dark | true (its own convention) | — |
| landing flip 1…3 | light / dark / light | same | false / true / false | no |
| board flip | dark | dark | true | no |

**Stale button states: 0. Mismatched themes: 0. Frame reloads: 0. Console errors: 0.** The
frame's window was stamped before the flips and the stamp survived every one, which is what
proves no reload. On load nothing has to be pushed at all: the board is same-origin, so it
reads the same `localStorage["theme"]` itself. (`data/theme-test.js`, `data/verify-fixes.js`.)

The two projects use **opposite** `aria-pressed` conventions — the board says `true` in dark,
the landing says `false` in dark. Each is self-consistent; the inversion is pre-existing in
both codebases and was deliberately not touched.

### The regression that fix caused, and its cure

The independent re-audit caught what clicking a real button costs: **a switch also
remembers.** Both toggles write `localStorage["theme"]`, so mirroring a flip that came from
the *operating system* (not from the visitor) stored it — and from then on the page ignored
the OS. A visitor who never touched a switch, but scrolled past the board once, had their
theme frozen at the next day-night change.

The mirror now puts the store back: if nothing was stored before the mirroring click,
nothing is stored after it. Measured with the OS theme flipped three times and nobody
touching a switch (`data/os-theme.js`):

| page | follows the OS every time | `localStorage` after three OS flips |
|---|---|---|
| pre-task page (control) | yes | `null` |
| shipped, board never visited | yes | `null` |
| **shipped, board visited then left behind** | **yes** | **`null`** |

A real click on either switch still remembers, exactly as before.

## 7. Scripting off — corrected after audit

The first version shipped a `<noscript>` fallback with a plain `<iframe>`. The auditor
showed what that actually did: **1.16 MB downloaded to paint a frozen, wrong-theme board
clipped to its top-left corner** — the board is a live JS demo, its own scaling and theme
need scripting, and the landing defaults to dark while the board defaults to light.

The fallback is gone and the whole block is now gated behind a `has-board` class that only
the script sets. Measured with JavaScript disabled (`data/nojs.js`):

| | result |
|---|---|
| `<iframe>` elements in the document | **0** |
| requests to `/board/` | **0** |
| requests for `css/board-block.css` | **0** — the stylesheet is never even fetched |
| block box | 0 px tall, no children |
| accessible name on the block | **none** — so it is not a landmark either (see below) |
| footer y | **2672** — its original place |
| document height | **3096** — the original canvas |
| total requests | **28** — the same count as the pre-task page |

Without scripting this block adds nothing at all. Two corrections the re-audit forced on the
wording, both now fixed in the code as well as here:

- The page is **not** byte-identical to the pre-task page with scripting off — the three
  "О компании" photos still arrive as AVIF. That change is deliberate and independent of
  scripting; only the *block* is absent.
- The section used to carry `aria-label="Живой пульт"` in the markup, which made it a named
  **region landmark with nothing inside it** for a screen-reader user with scripting off —
  something the pre-task page did not have. The name is now attached by the script at the
  same moment the block is enabled. Measured: scripting off → no name, not a landmark, 0 px
  tall; scripting on → named, 1200 px tall at 1920. (`data/landmark.js`.)

## 8. Other edge cases

| case | result |
|---|---|
| live resize after load (1440 → 1920 → 2560 → 1280 → 1440) | block and board stage follow together every time; **0 console errors**; overflow only the pre-existing one at 1280. `fit()` is throttled to one frame at a time |
| narrow viewports (375, 768) | block 1440 × 900, `scrollWidth` stays 1440 — no new overflow. The landing is desktop-only by design; the block does not make that worse |
| the frame sleeping and waking | hidden beyond 800 px, shown again within 600 px, torn down after 30 s asleep, correct theme on return; the block's box is CSS-sized and does not change in any of those states. The re-audit's own crawl through the boundary produced exactly 2 transitions and never more than one frame, and 12 fast flicks never exceeded one frame either |
| duplicate `id="theme-toggle"` in both documents | separate documents, nothing collides; the mirror falls back to setting the attribute if a button is missing |
| keyboard | the frame is reachable by tab with its accessible name, and focus inside it lands on the board's own switch |
| the seam at the block's bottom edge | the board's own ground is a shade off the page's: dark `rgb(39,39,39)` against `rgb(33,33,33)`, light `rgb(237,241,248)` against `rgb(235,241,249)`. That is the board's own sheen gradient, inside a frozen project — noticed, not touched |
| waking after sleep, and after a resize while asleep | the board comes back at exactly the block's size: 1440 × 900 at scale 0.75, 1920 × 1200 at scale 1.0, and it follows a window resized while it slept (1440 → 1920 and back). **0 console errors.** While asleep its stage measures 0 × 0, which is what a non-rendered document should measure, and it recovers on its own. (`data/wake.js`) |

## 9. The board project was not touched

Copied into `board/` — **69 files, 1 793 218 B, every one identical by md5** (the auditor
re-checked with SHA-256 and got the same), internal folder structure kept verbatim so no
path changed. From its new path it loads standalone with **0 console errors, 0 page errors,
0 failed requests, 0 HTTP errors**. `V:\brain\Globus\dash-cold-calls-2` was read and never
written; its only dirty file (`reference/12-ПРАВКИ-ШЕФА-ТЁМНАЯ.md`) was already dirty before
this task.

## Acceptance screenshots

| what | path |
|---|---|
| full page, 1440, dark / light | `shots/accept-1440-dark.png`, `shots/accept-1440-light.png` |
| full page, 1920, dark / light | `shots/accept-1920-dark.png`, `shots/accept-1920-light.png` |
| the block itself, both themes | `shots/block-dark.png`, `shots/block-light.png` |
| joint: form card → block | `shots/joint-form-board-1440-{dark,light}.png` |
| joint: block → footer | `shots/joint-board-footer-1440-{dark,light}.png` |
| the three photos, before / after the re-encode | `shots/about-photos-{before,after}-1440-{dark,light}.png` |

## Audit trail

| round | verdict | what it caught |
|---|---|---|
| **independent audit 1** | **FAIL** | the `<noscript>` path downloading 1.16 MB to paint a frozen, wrong-theme, clipped board; the board's own switch going stale; two overstated claims — "never wider than the viewport" and "pixel-identical" for the footer |
| **independent re-audit** | **FAIL** | the click-driven theme mirror froze `localStorage` and stopped the page following the OS; an empty named landmark exposed with scripting off; a CSS comment asserting a cause its own measurements refuted |
| this state | — | mirror restores the store; the landmark is named only when the block exists; the comment rewritten; every claim above re-measured |

Both audit rounds were right, both changed the shipped code, and both of them confirmed the
parts that did hold — 0.0000 px of movement above the block, the exact footer shift, the
untouched board project — with their own independent scripts.

## Verdict

**G16 — PASS on the state measured here.** Nothing above the block moves by any measurable
fraction of a pixel in either theme at any of four widths; the footer is identical to within
the renderer's own anti-aliasing once its shift is applied, and the cause of those 10–22
pixels is proven to be independent of this work; the board shows whole at its own ratio with
no inner scrollbar; one switch drives both documents with no reload, no console errors and
without stealing the visitor's OS preference; with scripting off the block leaves no trace
at all; the board project is byte-identical to its source.

The re-check of *these last fixes* is this file's own measurement — the two independent
auditors verified the state before them. That is stated plainly rather than claimed as an
independent pass.
