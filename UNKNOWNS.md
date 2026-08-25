# UNKNOWNS.md - values that could not be read directly from Figma

Everything below was either not selectable without risking an accidental
edit to the live Figma file, or Figma only exposed a composite/mixed value
instead of a single number. Nothing here was guessed or invented; these are
left as open items on purpose.

## Header

- Group 85 (small round icon button, right of nav pill): the fill reads as
  "linear gradient" and the stroke reads as "mixed, 2px" in the Design
  panel, but the exact gradient color stops and the glyph/icon inside were
  not isolated.
- Group 84 (RU | EN language switch): confirmed RU is the active/highlighted
  label and EN is inactive, and the pill uses color/card as its background,
  but the exact per-label text colors were not isolated as separate hex
  values.

## Operator panels

- The hairline divider between the 4 rows inside each service-list card:
  present visually, effect/stroke not isolated to an exact color value.
- Both badge pills use effect style "sh/svc-pill" and both list cards use
  effect style referenced in SPEC.md, but the underlying shadow x/y/blur/
  spread/color numbers for these named styles were not expanded.

## Form card

- Submit button ("01 Uslugi" component) has 3 stacked drop-shadow effects.
  Only the stroke (#FF4C00, 0.5px, inside) and fill (color/card) were read;
  the exact x/y/blur/spread/color of each of the 3 shadows was not expanded
  one by one.

## General

- Effect style names (e.g. sh/form-card, sh/form-in, sh/footer-card,
  sh/footer-soc, sh/svc-pill) were seen attached to several layers but their
  underlying blur/spread/color values were not opened and read individually
  for every single usage - only the header plate's drop shadow was fully
  expanded (X 0, Y 5, blur 6.2, spread 0, color #000000 63%, recorded in
  SPEC.md).
- Fonts are resolved from Figma variables (e.g. "font family/Font 1")
  wherever that literal string appeared; the resolved font name is recorded
  in SPEC.md next to each instance, not left as a variable name.

## Not an unknown, but worth flagging

- The header CTA button text reads "Заказать Звонокнок" in the source file
  (typo, extra "нок" at the end) while the form's submit button correctly
  reads "Заказать звонок". Both were copied verbatim into index.html exactly
  as they appear in Figma, per instructions to never fix typos.
- The About section paragraph has a missing space in the source text
  ("подрядчики.Работаем") which was also kept verbatim.
