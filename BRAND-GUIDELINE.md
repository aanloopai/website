# Aanloop AI — Brand Identity Kit

> **Concept:** Connected-band wordmark with premium B2B tone. The four-color accent stripe represents the four pillars of an AI workflow: *capture → reason → act → learn*. The Dutch word **aanloop** means "runway" or "takeoff," reinforcing the company's positioning around momentum and acceleration.

---

## 1. Logo files

| File | Format | Use case |
|---|---|---|
| `logo-horizontal-light.svg` | Vector | Website header (light bg), email signature, business card, light-mode UI |
| `logo-horizontal-dark.svg` | Vector | Dark-mode UI, dark deck slides, dark-themed marketing |
| `logo-mark-light.svg` | Vector | Square avatar (light), supporting brand element |
| `logo-mark-dark.svg` | Vector | App icon, dark social avatar, watermark on dark imagery |
| `app-icon-light.svg` | Vector | iOS / Android / desktop app icon (rounded square) |
| `logo-horizontal-light-2048.png` | Raster | Print, presentations, retina web |
| `logo-horizontal-light-1024.png` | Raster | Standard web, social posts |
| `logo-mark-light-1024.png` | Raster | Square crop avatar (light) |
| `logo-mark-dark-1024.png` | Raster | Square crop avatar (dark) |
| `favicon-32.png` | Raster | Browser tab |
| `favicon-16.png` | Raster | Compact browser tab |
| `favicon-180-apple-touch.png` | Raster | iOS home screen, Safari pin |

**Always prefer SVG** when the medium supports it (web, modern email clients, deck tools). PNG only when SVG isn't supported (some legacy print software, social media uploads).

---

## 2. Color palette

| Role | Name | HEX | RGB | CMYK (approx) |
|---|---|---|---|---|
| Primary text (light bg) | Navy | `#0F172A` | 15 / 23 / 42 | 88 / 79 / 47 / 80 |
| Primary text (dark bg) | Pearl | `#F1F5F9` | 241 / 245 / 249 | 4 / 2 / 0 / 2 |
| Brand accent 1 | Indigo | `#4338CA` | 67 / 56 / 202 | 81 / 84 / 0 / 7 |
| Brand accent 2 | Rose | `#E11D48` | 225 / 29 / 72 | 0 / 87 / 65 / 12 |
| Brand accent 3 | Amber | `#D97706` | 217 / 119 / 6 | 0 / 47 / 100 / 15 |
| Brand accent 4 | Emerald | `#047857` | 4 / 120 / 87 | 88 / 0 / 50 / 25 |
| Dark canvas | Midnight | `#0B1120` | 11 / 17 / 32 | 91 / 84 / 47 / 81 |

**Accent color order is fixed:** Indigo → Rose → Amber → Emerald (left-to-right). Never reorder. The sequence builds visual rhythm across applications.

CMYK values are approximations. For high-end print runs, request a designer to match against a specific CMYK profile (Fogra39 for European coated stock).

---

## 3. Typography

- **Primary typeface:** Inter, weight 700 (Bold) for the wordmark
- **Source:** [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) (open source, SIL Open Font License)
- **Fallback stack:** `Inter, 'Helvetica Neue', Arial, sans-serif`
- **Letter-spacing:** −4.5 (tight tracking for wordmark only; do not apply to body copy)

For brand body copy and UI: Inter Regular (400) and Medium (500). The wordmark is the only place that uses 700.

---

## 4. Clear space (exclusion zone)

The logo must always have a minimum clear space around it equal to the height of the lowercase "a" in the wordmark. No other element — text, image, edge — may enter this zone.

For the square mark, clear space = 1/8 of the mark's total width on every side.

---

## 5. Minimum sizes

| Asset | Digital (px width) | Print (mm width) |
|---|---|---|
| Horizontal logo | 120 px | 25 mm |
| Square mark | 24 px | 8 mm |
| Favicon | 16 px | n/a |

Below these sizes, the accent stripe becomes illegible. For very small applications, use the favicon or the mark without the stripe.

---

## 6. Do's & Don'ts

### ✓ Do

- Pair the **light** version with light backgrounds (#FFFFFF to #F1F5F9 range) and the **dark** version with dark backgrounds (#0B1120 to #1E293B range)
- Maintain the original aspect ratio when scaling
- Place the logo with at least the minimum clear space around it
- Use the SVG version on the web for crisp rendering at all densities
- Use the square mark for any 1:1 placement (avatars, app icons, social profile pictures)

### ✗ Don't

- Don't recolor the wordmark or the accent stripes — the four colors are fixed
- Don't reorder the accent colors (always: Indigo, Rose, Amber, Emerald, left-to-right)
- Don't stretch, skew, rotate, or distort the logo
- Don't add drop shadows, glows, outlines, or any effects
- Don't place the logo on busy photographic backgrounds without first applying a solid color overlay or card
- Don't substitute a different font, even one that looks similar
- Don't separate the wordmark from its accent stripe in primary applications (the stripe may stand alone only as a secondary brand element, e.g., page divider)
- Don't use the logo on backgrounds where contrast with the wordmark is below 4.5:1 (WCAG AA)

---

## 7. CSS quick reference

For web implementation:

```css
:root {
  /* Brand colors */
  --brand-navy: #0F172A;
  --brand-pearl: #F1F5F9;
  --brand-indigo: #4338CA;
  --brand-rose: #E11D48;
  --brand-amber: #D97706;
  --brand-emerald: #047857;
  --brand-midnight: #0B1120;
}

/* Wordmark style for HTML logo (alternative to SVG) */
.aanloop-wordmark {
  font-family: Inter, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 700;
  letter-spacing: -0.0375em;
  color: var(--brand-navy);
}
```

---

## 8. Trademark & ownership

This brand identity is the property of Aanloop AI. The Inter typeface is licensed under the SIL Open Font License and may be embedded freely. The logo, color combination, and typographic treatment are the original creative work of Aanloop AI; the wordmark is intentionally distinct from existing trademarks.

---

*Generated April 2026. For updates or additional asset formats, regenerate from the master SVG files.*
