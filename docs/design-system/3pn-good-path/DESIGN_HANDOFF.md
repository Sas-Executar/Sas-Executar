# Handoff Spec · 3PN + Good Path Workflows

## Overview

Feature operacional que combina um card 3PN expansível com três workflows Good Path iniciáveis no mesmo contexto. O padrão existe tanto no Chat do Copiloto quanto no Gestor de Tarefas.

Objetivo: permitir que o usuário entenda **por que**, **onde está**, **o que vem agora** e **qual workflow pode iniciar**, sem perder o contexto da unidade de trabalho.

## Layout

### Desktop

- Canvas full-width com background `exec-bg`.
- Conteúdo central com `max-width: 1040px`.
- Topline: título/descrição à esquerda; segmented Chat/Gestor à direita.
- Stage em duas colunas:
  - principal: `minmax(0, 1.5fr)`;
  - lateral: `minmax(260px, .75fr)`;
  - gap `18px`.
- Experiência principal dentro de `phone-shell` com radius `26px`, border `1px`, padding `12px`.
- Sidebar contém dois painéis empilhados: arquitetura do 3PN e papel do Good Path.

### Mobile <= 760px

- Canvas padding `18px 12px 28px`.
- Topline vira grid vertical.
- Segmented ocupa 100% e os dois botões dividem a largura.
- Stage vira uma coluna.
- Accordion body perde indent de 52px e passa a 16px.
- Good Path header usa `12px` lateral e ícone de `38px`.
- Status textual do workflow (`5 tarefas` / `Em andamento`) fica oculto, mantendo chevron.

## 3PN Card anatomy

1. metadata row: `EXE-214 · SPRINT-001 · Em progresso`;
2. title: `Validar proposta central`;
3. description;
4. progress strip `PROGRESSO [bar] 2/3`;
5. accordion:
   - `01 Problema` — aberto por padrão;
   - `02 Progresso`;
   - `03 Próximo passo`;
   - `↗ Outputs`.

### Accordion line

- min-height: `55px`;
- grid: `28px 1fr auto`;
- gap: `8px`;
- horizontal padding: `16px`;
- summary: `11px`, muted, right aligned, ellipsis if necessary;
- chevron rotates 90° when open.

### Default body state

`Problema` is open. All other 3PN sections are closed.

## Good Path zone

Starts `22px` after the 3PN card.

Header:
- title: `Abrir um Good Path`;
- helper: `Escolha um workflow pronto. Abra para ver tarefas antes de iniciar.`;
- count: `03 WORKFLOWS`.

Then exactly three workflow cards in this order:

1. Artistic — `Cartografia do Intervalo`;
2. Technical — `Authentication Migration`;
3. Operational — `Abertura da Unidade`.

## Good Path card anatomy

### Closed

Header grid:
- icon: `42x42`, radius `13px`;
- body: type, name, subtitle;
- right: status/count + chevron.

### Open

Adds below border-top:
- 5 task rows;
- footer with meta label and CTA.

### Running

When a workflow starts:
- card border becomes orange;
- workflow icon becomes orange with white text;
- status becomes `Em andamento` and orange;
- CTA becomes orange and text changes to `Workflow iniciado ✓`;
- card stays open;
- first task marker becomes solid orange;
- Active Workflow notice appears after the list.

Only one Good Path is active in the prototype state model. Starting another resets the previous one to idle.

## Content specifications

### ThreePN title
Target: 1–2 lines. No forced truncation in current prototype.

### ThreePN description
Target: <= 180 chars. Wrap naturally.

### Section summaries
Single line; overflow uses ellipsis.

### Workflow name
Wrap naturally. Do not truncate on mobile unless required by a future product constraint.

### Workflow task
Multi-line allowed; no ellipsis.

### Outputs
Current prototype includes exactly:
- `3PN-card-spec.md` — `Especificação · v0.1`;
- `card-flow-output.json` — `Output estruturado`.

## States and interactions

| Element | State | Behavior |
|---|---|---|
| ModeSwitcher | Chat | Chat header + Copiloto message visible |
| ModeSwitcher | Gestor | Chat content hidden; task-list header visible |
| 3PN section | closed | tap/click opens independently |
| 3PN section | open | body visible; chevron 90° |
| Good Path | closed | tap header opens |
| Good Path | open | tasks + footer visible |
| Workflow CTA | idle | starts workflow |
| Workflow CTA | running | label changes to completion confirmation |
| New workflow start | another active | previous workflow returns to idle |
| Active notice | hidden | absent before start |
| Active notice | visible | names selected workflow and confirms first task is next action |

## Empty / loading / error behavior

The prototype visual has no remote loading state. Product integration must preserve the same geometry and introduce states without redesign:

### Loading
- Prefer skeleton within existing card geometry.
- Do not replace the whole card with a global spinner.
- CTA disabled while start mutation is in-flight; keep label visible and append minimal progress affordance if needed.

### Empty Good Paths
- Keep `Abrir um Good Path` heading.
- Show one muted message in place of workflow cards.
- Do not hide the entire zone if the feature is available but has no workflows.

### Start error
- Revert workflow to idle.
- Keep card open.
- Show inline error below workflow footer using semantic error token from global system; do not repurpose orange as error.
- Announce error with `aria-live`.

### Missing output
- Omit the missing OutputRow; do not render `undefined`, empty filenames or placeholder links.

## Edge cases

- 0 outputs: section remains valid and should show a short empty-state body.
- >2 outputs: rows stack vertically; no horizontal carousel.
- >5 workflow tasks: maintain vertical list; count updates from data.
- Very long workflow name: wrap; preserve icon and chevron columns.
- International strings: allow approximately 30–40% expansion before considering truncation.
- Offline/PWA: previously loaded workflows remain inspectable; starting a workflow must respect the product's existing offline mutation strategy.

## Accessibility

- All interactive headers are native `button` elements.
- `aria-expanded` reflects accordion/workflow open state.
- `aria-live="polite"` announces mode switch and workflow start status.
- Focus outline is 3px `exec-orange-soft`, offset 2px.
- Keyboard activation uses native Enter/Space.
- No interaction depends on hover.
- Order in DOM matches visual reading order.

## Motion

- 3PN chevron: 180ms ease rotation.
- Workflow chevron: 180ms ease rotation.
- Workflow border-color: 200ms ease.
- Respect reduced motion by disabling chevron transition.
- No continuous animation.

## Why this structure

The card keeps state inspection local; Good Paths turn reusable operational knowledge into an explicit execution start. The same component survives Chat and Task Manager contexts, avoiding two mental models for the same work object.
