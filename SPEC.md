# SPEC.md - measured layer tree
Frame width 1440. Unless noted, X/Y are absolute, relative to the root
frame 05 / Industry panel (top-left = 0,0). Written top to bottom as
measurement proceeds; updated in batches.

## Frame

- Name: 05 / Industry panel, type Frame
- X 0, Y 0, W 1440, H 3096
- Fill: color/bg = #212121, 100%

## Header, y 0-74 (Group 82, Group 83, Group 84, Group 85, Group 86)

### Plashka shapki - Rectangle, child of Group 82, header background plate
- X 0, Y 0, W 1440, H 74
- Fill: color/card = #212121, 100%
- Corner radius: top-left 0, top-right 0, bottom-left 80, bottom-right 80
- Effect: drop shadow present; exact x/y/blur/spread/color not isolated - see UNKNOWNS.md

### Logotip / Temnaya tema - Image, child of Group 82, header logo
- X 106, Y 22, W 143, H 36
- Image fill, shows wordmark GLOBUS / CONTACT CENTER -> asset 01-header-logo.png

### Group 83 - nav pill row
- X 285, Y 24, W 610, H 28, corner radius 10, fill color/card, item gap 42
- 4 pill items left to right, each own group, fill color/card, radius 10
- item 1 (Group 51): X 285 Y 24 W 121 H 28, text verbatim Call-центр, no chevron
- item 2 (Group 52): text verbatim Услуги, has chevron glyph (dropdown)
- item 3 (Group 53): text verbatim О компании, has chevron glyph (dropdown)
- item 4 (Group 54 / Group 55): text verbatim Карьера у нас, no chevron
- item 4 text box: X 16 Y 1 relative to its own 01 Uslugi sub-frame, W 95 H 24
- item 1 text box: X 25 Y 1 relative to its own 01 Uslugi sub-frame, W 72 H 24
- nav text style (checked on items 1 and 4, identical): font Manrope, weight Medium, size 14, line-height 23.2, letter-spacing 0, align left, color color/ink2 = #C9C9CF 100%

### Group 85 - small icon button (right of nav, left of language switch)
- X 1102, Y 21, W 35, H 35
- Fill: linear gradient, stroke weight mixed 2px; exact icon glyph and gradient stops not isolated - see UNKNOWNS.md

### Group 84 - language switch pill (RU | EN)
- X 979, Y 21, W 87, H 35.5, corner radius 999 (pill), fill color/card, item gap 7
- text RU (active, orange accent) and EN (inactive, lighter) - exact per-label colors not isolated, see UNKNOWNS.md

### Group 86 - header CTA button
- X 1166, Y 19, W 180, H 39.03, corner radius 12
- Fill: solid #111111 100% (style name uiverse.io/Cod Gray)
- contains Group 1 > Process action > text node
- text box: X 14.5 Y 11.01 relative to Group 1, W 151 H 17 (hug)
- text verbatim: Заказать Звонокнок (sic - typo in source, kept as-is)
- font: Inter (resolved from variable font family/Font 1), weight SemiBold, size 14, line-height Auto, letter-spacing 0.5, align center
- color #FFFFFF 100%
- text effect: drop shadow X 0 Y 1 blur 2 spread 0 color #000000 80%

## About / Photos section (Group 80), y approx 1490-1931

- Group 80 outer bounds: X 115.13, Y 1490, W 1211.49, H 441.1 (mixed fill/radius - contains children below, no own visible bg)

### Label text (small orange eyebrow)
- X 130, Y 1490, W 186.46, H 14.79
- font Manrope, weight Bold, size 15, line-height 12, letter-spacing 0.45px
- fill: solid #FF4C00 100% (raw hex, not a variable)
- text verbatim: О КОМПАНИИ

### Heading
- X 128, Y 1508, W 411.51, H 40.18 (hug)
- font Manrope, weight ExtraBold, size 27, line-height 31.5, letter-spacing 0
- fill #FFFFFF 100%
- text verbatim: За пультом живые люди

### Paragraph
- X 128, Y 1552, W 1029, H 65
- font Manrope, weight Regular, size 18, line-height 23, letter-spacing 0
- fill: color/about-dim = #98A2B3 100%
- text verbatim (typos and missing space kept as-is):
Свой офис в Ереване, Маршала Бабаджаняна 38. Штатные операторы, одна постоянная команда — не фрилансеры и не подрядчики.Работаем на русском, армянском и английском: Армения, СНГ, Европа, США и Канада, Залив, Китай. Каждый разговор записан — можно прослушать любой. На заявку отвечаем за 4 рабочих часа.

### Photo 1 - office exterior
- X 128.22, Y 1664.41, W 347.91, H 252.41, corner radius 7.5
- Image fill, shows a modern building exterior -> asset 06-office-exterior.png

### Photo 2 - call center interior
- X 547.21, Y 1664.41, W 347.91, H 252.41, corner radius 7.5
- Image fill, shows operator desks with monitors -> asset 07-office-interior.png

### Photo 3 - agent portrait
- X 966.2, Y 1664.41, W 347.91, H 252.41, corner radius 7.5
- Image fill, shows a female agent wearing a headset -> asset 08-agent-photo.png

## Color and type tokens found so far
- color/bg = #212121
- color/card = #212121
- color/ink2 = #C9C9CF
- color/about-dim = #98A2B3
- accent orange (raw hex) = #FF4C00
- button dark (uiverse.io/Cod Gray) = #111111
- white = #FFFFFF
- fonts used so far: Manrope (Medium 14, Bold 15, ExtraBold 27, Regular 18), Inter (SemiBold 14, on the header CTA button only)

## Hero (Konteiner, X 80, Y 196, W 1280, H 441)

### Znak - sub-frame, head + globe graphic
- X 639, Y -44 (relative to Konteiner), W 591, H 370, clip-content off
- Child image "Znak / Temnaya tema": X -67, Y 1 (rel Znak), W 743, H 465 -> asset 02-hero-globe.png

### Eibrov - eyebrow label
- X 28, Y 229 (absolute), W 541, H 20
- font Noto Sans Arabic, weight ExtraBold, size 19, line-height 19.2, letter-spacing 0, fill #FF4C00 100%
- text verbatim: КОНТАКТ-ЦЕНТР ПОЛНОГО ЦИКЛА - ЕРЕВАН, АРМЕНИЯ

### Lid - paragraph, mixed bold spans
- X 28, Y 254, W 541, H 187
- font Manrope, weight/size shown as Mixed (bold spans vs regular), line-height 31, letter-spacing 0, fill Mixed
- text verbatim: www.GlobusContactCenter.com — аутсорсинговый контакт-центр в Ереване. Горячая линия, приём заказов, виртуальный офис, холодные звонки, обзвон базы. Каждый разговор записан, каждая цифра — в вашем личном кабинете. Армения, СНГ, Залив, Европа, США и Канада, Китай.
- Bold spans: "www.GlobusContactCenter.com" and "Армения, СНГ, Залив, Европа, США и Канада, Китай."

### Zagolovok - H1
- X 26, Y -22 (relative to Konteiner), W 542, H 210
- font Open Sans, weight ExtraBold, size shown as Mixed (visually uniform - Figma quirk), line-height 70, letter-spacing -1.68px
- colors: base = color/text (white) for most of the text, #FF4C00 100% for the words звонки and звоним
- text verbatim: Мы принимаем ваши звонки и звоним за вас.

## Operator panels (Group 72, X 130, Y 741, W 1181, H 630, stroke #FF4C00 mixed weight, gap between clusters 77)

### Right cluster - outgoing calls
- Photo "Foto / Iskhodyashchie": X 840, Y 743, W 392, H 262 -> asset 03-operator-outgoing.png
- Badge background: X 759, Y 1002, W 552, H 56, radius 20, fill color/bg = #212121, stroke #FF4C00 mixed weight (top/right/bottom 1px, left 0), effect style sh/svc-pill
- Badge text: X 789, Y 1017, W 493, H 26, font Inter ExtraBold 22, line-height 26, letter-spacing 0, fill color/svc-title = #E8EDF4
- Badge text verbatim: ЗВОНИМ МЫ — ВЫ ПОЛУЧАЕТЕ РЕЗУЛЬТАТ
- List card: X 819, Y 1043, W 433, H 328, radius 8, fill linear-gradient (#212121 0% -> #2F2F2F 100%)
- Card title "СПИСОК УСЛУГ": X 32, Y 53 (rel card), W 163, H 32, style txt/svc-title (size 21, line-height 32), fill color/svc-title
- Card subtitle: X 32, Y 84 (rel card), W 156, H 26, font Inter Regular 14, line-height 26, letter-spacing 0, fill #FF4C00, text verbatim ИСХОДЯЩИЕ ЗВОНКИ ▾
- 4 items, row height 48px starting Y 127 (rel card): X 32, W 336, H 48 each, font Poppins Regular 18, line-height 48, letter-spacing 0, fill color/svc-text = #C3CBD8
- Item texts top to bottom: Продажи по телефону, поиск клиентов, холодные звонки, обзвон клиентов (all-caps in Figma)
- Hairline dividers between rows; exact stroke color not isolated - see UNKNOWNS.md


### Left cluster - incoming calls (mirrored, confirmed symmetric)
- List card: X 190, Y 1043, W 433, H 328 (same size/style as right cluster card)
- Photo "Foto / Vkhodyashchie": X approx 211, Y 743, W 392, H 262 -> asset 04-operator-incoming.png (confirmed by 77px gap geometry)
- Badge background: X approx 130, Y 1002, W 552, H 56 (same style as right cluster)
- Badge text verbatim: КЛИЕНТ ЗВОНИТ ВАМ — ТРУБКУ БЕРЁМ МЫ
- Card title/subtitle verbatim: СПИСОК УСЛУГ / ВХОДЯЩИЕ ЗВОНКИ ▾
- 4 items top to bottom: горячая линия, приём заказов, виртуальный офис, обработка входящих звонков (all-caps in Figma, same style as right cluster)
## Form card ("Kartochka formy", X 115, Y 2080, W 1213, H 448, radius 27, fill color/card, effect style sh/form-card)

- Heading: X 29, Y 24 (rel card), W 437, H 71, Manrope Bold 24, line-height 28.5, letter-spacing 0, fill color/about-text = #C3CBD8
- Heading text verbatim: возьмём ваши звонки на себя
- Subtext (2 lines): X 29, Y 58 (rel card), W 460, H 19 box, Manrope Regular 14, line-height 18, letter-spacing 0, fill color/about-dim = #98A2B3
- Subtext verbatim: расскажите задачу — вернёмся с планом, ценой и датой запуска. Одна страница, без презентаций на сорок слайдов.
- Field grid: 3 rows x 2 columns; labels at Y 134/207/281 (rel card), left column X 41, right column X 635
- Inputs 20px below each label, X 29 (left col) or X 623 (right col), W 548, H 41-42, radius 16.5, fill color/card, effect style sh/form-in
- Row 1 labels verbatim: "имя *" (left), "Email *" (right)
- Row 2 labels verbatim: "телефон *" (left), "страна или регион" (right, no asterisk) - placeholder "выберите страну"
- Row 3 labels verbatim: "какая услуга" (left, no asterisk) - placeholder "выберите услугу"; "язык обзвона" (right, no asterisk) - placeholder "выберите язык"
- Label style: Manrope Regular 12, line-height 12, letter-spacing 0, fill mixed (base color/form-cap + orange asterisk #FF4C00 for required fields)
- Checkbox: X 35, Y 374 (rel card), W 13.5, H 13.5, radius 4.5, fill color/form-chk-bg, effect style sh/form-chk
- Consent text: X 66, Y 375 (rel card), W 371, H 12, Manrope, fill color/form-agree
- Consent text verbatim: Согласен на обработку моих данных — политика конфиденциальности (link part underlined, orange)
- Submit button: X 683, Y 368 (rel card), W 450, H 40, radius 10, fill color/card, stroke #FF4C00 100% weight 0.5 inside, 3 drop shadows (exact params not isolated - see UNKNOWNS.md)
- Submit button label: X 167, Y 12 (rel button), W 115, H 15, Manrope Bold 14, line-height 14.3, letter-spacing 0, fill color/btn-text
- Submit button label verbatim: Заказать звонок

## Footer card ("Kartochka podvala", X 115, Y 2672, W 1213, H 322, radius 27, fill color/card, effect style sh/footer-card)

- Logo image "Logotip": X 30, Y 30, W 117, H 66, opacity 100%, corner radius 0 -> asset 05-footer-logo.png
- Description "Stroka 1": X 30, Y 117, W 238, H 34, Manrope Regular 9.75, line-height 12.8, letter-spacing 0, fill color/form-cap
- Description text verbatim: Контакт-центр полного цикла: принимаем ваши звонки и звоним за вас. Всё видно в вашем личном кабинете, в реальном времени.
- Social icon LinkedIn: X 30, Y 177, W 39, H 39, radius 15, fill color/card, effect style sh/footer-soc, icon color #79839A 100%
- Social icon Telegram: X 77, Y 177, W 38, H 39, radius 15, fill color/card, effect style sh/footer-soc, icon color #79839A 100%
- Column headers, all Y 30, Manrope Bold 12, line-height 12.8, letter-spacing 0, fill color/about-text: "услуги" at X 395, "о работе" at X 666, "контакты" at X 938
- Column item style: Manrope Regular 11, line-height 12.8, letter-spacing 0, fill color/form-cap; rows at Y 65/96/127/158/189 (same X as own header)
- "услуги" items top to bottom: холодные звонки, обзвон клиентов, горячая линия, приём заказов, виртуальный офис
- "о работе" items top to bottom: что входит, кому не подходит, частые вопросы, живой пульт, о компании
- "контакты" items top to bottom: Маршала Бабаджаняна 38, ереван, армения, +374 93 557 144, hello@globuscontactcenter.com, ответ до 4 рабочих часов
- Divider: X 30, Y 243 (rel card), W 1180, H 39 frame containing 2 overlaid lines (color/hair-d base + color/hair-l highlight), effect style sh/footer-hair
- Copyright line: X 30, Y 271 (rel card), W 705, H 31 box, Manrope Regular 11, line-height 12, letter-spacing 0, fill color/form-cap
- Copyright text verbatim (3 links underlined): 2026 MaxMedia LLC • Globus Contact Center • Политика конфиденциальности • Файлы cookie • Пользовательское соглашение
- Note: X 930, Y 271 (rel card), W 229, H 12, Manrope Regular 11, line-height 12, letter-spacing 0, fill color/form-cap
- Note text verbatim: все цены окончательные, налоги включены
## Additional color tokens found (appended after operator panels / form / footer pass)

- #FF4C00 = brand orange accent (also raw hex in several places, not always the same variable)
- #E8EDF4 = color/svc-title
- #C3CBD8 = color/svc-text, color/about-text, color/form-cap is a separate lighter grey token
- #98A2B3 = color/about-dim, color/form-agree base
- #79839A = footer social icon glyph color
- #212121 / #2F2F2F = list card gradient stops
- #111111 = header CTA fill only (uiverse.io/Cod Gray style, distinct from color/card #212121)
- fonts also used: Inter (ExtraBold, Regular, SemiBold), Poppins Regular, Open Sans ExtraBold, Noto Sans Arabic ExtraBold

## Open items - see UNKNOWNS.md

- Header plate drop shadow: X 0, Y 5, blur 6.2, spread 0, color #000000 63% (this one was isolated; kept here for reference)
- Group 85 icon button gradient stops and glyph not isolated
- Group 84 language switch per-label colors not isolated
- Operator panel list dividers exact stroke color not isolated
- Form submit button: 3 stacked drop shadows, exact x/y/blur/spread/color not isolated
- Footer divider exact color/hair-d and color/hair-l hex values not isolated

## Resolved values (follow-up pass) - update to Open items above

- color/form-teal = #00C9B6 100% (used in mixed-fill text runs, exact glyph not identified)
- color/form-cap = #8A93A8 100% (footer/columns caption text color)
- color/form-chk-bg = #2A2A2A 100% (checkbox background)
- color/form-agree = #9AA3AE 100% (consent text base color, link part is #FF4C00)
- color/btn-text = #FFFFFF 100% (submit button label)
- color/hair-d = #000000 60% (divider base line)
- color/hair-l = #FFFFFF 6% (divider highlight line, sits under/over hair-d for a subtle bevel)
- Additional divider found: inside Form card, Group 88 > Linia / Linia-blik, X 29, Y 109-110 (rel card), W 1129, H 1, same hair-d/hair-l pair as footer divider - separates heading area from the field grid
- Still not isolated (kept in UNKNOWNS.md): Group 85 icon gradient stops, Group 84 language switch per-label colors, operator panel list-row divider color, submit button's 3 stacked drop-shadow parameters
