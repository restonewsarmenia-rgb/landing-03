# MASTER-STATE — landing-03

Mode: **MOS-07 MAINTENANCE** — two live projects, neither may break.
Repo: `V:\repos\landing-03` · remote `restonewsarmenia-rgb/landing-03` · branch `main`.
Board project: `V:\brain\Globus\dash-cold-calls-2` — finished, referenced only by a copy,
never edited.

Скилл `mosweb` на этой машине НЕ установлен (проверено `ListSkills` / `ListPlugins`).
Порядок ворот, артефакты и правило независимого аудитора применены как указано,
шаблоны ворот написаны здесь, аудиторы — независимые подагенты, считающие с нуля.

## Where the work stands

| step | what | state |
|---|---|---|
| discovery | how the board could join the landing at all | ГОТОВО — `.mos-web/discovery/landing-03-x-board.md` |
| embed | the board framed at the bottom, full-bleed, lazy | ГОТОВО — G14 + G16 |
| theme | one switch driving both documents | ГОТОВО — G16 §6 |
| images | the three "О компании" photos in AVIF/WebP | ГОТОВО — G14 §4 |

## What this step added (and nothing else)

| file | new / changed | what |
|---|---|---|
| `board/` | new, 69 files, 1 793 218 B | verbatim copy of the built board, same origin as the landing |
| `css/board-block.css` | new | the block's own geometry; no existing rule edited, no existing token redefined; injected by script, not linked in the head |
| `index.html` | changed, 3 insertions | the `<section class="board-bleed">` (empty by design), one `<script>`, and `<picture>` wrappers around the three About photos |
| `assets/0{6,7,8}-*.avif` / `.webp` | new, 6 files | modern cuts of the three About photos at their own pixel size |
| `.mos-web/gates/` | new, 7.6 MB | G14, G16, their raw data, the measurement scripts and the acceptance screenshots. **Not gitignored — decide before `git add -A`.** |

The block is the only thing on this page wider than the 1440 canvas. Everything above it
measured **0.0000 px** of movement, both themes, at 1280 / 1440 / 1920 / 2560.

## Numbers that matter

| | before | after |
|---|---|---|
| first-load bytes | 2 182 684 | **928 217 (−57.5 %)** — the win is the photos (−1 267 854), not the block |
| the block's own cost | — | +11 188 B, +1 request |
| first-load requests | 28 | 29 |
| bytes from the board on first load | — | **0** (16 requests / 1 165 846 B arrive only on approach) |
| FCP median (n=20, fresh browser per run) | 236 ms | 236 ms — unchanged |
| DOMContentLoaded median | 45.9 ms | 44.8 ms — unchanged |
| load median | 209.7 ms | 244.4 ms — work moved after the first paint |
| board's cost once seen, then left behind | — | 1.3 % of a core asleep, **0.00 % after 30 s** |
| landing + board loaded together | — | 2 094 063 B, still less than the landing alone weighed before |

## Independent audit — what it caught

Four independent auditors recomputed everything from scratch with their own scripts, in two
rounds. **All four returned FAIL, and all four were right.** Seven defects came out of it;
every one is fixed and re-measured:

| round | defect | fix |
|---|---|---|
| 1 · perf | the framed board ran at 60 fps / ~12 % of a CPU core forever, including off screen | see the row below — the first fix was wrong |
| 1 · perf | `board-block.css` was a fourth render-blocking `<link>`: +16 ms FCP, +6 ms DCL | injected by script as `media="print"`, flipped to `all` on load |
| 1 · QA | the `<noscript>` fallback downloaded 1.16 MB to paint a frozen, wrong-theme, clipped board | removed; the whole block is gated behind a `has-board` class |
| 1 · QA | the board's own switch went stale and announced the opposite of what it showed | each side is driven through its own switch |
| **2 · perf** | **the CPU fix only fired on windows under 1000 px tall — useless on a 1440p monitor** | two-stage retreat: `display:none` beyond 800 px (1.3 % of a core), element removed after 30 s asleep (0.00 %) |
| **2 · QA** | **clicking a switch to mirror the theme stored it, so the page stopped following the OS** | the mirror restores `localStorage` when the flip did not come from the visitor |
| **2 · QA** | an empty named landmark was exposed to screen readers with scripting off | the block is named by the script, only when it exists |

Three claims were also overstated and are now written as they measure: the block is floored
at 1440 px and is therefore *wider* than the viewport below 1440; the shifted footer is
identical only to within the renderer's own anti-aliasing (10–22 px at 1920/2560, Δ ≤ 4/255,
cause proven independent of this work); and first paint is **unchanged**, not improved.

## Frozen zones — do not touch without a new plan

- The board project `V:\brain\Globus\dash-cold-calls-2`: read-only for this landing.
  The copy in `board/` is a copy; if the board is rebuilt, re-copy it, do not patch it.
- The landing's fixed 1440 canvas, its absolute coordinates, its tokens, its fonts, its
  theme scheme, its existing sections and their order, its footer's own rule.
- `.form-card` bottom 2528 and `.footer-card` top 2672 are the two numbers the new block
  is anchored to (`top: 2600px`, i.e. 2528 + 72). If either section moves, that constant
  and the block's gap move with it.
- The frame is built in script on purpose, and taken down again on purpose. Putting an
  `<iframe>` back into the markup costs ~160 ms of DOMContentLoaded on this page; writing
  `--bleed-w` on `<html>` during parsing instead of in a frame costs ~115 ms; making
  `board-block.css` a `<link>` in the head costs ~16 ms of FCP. All three were measured,
  all three are in G14.
- The frame is removed from the DOM beyond ~1600 px of scroll because the board's own
  animation loop never idles — ~12 % of a CPU core, off screen, for the rest of the visit.
  If `board/demo-engine.js` ever grows its own visibility guard, this workaround can go.
- There is no `<noscript>` fallback on purpose: without scripting the board renders frozen,
  in the wrong theme and clipped, after downloading 1.16 MB to do it.

## Pre-existing dirt, left exactly as found

The landing's working tree was already dirty before this task and was not cleaned,
staged or "fixed": modified `UNKNOWNS.md`, `css/style.css`, `css/tokens.css`,
`index.html`; untracked `.claude/`, many `assets/*`, `assets2/`, `audit/`,
`cold-calling/`, `css/fonts.css`, `fonts/`. In the board project, `reference/12-ПРАВКИ-ШЕФА-ТЁМНАЯ.md`
was already modified before this task and stays that way.

Nothing was staged, committed or pushed by this step.
