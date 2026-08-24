# Visual Regression Checklist · 3PN + Good Path

Use este arquivo lado a lado com `reference/prototype.html`.

## Capture matrix

Capture cada cenário em light e dark quando o produto suportar os dois temas.

| ID | Width | Mode | 3PN | Good Path | Active workflow |
|---|---:|---|---|---|---|
| V01 | 1280+ | Chat | Problem open | all closed | none |
| V02 | 1280+ | Chat | Progress open | Artistic open | none |
| V03 | 1280+ | Chat | default | Technical open | Technical |
| V04 | 1280+ | Gestor | preserve prior state | Technical open | Technical |
| V05 | 768 | Chat | default | Operational open | none |
| V06 | 390 | Chat | default | Artistic open | Artistic |
| V07 | 320 | Gestor | Outputs open | Operational open | Operational |

## Pixel-level review zones

### Canvas
- [ ] Background matches exact theme token.
- [ ] No unexpected outer card/surface.
- [ ] Max width does not exceed 1040px.

### Topline
- [ ] Eyebrow is orange, uppercase, monospace, `.12em` tracking.
- [ ] Page title uses approved clamp and negative tracking.
- [ ] Segmented control uses neutral panel-2 surface.
- [ ] Active mode button uses text color as background and inverse text.

### Primary shell
- [ ] Border is 1px line token.
- [ ] Radius 26px.
- [ ] Padding 12px.

### 3PN
- [ ] Radius 20px.
- [ ] No shadow.
- [ ] Metadata font and spacing match reference.
- [ ] Orange status pill uses soft surface.
- [ ] Title is 21px with `-.025em` tracking.
- [ ] Progress bar is 6px high and uses orange fill.
- [ ] Section row min-height is 55px.
- [ ] Summary aligns right and truncates instead of pushing layout.
- [ ] Open chevron is rotated exactly 90°.
- [ ] Problem body has 3px orange left rule.

### Good Path zone
- [ ] Starts 22px after 3PN.
- [ ] Zone title/copy/count hierarchy matches.
- [ ] Cards have 10px vertical gap.
- [ ] Card radius 18px.
- [ ] Header uses icon/body/status structure.
- [ ] Workflow icon is neutral when idle.
- [ ] Task rows use 26px marker column.
- [ ] Idle markers are dashed circles.
- [ ] Footer places meta and CTA on opposite sides, wrapping when necessary.

### Running workflow
- [ ] Border orange.
- [ ] Icon background orange, text white.
- [ ] Right status `Em andamento`, orange.
- [ ] CTA orange, white label `Workflow iniciado ✓`.
- [ ] First task marker filled orange.
- [ ] Active notice visible below workflow list.

### Side panels
- [ ] Two panels on desktop.
- [ ] Panel radius 18px.
- [ ] 3PN architecture panel shows P/P/P/N rows.
- [ ] Third P badge is orange; others use text/inverse styling.
- [ ] Good Path explanation copy remains visually secondary.

## Mobile-specific review

- [ ] Topline stacks.
- [ ] Segmented is full width.
- [ ] Stage is one column.
- [ ] Sidebar follows main content.
- [ ] 3PN body is not indented 52px.
- [ ] Workflow icon is 38px.
- [ ] `5 tarefas` / `Em andamento` right-side text is hidden.
- [ ] Chevron remains visible.
- [ ] No clipping at 320px.
- [ ] CTA remains tappable and visible.

## Interaction snapshots

Record or screenshot before/after:

1. open 3PN Progress;
2. open Artistic Good Path;
3. click Artistic CTA;
4. open Technical Good Path without starting;
5. start Technical and verify Artistic resets;
6. switch to Gestor and verify Technical remains running;
7. switch back to Chat and verify state remains.

## Allowed variance

Only rendering differences caused by platform font rasterization/antialiasing are acceptable without design review.

Not allowed:
- spacing drift;
- different font sizes/weights;
- different colors;
- missing borders;
- different card order;
- different state labels;
- altered task copy;
- altered interaction sequence;
- added shadows/gradients/icons/animations.

## Sign-off template

```text
Visual fidelity: PASS / FAIL
Interaction fidelity: PASS / FAIL
Responsive fidelity: PASS / FAIL
Accessibility fidelity: PASS / FAIL
Reviewed reference: reference/prototype.html
Unapproved differences: none / [list]
Reviewer:
Date:
```
