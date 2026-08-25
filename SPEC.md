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

## Not yet measured (to be appended)
- Hero heading + subtext + head-with-globe watermark image
- Two operator panels: photos + call boxes + service list cards (Group 84/85 nested groups)
- Lead-capture form card (Karta formy)
- Footer (Karta podvala)
- text verbatim (typos and missing space kept as-is):
Свой офис в Ереване, Маршала Бабаджаняна 38. Штатные операторы, одна постоянная команда 
