# Responsive + Accessibility · 3PN + Good Path

## Breakpoints

O protótipo aprovado possui um breakpoint explícito em `760px`.

### > 760px
- Stage em 2 colunas.
- Main experience à esquerda.
- Side panels à direita.
- 3PN section body indent: `52px`.
- Workflow header padding horizontal: `16px`.
- Workflow icon: `42px`.
- Workflow count/status é visível.

### <= 760px
- Canvas: `18px 12px 28px`.
- Topline empilha conteúdo.
- Segmented ocupa 100%.
- Stage vira 1 coluna.
- Section summary max-width: `105px`.
- 3PN body indent: `16px`.
- Workflow header: `grid-template-columns: 40px 1fr auto`.
- Workflow header horizontal padding: `12px`.
- Workflow icon: `38px`.
- Workflow `wf-status` é oculto; chevron continua visível.
- Workflow body horizontal padding: `12px`.

## Minimum supported width

Alvo funcional: `320px` CSS width sem clipping horizontal do documento.

Regras:
- permitir wrap de títulos e subtitles;
- não fixar largura do card;
- todas as colunas de conteúdo devem usar `min-width: 0` quando necessário;
- summary do accordion pode truncar; conteúdo expandido não;
- CTA/footer pode wrap no mobile.

## Touch targets

- Mode buttons: min-height `40px` no protótipo; na integração de produto, o container deve fornecer área tocável equivalente a ~44px sem alterar a aparência visível.
- Section toggles: min-height `55px`.
- Workflow headers: padding suficiente para área de toque confortável.
- CTA: min-height `44px`.

## Semantic structure

Recommended DOM:

```text
main/section wrapper
  header/topline
  section stage
    section primary experience
      header chat OR task-list header
      article ThreePNCard
        button section toggles
      section GoodPathZone
        article workflow
          button workflow header
          list/task rows
          button CTA
      status aria-live
    aside explanation panels
```

## Keyboard

### Mode switcher
- Tab enters first/next button.
- Enter/Space selects.
- Do not intercept arrow keys unless the component is formally converted to tabs/radiogroup.

### 3PN sections
- Native button.
- Enter/Space toggles.
- No automatic focus movement when content opens.

### Good Path header
- Native button.
- Enter/Space toggles.
- CTA remains separately tabbable when body is open.

### Start CTA
- Enter/Space activates.
- After success, focus remains on CTA.
- Screen reader receives status announcement via polite live region.

## ARIA

### 3PN section toggle
- `aria-expanded={open}`.
- Optional `aria-controls` pointing to stable content id.

### Workflow header
- `aria-expanded={open}`.
- Optional `aria-controls` pointing to workflow body id.

### Progress
- Prefer semantic progressbar in product implementation:
  - `role="progressbar"`
  - `aria-valuemin="0"`
  - `aria-valuemax="3"`
  - `aria-valuenow="2"`
  - `aria-label="Progresso da tarefa"`

### Live status
- `aria-live="polite"`.
- Announce mode switch, workflow started, start errors.

## Focus styling

Canonical visual:

```css
outline: 3px solid var(--exec-orange-soft);
outline-offset: 2px;
```

Do not remove browser focus unless this replacement is applied.

## Color / contrast

- Primary text always uses `exec-text` on `exec-bg`, `exec-panel`, `exec-card` or `exec-panel-2`.
- Muted copy uses `exec-muted`; validate WCAG contrast in final integrated surfaces because global theme composition may differ.
- Orange is interaction/status emphasis, not the sole carrier of meaning. Running state also changes text (`Em andamento`) and CTA label.
- Error state must use semantic error treatment from the global system, not orange alone.

## Reduced motion

When `prefers-reduced-motion: reduce`:
- remove chevron transition;
- avoid any new animated progress sweep;
- state changes remain immediate and fully understandable.

## Screen reader copy

Recommended announcements:
- Chat selected: `Visualização: Chat.`
- Gestor selected: `Visualização: Gestor de Tarefas.`
- Workflow success: `Workflow iniciado. A tarefa 1 agora é a próxima ação.`
- Start failure: `Não foi possível iniciar o workflow. Tente novamente.`

## Accessibility acceptance

PASS requires:
- all controls reachable by Tab;
- all controls activatable without pointer;
- open/closed state exposed;
- no focus loss after workflow start;
- no hover-only action;
- visible focus on all buttons;
- mobile layout remains usable at 320px;
- reduced motion respected.
