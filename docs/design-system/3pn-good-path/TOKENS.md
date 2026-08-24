# Tokens · 3PN + Good Path

Estes tokens são extraídos do protótipo aprovado e devem ser tratados como fonte de verdade desta feature.

## Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `exec-bg` | `#f3f0e8` | `#11110f` | canvas |
| `exec-panel` | `#fbfaf6` | `#1a1a18` | phone shell, side panels |
| `exec-panel-2` | `#eeeae0` | `#22221f` | segmented control, muted surfaces, workflow icon |
| `exec-text` | `#11110f` | `#f6f3eb` | primary text / inverse controls |
| `exec-muted` | `#716f68` | `#aaa79f` | secondary text |
| `exec-line` | `#d7d2c7` | `#34342f` | borders/dividers |
| `exec-orange` | `#ff5a16` | `#ff5a16` | accent, running workflow, CTA active, eyebrow |
| `exec-orange-soft` | `#ffe0d2` | `#512315` | focus ring, status surface, active notice |
| `exec-green` | `#27a56f` | `#27a56f` | completed state when used |
| `exec-card` | `#fffefa` | `#151513` | 3PN and Good Path card surface |
| `exec-inner-card` | `#ffffff` | `#161614` | file icon inner surface |

## Typography

Base stack:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Monospace stack:

```css
ui-monospace, SFMono-Regular, Menlo, monospace
```

| Token | Value | Usage |
|---|---|---|
| `font-page-title` | `clamp(22px,4vw,34px) / 1.03 / 900-ish visual` | page title |
| `font-card-title` | `21px / 1.13` | 3PN title |
| `font-workflow-title` | `16px / normal / 900` | workflow name |
| `font-body` | `13px / 1.42–1.50` | descriptions/content |
| `font-secondary` | `11px` | summaries/meta/subtitles |
| `font-meta` | `10px monospace / 700–800` | IDs, counts, statuses |
| `font-eyebrow` | `11px monospace / 700 / letter-spacing .12em` | top eyebrow |

Letter spacing:
- Page title: `-0.035em`
- Card title: `-0.025em`
- Workflow title: `-0.015em`
- Meta: `0.04em`
- Workflow type: `0.11em`
- Eyebrow: `0.12em`

## Spacing

| Token | Exact value | Usage |
|---|---:|---|
| `space-app-x` | `18px` desktop / `12px` mobile | canvas horizontal padding |
| `space-app-top` | `22px` desktop / `18px` mobile | canvas top |
| `space-app-bottom` | `38px` desktop / `28px` mobile | canvas bottom |
| `space-stage-gap` | `18px` | main ↔ sidebar |
| `space-shell` | `12px` | phone shell padding |
| `space-card-x` | `17px` | 3PN header/progress horizontal |
| `space-card-top` | `17px` | 3PN header top |
| `space-section-x` | `16px` | accordion row |
| `space-section-body-left` | `52px` desktop / `16px` mobile | body indent |
| `space-workflow-x` | `16px` desktop / `12px` mobile | workflow header/body |
| `space-workflow-gap` | `10px` | between Good Path cards |
| `space-zone-top` | `22px` | 3PN → Good Path zone |

## Radius

| Token | Value | Usage |
|---|---:|---|
| `radius-shell` | `26px` | phone shell |
| `radius-card` | `20px` | 3PN card |
| `radius-workflow` | `18px` | Good Path card |
| `radius-side` | `18px` | explanatory panels |
| `radius-segmented` | `14px` | segmented background |
| `radius-segment-button` | `10px` | Chat/Gestor button |
| `radius-workflow-icon` | `13px` | ART/TEC/OPS icon |
| `radius-cta` | `12px` | workflow CTA |
| `radius-output` | `11px` | output row |
| `radius-pill` | `999px` | status/pills/bar |

## Borders

- Standard: `1px solid var(--line)`.
- Workflow running: same width, color switches to `exec-orange`.
- Task marker: `1.5px dashed #aaa` when idle.
- First task running: solid `exec-orange`, filled orange.
- Problem emphasis: `3px solid exec-orange` on left.

## Layout

- Max content width: `1040px`.
- Desktop stage: `grid-template-columns: minmax(0,1.5fr) minmax(260px,.75fr)`.
- Gap: `18px`.
- Mobile breakpoint: `760px`.
- Mobile stage: one column.

## Motion

| Token | Value | Usage |
|---|---|---|
| `motion-fast` | `180ms` | chevrons |
| `motion-standard` | `200ms` | workflow border-color |
| `easing-default` | `ease` | current prototype |

Respect `prefers-reduced-motion: reduce`: remove chevron transition.

## Focus

Focusable interactive elements use:

```css
outline: 3px solid exec-orange-soft;
outline-offset: 2px;
```

Applies to mode buttons, accordion toggles, Good Path headers and workflow CTAs.

## Token governance

1. Durante a primeira implementação, os valores acima são canônicos.
2. Se o design system global já possuir token semanticamente equivalente e numericamente idêntico, alias é permitido.
3. Se o token global tiver valor diferente, não substituir silenciosamente.
4. Qualquer normalização futura deve passar por captura comparativa e aprovação visual.
