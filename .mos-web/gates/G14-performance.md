# G14 — Performance

Subject: the framed board added at the bottom of the landing, and the three
"О компании" photos re-encoded on the way past. Everything below is measured, never
claimed: real Chromium (Playwright 1.62.1, headless), real navigations against the real
files over a local HTTP server, a fresh **browser** per timing run so every load is cold.
Every script that produced a number is in `data/` next to this file.

Скилл `mosweb` на машине НЕ установлен (проверено `ListSkills` / `ListPlugins`; то же
записано в `PLAN.md` самого борда за три предыдущих захода). Ворота и роль независимого
аудитора применены как указано, но шаблон ворот написан здесь, а `mosweb-performance-audit`
заменён независимыми подагентами, которые пересчитывают всё с нуля своими скриптами.
Уверенность из-за этого понижена — сказано прямо.

## How "before" was reconstructed

The landing's working tree was already dirty when this task started, so `git HEAD` is not
the pre-task state. The "before" side is a rebuilt copy of the page with exactly this
task's additions removed (`data/make-baseline-site.py`), served from its own port. Three
checks say the rebuild is honest, and the first independent auditor re-verified it
file-by-file:

| check | result |
|---|---|
| `index.html` byte size | **23 996 B** — the size the discovery pass recorded for the pre-task file |
| full-page screenshots vs the pristine capture taken before the first edit | **0 differing pixels**, both themes |
| first-load bytes and requests vs that pristine capture | **2 185 609 B / 28 requests** — identical |

## 1. First load — bytes and requests

1440 × 900, dark, cold cache, bytes from the wire (body + headers) across **all frames**.
n = 20 per side, arms alternating.

| | before | after | delta |
|---|---|---|---|
| transferred bytes, first load | **2 182 684 B** | **928 217 B** | **−1 254 467 B (−57.5 %)** |
| variance over 20 runs | none — one value | none — one value | deterministic |
| requests | 28 | 29 | +1 |
| bytes / requests from `/board/` | 0 | **0 / 0** | the board is not on the first load at all |

### Where the win actually comes from — corrected after audit

The independent auditor was right to challenge the attribution, and the claim is corrected
here: **the −57.5 % is the photo re-encode, not the board work.** The three photos go from
1 369 210 B to 101 356 B — **−1 267 854 B, i.e. more than the whole net saving** — while the
board block itself *adds* **+11 188 B** on first load (index.html +7 515, board-block.css
+3 673 with headers) and one request. The block is a small cost that the photos more than
pay for; it is not the saving.

The whole landing plus the whole board, after the visitor has scrolled to the bottom, is
**2 091 864 B** — still less than the landing alone weighed before this task.

## 2. The board is genuinely lazy, and it also stops

Two mechanisms were measured and rejected before the current one:

| tried | measured result |
|---|---|
| `loading="lazy"` on an `<iframe>` in the markup | Chromium's own distance threshold fetched all 16 board requests during the first load |
| `data-src` placeholder on an `<iframe>` in the markup | fetching fixed, but the empty element still cost the parser a child document: **+160 ms of DOMContentLoaded** |
| **shipped:** no iframe in the markup at all; an `IntersectionObserver` builds it 600 px before the block arrives | 0 requests, 0 bytes, no DOM cost |

| moment | requests to `/board/` | bytes |
|---|---|---|
| after load, no scrolling | **0** | **0** |
| scrolled to the bottom | 16 | 1 165 846 B |

### The one real regression this work introduced, and its fix — corrected twice

The first independent audit measured the framed board **running at a steady 60 fps and
~12 % of one CPU core for the rest of the visit, including while scrolled completely off
screen** — `board/demo-engine.js` has no visibility guard, and the page without the board
idles at 1 %. That is battery drain on a laptop and it was not disclosed anywhere.

The board project is frozen for this task, so it was not touched; the landing has to
handle it from outside. **The first attempt at that was wrong and the re-audit caught it:**
removing the frame beyond a 1600 px margin can only ever fire while
`2600 − scrollY > innerHeight + 1600`, i.e. **never on a window taller than 1000 px**, and
on a 900 px window only in the top 100 px of a 3 096 px scroll range. On a 1440p monitor
nothing was fixed at all.

What ships now is a two-stage retreat, and it does not depend on the page's geometry:

| stage | trigger | what happens |
|---|---|---|
| awake | the block is within 600 px of the viewport | the board runs |
| asleep | the block is more than 800 px away | `display:none` — the frame is not rendered, so the rendering work stops; the document and its counters stay alive |
| gone | 30 s asleep | the element is removed; the rebuild afterwards is free from cache |

Measured with CDP main-thread task time, at the four viewport heights the old guard could
never reach (`data/cpu3.js`):

| viewport | board on screen | asleep (scrolled to the top) | 30 s later |
|---|---|---|---|
| 1440 × 900 | 11.34 % of a core | **1.43 %** | **0.00 %, frame gone** |
| 1440 × 1080 | 13.52 % | **1.30 %** | **0.00 %, frame gone** |
| 1920 × 1200 | 14.28 % | **1.33 %** | **0.00 %, frame gone** |
| 1440 × 1329 | 15.74 % | **1.29 %** | **0.00 %, frame gone** |

Controls measured the same way: the pre-task page idles at 0.01 %, and the shipped page
whose board was never reached also idles at 0.01 % — so after the teardown the page is
back to costing exactly nothing. A quick scroll away and back keeps the board's own
counters (measured: 121 before, 124 after); only a teardown restarts the demo.

## 3. FCP and DOMContentLoaded

n = 20 per side, fresh browser per run, arms alternating.

| | before | after |
|---|---|---|
| FCP min / p25 / median / p75 / p90 / max | 208 / 224 / **236** / 244 / 256 / 260 ms | 212 / 228 / **236** / 248 / 268 / 340 ms |
| DOMContentLoaded min / p25 / median / p75 | 35.2 / 40.8 / **45.9** / 50.6 ms | 34.9 / 39.5 / **44.8** / 49.9 ms |
| load median | 209.7 ms | 244.4 ms |

**Neutral, not a win** — and the independent auditor was right to insist on that wording.
FCP is quantised in 4 ms steps here and its interquartile range is ~25 ms, so a median that
lands on the same 236 ms and a DCL median 1 ms apart are both noise, not improvement. The
honest claim is that the page is **no slower to first paint than it was**, while carrying
1.25 MB less. `load` is ~35 ms later because the work that used to block a paint now happens
after it: the block's stylesheet is fetched non-blocking and the three AVIF photos decode
below the fold.

Two regressions were found by measurement during this work and both were removed:

1. **+115 ms of DOMContentLoaded** from writing `--bleed-w` on `<html>` *during parsing* —
   a custom property on the root invalidates the style of the whole 4 000 px document. The
   same call inside `requestAnimationFrame` (still before the first paint, so the block is
   the right size on the first frame) put it back.
2. **+16 ms of FCP and ~+6 ms of DCL** from `css/board-block.css` being a fourth
   render-blocking `<link>` — pointed out by the independent audit. The script now injects
   it with `media="print"` and flips it to `all` on load, so it never holds up a paint.
   The block is hidden until then anyway (`.has-board`), so there is no flash to trade for it.

`load` is ~20 ms later on the after side: the page does that work *after* the first paint
now, not before it. Stated rather than hidden.

## 4. The three "О компании" photos

Encoded from the original 696 × 505 RGBA PNGs at their own pixel size — no dimension, no
layout box, no breakpoint changed. Served through `<picture>`: AVIF, then WebP, then the
untouched PNG, the same pattern the two operator photos in this file already use.

| file | png | avif (q80) | webp (q92) |
|---|---|---|---|
| 06-office-exterior | 402 019 B | 29 690 B | 39 462 B |
| 07-office-interior | 485 246 B | 37 469 B | 48 860 B |
| 08-agent-photo | 481 375 B | 33 627 B | 46 016 B |
| **total** | **1 368 640 B** | **100 786 B (7.4 %)** | **134 338 B (9.8 %)** |

Difference at the box the page actually paints (347.91 × 252.41 CSS px), composited over
both grounds (`data/encode2.py`), cross-checked by the independent auditor against
Chromium's own render:

| file | max channel Δ | mean Δ | px with Δ > 2 | PSNR (auditor) |
|---|---|---|---|---|
| 06-office-exterior | 17 | 1.10 | 20.9 % | 44.6 dB |
| 07-office-interior | 31–34 | 1.28 | 29.2 % | 42.7 dB |
| 08-agent-photo | 20 | 1.10 | 21.0 % | 44.6 dB |

**The word "imperceptible" is withdrawn.** A fifth of the painted pixels move, by about one
level of 255 on average. The honest statement is: *visually equivalent at the size the page
paints them, at 42.7–44.6 dB, for 7 % of the bytes* — a trade worth making, stated with the
numbers rather than with an adjective. The alpha channel is only a ~1 % rounded-corner mask
and both formats keep it, so the two theme grounds give the same figures.

## 5. No new horizontal overflow

`scrollWidth` vs `clientWidth`, both themes, at 360 / 768 / 1280 / 1440 / 1920 / 2560:
identical to the baseline everywhere; new overflow **0**. The 1280 overflow (page 1440,
viewport 1280) is **pre-existing** — the landing is a fixed 1440 canvas with no responsive
rules. The block is deliberately floored at 1440 px wide so it can never widen it.

## Costs of the retreat mechanism, measured rather than assumed

The independent re-audit measured the rebuild cost over five in/out cycles and found it
cheap: **0 bytes on every rebuild** (16 requests, all from cache, even with a server sending
no `Cache-Control`), **0 new long tasks**, **0 layout shift** (CLS flat at 0.042 across all
five cycles), and no leak — nodes, documents, frames and listeners all flat, heap 0.80 →
0.82 MB. Two small costs are real and are stated rather than hidden:

- **A hard jump to the bottom (the End key) shows the block empty for 50–64 ms**, two or
  three frames, because the 600 px lead is consumed instantly. 233 ms on the very first
  cold visit. Invisible when scrolling normally.
- **After a teardown the demo restarts from its seed**, so a visitor who returns after more
  than 30 s away sees the live counters begin again. Within the 30 s window the frame only
  sleeps and the counters carry on.

## What was noticed and NOT touched

- **The board's own 1.17 MB is unoptimized**: three `op-avatar-*.png` = 401 540 B, both
  theme logos loaded unconditionally (93 358 + 51 295 B), ~256 KB of woff2 including two
  full Open Sans faces. The AVIF treatment given to the landing was deliberately not applied
  inside `board/` — that project is frozen and its copy here is verbatim.
- `board/demo-engine.js` still has no `visibilitychange` / IntersectionObserver guard of its
  own. The landing works around it from outside; the board itself would still burn a core in
  any other embedding.
- CLS is ~0.04 on both sides, pre-existing, above the fold, nowhere near the block.

## Audit trail

| round | verdict | what it caught |
|---|---|---|
| self-measurement | — | +115 ms DCL from writing a root custom property mid-parse; fixed before the first audit |
| **independent audit 1** | **FAIL** | the off-screen CPU burn (~12 % of a core, forever); `board-block.css` render-blocking (+16 ms FCP, +6 ms DCL); the byte win misattributed to the board work; "imperceptible" overstated for the photos |
| **independent re-audit** | **FAIL** | the CPU fix only worked on windows shorter than 1000 px — i.e. not on a 1440p monitor at all; and the claimed FCP/DCL *gain* did not reproduce (it is neutral, not a win) |
| this state | — | two-stage retreat (sleep, then teardown) measured at four viewport heights; FCP/DCL restated as neutral; attribution corrected to the photos |

Both audit rounds were right, both changed the shipped code, and both are quoted above with
their own numbers rather than summarised away.

## Verdict

**G14 — PASS on the state measured here.** Bytes on first load −57.5 %, deterministic
(the saving is the photos; the block itself costs +11 KB); the board contributes nothing
before it is approached, drops to 1.3 % of a core the moment it is left behind and to zero
thirty seconds later, at every viewport height tested; first paint is unchanged against the
pre-task page.

The third-round re-check of the sleep/teardown mechanism is this file's own measurement, not
an independent one — the two auditors verified the *previous* state. That is stated plainly
rather than claimed as an independent pass.
