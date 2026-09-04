# Discovery: landing-03 × dash-cold-calls-2 (read-only recon)

Purpose: find out exactly how the finished board `dash-cold-calls-2` can be dropped
into the bottom of the `landing-03` landing page inside a frame. Nothing was changed
in either project to produce this file. All numbers below come from a real Chromium
navigation (via the Browser pane / Playwright-style tooling) against the actual files,
served over a local static HTTP server (`python -m http.server`) so relative CSS/JS/
font/image links resolved exactly as they do in production — a raw `file://` open of
these pages silently drops every `<link>` stylesheet in this sandbox and was rejected
as a measurement source once that was discovered.

Skill note: the `mosweb` plugin/skill named in the task's boot order is **not
installed** in this environment (confirmed via `ListSkills` / `ListPlugins`, and
independently confirmed by the board's own `PLAN.md`, which records the same absence
across three earlier rounds of work). No mos-web routing sections were available to
load. This run proceeded directly against the two projects instead, exactly as the
board's own prior rounds did under the same constraint.

---

## 1. Landing located

- **Path:** `V:\repos\landing-03` (the session's own working directory)
- **Remote:** `https://github.com/restonewsarmenia-rgb/landing-03.git`
- **Branch:** `main`
- **HEAD:** `121aa93ae60f3089236f8879556584855c5f162f`
- **Working tree:** dirty — **pre-existing**, not caused by this run. Modified:
  `UNKNOWNS.md`, `css/style.css`, `css/tokens.css`, `index.html`. Untracked: `.claude/`,
  numerous `assets/*` (image variants, logos, header vectors), `assets2/`, `audit/`,
  `cold-calling/`, `css/fonts.css`, `fonts/`. Identical before and after this run.
- No second copy of `landing-03` was found under `V:\brain` or `V:\brain\Globus` — only
  a *different*, unrelated project named `landing` exists at `V:\brain\Globus\landing`.
  `V:\repos\landing-03` is the only candidate and its remote matches
  `restonewsarmenia-rgb/landing-03` exactly, so it is the one used for every
  measurement below.

Board, as given: `V:\brain\Globus\dash-cold-calls-2` (`index.html` 174,540 B,
`styles.css` 119,611 B, `demo-engine.js` 51,027 B, `PLAN.md`). It lives inside the
`V:\brain` git superproject; nothing under it was modified by this run either (its
pre-existing dirty state, e.g. `reference/…md`, `../../dashboard-data.json`, is
unrelated to `dash-cold-calls-2` and was not touched).

---

## 2. Landing's canvas: fixed 1440px, no scaling mechanism at all

`css/style.css` states its own intent in its second line: *"Desktop only, canvas 1440
wide. No responsive rules."* Confirmed in code and by measurement:

- `<meta name="viewport" content="width=1440">` — a fixed layout-viewport width, not
  `device-width`. Desktop Chrome mostly ignores this for its own window sizing.
- `.page { width: 1440px; height: 3096px; margin: 0 auto; }` — a single fixed-size
  absolutely-positioned canvas, centered by `margin: auto`. No `max-width`, no
  `clamp()`, no `transform: scale`, no width-changing `@media` query anywhere in the
  stylesheet (the only `@media` rule present is `prefers-reduced-motion`).

Measured `.page` behaviour at four real viewport widths (Chromium, real navigation,
`document.querySelector('.page').getBoundingClientRect()`):

| viewport width requested | actual `clientWidth` seen | `.page` width | horizontal scrollbar | letterbox each side |
|---|---|---|---|---|
| 1280 | 1265 | **1440px (unchanged)** | **yes** | — (page wider than viewport) |
| 1440 | 1425 | **1440px (unchanged)** | **yes** | — (vertical scrollbar alone eats ~15px, so even the "native" width overflows by ~15px) |
| 1920 | 1905 | **1440px (unchanged)** | no | 232.5px |
| 2560 | 2545 | **1440px (unchanged)** | no | 552.5px |

**This is the core mismatch the task asked to surface.** The landing does not scale
as a unit at all — it is a fixed 1440px stage that either gets a horizontal scrollbar
(below ~1455px of real viewport) or sits centered with growing empty margins (above
1440px). The board, by contrast, scales itself as one whole unit to any container
width with no reflow (see §7). These are two different responsive philosophies and
they do not currently meet in the middle — the landing today does not know how to
"fit" a variable-width child area at all, because it never resizes anything itself.

---

## 3. Tail of the page — where the board would go

Last three top-level children of `.page`, in document order:

1. `<section class="about" data-node-id="96:6704">` — "О компании" (3 photos, 1 heading, 1 paragraph)
2. `<section class="form-card" data-node-id="146:4966">` — the contact/order form
3. `<footer class="footer-card" data-node-id="152:5008">` — logo, description, socials, 3 link columns, copyright

Yes, a real `<footer>` exists and is the last element in `.page`. The natural
insertion point for the board is **between `.form-card` and `.footer-card`**, or
after `.footer-card` as a new closing section — both are viable; nothing currently
occupies that gap.

---

## 4. Theme systems — a near-exact match, deliberately

Landing (`index.html`, inline head script + closing body script):
- Attribute: `data-theme` on `<html>` (`documentElement`)
- Storage: `localStorage.getItem/setItem("theme")`
- Default when unset: OS preference via `matchMedia("(prefers-color-scheme: light)")`,
  falling to **dark** if that doesn't match
- A `<button id="theme-toggle">` flips the attribute and persists the choice
- Listens for OS theme changes and follows them **only** while no explicit choice is stored

Board (`index.html` inside `dash-cold-calls-2`, same two script blocks):
- Identical attribute name, identical storage key `"theme"`, identical
  `matchMedia("(prefers-color-scheme: light)")` OS-fallback, identical
  "only follow OS while nothing is stored" listener, identical toggle-button shape.
- The board's own script carries this comment verbatim: *"Same shape as the landing's,
  so the two behave identically once this board sits inside it."* — the board's author
  built this intentionally to match, anticipating exactly this join.

One cosmetic inversion, invisible in practice: the landing's `sync()` treats *anything
other than* `"light"` as dark (`!== "light"`), the board's `sync()` treats *only*
`"dark"` explicitly as dark (`=== "dark"`, comment: *"no attribute means light here"*).
Since both inline boot scripts always set the attribute explicitly before first paint,
this never surfaces as a visible difference — it only matters if some future code path
left the attribute unset, which neither script does today.

**Verdict:** if the board is served **same-origin** as the landing (e.g. mounted at a
subpath of the same domain, not a different subdomain/host/port), `localStorage` is
shared automatically — both pages read and write the exact same key, so flipping the
landing's toggle and then loading/refreshing the framed board would already show the
matching theme with **zero glue code**. What does *not* come free: a live, same-frame
flip. Today, flipping the landing's toggle only touches the landing's own `<html>`
attribute; the iframe's document does not observe that change on its own (no
`storage` event fires in the same tab that wrote the value, only in *other* tabs/
frames of a different browsing context sharing that origin — an iframe counts as
another browsing context, so it likely *would* receive the `storage` event, but this
was not exercised live in this recon and should be verified before shipping, not
assumed). The safe, explicit option is a one-line `postMessage` from the landing's
toggle handler telling the iframe to flip too; that is a joining-task change, not
made here.

---

## 5. Fonts and tokens — zero CSS-variable collisions, but a real font-name collision

**Custom properties.** Landing declares roughly 90 `--*` tokens, all under the
namespaces `--color-*`, `--fs-*`, `--fw-*`, `--lh-*`, `--ls-*`, `--radius-*`,
`--shadow-*`, `--gradient-*`, `--font-*`. Board declares roughly 70 `--*` tokens,
all under `--dash-*`, `--cc-*`, `--board-scale`, `--design-*`, `--plate-*`. **The
intersection is empty** — not one custom-property name is shared between the two
stylesheets. A direct inline merge would not clobber any CSS variable.

**Font-family names collide.** Both stylesheets declare `@font-face` rules for the
*same family names* — `'Manrope'`, `'Inter'`, `'Open Sans'` — but backed by
**different physical files** and different loading strategy:

| family | landing | board |
|---|---|---|
| Manrope | one variable file `Manrope-var.woff2`, `font-weight: 200 800`, `font-display: swap`, no `unicode-range` | 4 static per-subset files (`manrope-{cyrillic,cyrillic-ext,latin,latin-ext}-normal.woff2`), each `font-weight: 200 800`, `font-display: block`, each with its own `unicode-range` |
| Inter | per-weight static files (400/600/800 × cyrillic/latin/ext, 12 files total), `font-display: swap` | variable file(s), `font-weight: 100 900`, `font-display: block` |
| Open Sans | one weight (800) × 5 subsets, `font-display: swap` | multiple weights incl. italics, `font-display: block` |

If these two stylesheets ever load **in the same document** (a direct inline merge,
not a frame), the browser resolves each `family + weight + unicode-range` match
independently per `@font-face` rule in cascade order — whichever stylesheet's
matching rule was parsed last wins for that exact combination. That can silently
swap which physical font file paints which page's text, with different metrics
(variable vs static, `swap` vs `block` — the latter can also introduce an invisible-
text flash the landing doesn't otherwise have). **This is the concrete mechanism
behind the task's warning that "a frame isolates styles and a direct inline merge
does not"** — here it is not hypothetical, it is these three family names.

---

## 6. Weight and load — real byte counts from a real navigation

Measured via `performance.getEntriesByType('resource')` after a full page load
against the local server, cross-checked against on-disk file sizes for every URL the
browser actually requested (no compression is in play — Python's `http.server` sends
raw bytes, so on-disk size = wire size here):

| page | requests | total transferred | heaviest items |
|---|---|---|---|
| **landing-03** (`index.html`, dark theme, default 1440 layout) | 27 | **2,177,209 B (~2.08 MB)** | three About-section PNGs with no responsive `<picture>`: `07-office-interior.png` 485,246 B, `08-agent-photo.png` 481,375 B, `06-office-exterior.png` 402,019 B — **1,368,640 B, ~63% of the whole page**, and they sit in the section immediately above where the board would be inserted |
| **dash-cold-calls-2** (`index.html`) | 15 | **1,162,740 B (~1.11 MB)** | `index.html` itself 174,540 B (all the plate/glass markup lives in HTML, not generated), `styles.css` 119,611 B, three operator-avatar PNGs 120,962 + 128,267 + 151,741 B |

Combined, worst case (both loaded on the same page view, no dedup possible since the
collision in §5 is names only — the actual font *files* differ byte-for-byte):
**~3.34 MB**. The landing is already the heavier of the two pages before the board is
added, and it is heaviest exactly at the point (About section) that immediately
precedes the proposed insertion point. This is the concrete argument for lazy-loading
the iframe (`loading="lazy"`, or an `IntersectionObserver`) rather than eagerly
loading another ~1.1 MB the moment the page opens.

---

## 7. Frame feasibility — the board holds one constant ratio, always

The board's own CSS fixes everything: `--design-w-n: 1920`, `--design-h-n: 1200`,
`#stage { aspect-ratio: 1920 / 1200; }`, `#board { transform: scale(var(--board-scale)) }`
with `--board-scale` written by a small script as `stage.clientWidth / 1920` on load
and on resize. **1920 : 1200 reduces to 8 : 5, i.e. exactly 1.6 : 1** — a fixed ratio
that does not vary with width, because the stage's height is derived from its own
width by CSS `aspect-ratio`, not computed by the script.

Measured live (fresh navigation at each width, real Chromium layout):

| requested viewport width | actual container width available | required frame height | `--board-scale` computed | inner scrollbar |
|---|---|---|---|---|
| 1280 | 1265px | 790.625px | 0.658854 | no |
| 1440 | 1425px | 890.625px | 0.742188 | no |
| 1920 | 1905px | 1190.625px | 0.992188 | no |
| 2560 | 2545px | 1590.625px | 1.325521 | no |

In every case `height = width × 0.625` exactly, and `document.getElementById('stage')`
never scrolls internally (`scrollWidth === clientWidth`, `scrollHeight === clientHeight`
every time). This also held at a narrow 375px width (scale 0.195313, height 234.375px,
still no inner scrollbar) — the board does not break down or need a minimum width to
render without clipping.

**Practical consequence:** the embedding frame does not need a per-breakpoint sizing
table at all. Giving the iframe element itself `aspect-ratio: 1920 / 1200; width: 100%;
border: 0;` (or equivalently `8 / 5`) is sufficient — the browser sizes the iframe's
box to that ratio at whatever width the landing gives it, the board's own script then
reads that exact width via `stage.clientWidth` on load, and the two ratios match by
construction. No JS bridge is required just to keep the frame's aspect correct.

**One caveat found, and resolved.** While probing resize behaviour (not fresh loads)
against the running board, the viewport-resize mechanism this recon's browser tooling
uses (a DevTools-protocol device-metrics override) reliably changed the layout box
size but did **not** fire a native `resize` event or trigger the board's
`ResizeObserver` — `--board-scale` stayed frozen at the value computed for the
previous width even though `#stage`'s actual box had already changed size to match
the new width. Manually dispatching `window.dispatchEvent(new Event('resize'))`
immediately corrected `--board-scale` to the right value, proving the board's own
resize-handling code is correct — the stall was an artifact of this test harness's
viewport emulation, not a defect in the board. Every *fresh load* at every width
computed the exactly correct scale (table above). This still leaves one thing
unverified rather than assumed: whether a genuine, non-reload resize of the iframe
element itself (e.g. the landing later adds a collapsible sidebar that changes the
iframe's width without a page reload) reliably fires a `resize` event inside the
iframe's own `window` in a real browser. Ordinary same-document elements do this
correctly via `ResizeObserver`; iframes are expected to behave the same way, but this
recon did not exercise a real live resize of a real `<iframe>` end-to-end, so it is
listed as a risk to verify in the joining task rather than treated as settled.

---

## Рекомендация по встраиванию

**Фрейм, не инлайн-мердж.** Причины уже не гипотетические, а измеренные: разные
модели адаптива (лендинг — фиксированный холст 1440px без единого правила
масштабирования; борд — целиком масштабируемый юнит с фиксированным соотношением
8:5) и реальная коллизия имён шрифтов (`Manrope`, `Inter`, `Open Sans` — одинаковые
имена, разные файлы и разный `font-display`, см. §5). CSS-переменные не
конфликтуют (§5), но это единственное, что совпадает бесплатно.

**Где в хвосте.** Между `.form-card` и `.footer-card` (или отдельной секцией сразу
после `.footer-card`) — см. §3. Это единственное пустое место в текущей разметке.

**Что нужно передать/согласовать до задачи встраивания:**
1. **Тема.** Хостинг борда на том же origin, что и лендинг, даёт синхронизацию темы
   бесплатно через общий `localStorage["theme"]` (§4) — но живой флип без перезагрузки
   нужно проверить на реальном `<iframe>` и, скорее всего, добавить один `postMessage`
   при клике на переключатель лендинга.
2. **Соотношение фрейма.** `aspect-ratio: 1920/1200` на самом `<iframe>`, `width: 100%`,
   `border: 0` — этого достаточно на всех измеренных ширинах (§7), никакая таблица
   брейкпоинтов не нужна.
3. **Вес.** Лендинг уже тяжелее борда (2.08 МБ против 1.11 МБ, §6) и самый тяжёлый
   участок (фото раздела "О компании", 1.37 МБ) стоит прямо перед точкой вставки —
   фрейм нужно грузить лениво (`loading="lazy"` / `IntersectionObserver`), не сразу.

**Три главных риска, прямо:**
1. Живая синхронизация темы между родителем и `<iframe>` без перезагрузки — не
   проверена на реальном фрейме (§4, §7-caveat).
2. Коллизия имён шрифтов `Manrope`/`Inter`/`Open Sans` — если кто-то в будущем решит
   всё-таки заинлайнить борд вместо фрейма, это сломает типографику одной из двух
   страниц незаметно (§5).
3. У лендинга сегодня в принципе нет отзывчивого поведения (фиксированные 1440px,
   ниже ~1455px реального окна — горизонтальный скролл, §2) — вопрос, в какую именно
   адаптивную модель лендинга встраивать масштабируемый борд, ещё не решён самим
   лендингом, не только задачей встраивания.

---

## Что замечено, но НЕ тронуто

- Три PNG в разделе "О компании" (`06-office-exterior.png`, `07-office-interior.png`,
  `08-agent-photo.png`) не имеют `<picture>`/avif/webp вариантов, в отличие от
  `03-operator-*` и `04-operator-*` в том же файле — почти вся вставленная в `assets/`
  библиотека avif/webp сгенерирована именно для операторских фото, а не для этих
  трёх. Не оптимизировано в рамках этого прогона.
- Лендинг сегодня не реализует адаптив 360-2560, о котором говорит общий метод
  (Закон 7) — `UNKNOWNS.md` и комментарий "Desktop only, canvas 1440 wide" в
  `style.css` подтверждают, что это осознанно текущее, а не законченное состояние.
  Не тронуто.
- Шрифтовые фолбэки лендинга (Poppins→Arial, Noto Sans Arabic→Open Sans) и прочие
  пункты `UNKNOWNS.md` — уже задокументированный, открытый список самого лендинга,
  прочитан для контекста, не тронут.
- Борд лежит внутри репозитория `V:\brain` (Git-суперпроект) с собственной
  незакоммиченной грязью, не связанной с `dash-cold-calls-2` (`reference/…`,
  `dashboard-data.json`, `data.js`, логи синхронизации и т.д.) — не тронуто, не
  относится к этой задаче.
- Локальные HTTP-серверы (`python -m http.server` на портах 8791/8792), запущенные
  только для честного измерения через реальную навигацию браузера (сырой `file://`
  роняет все `<link>`-стили в песочнице этой браузерной панели, см. врезку в шапке
  файла) — фоновые процессы, не файлы проекта; ничего не записано ни в один из
  репозиториев для их запуска.
