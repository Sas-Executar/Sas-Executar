# Interactions & States · 3PN + Good Path

## Local state model

```text
viewMode: chat | app
threePN.sections[problem|progress|next|outputs].open: boolean
workflow[id].open: boolean
activeWorkflowId: artistic | technical | operational | null
```

## Initial state

```json
{
  "viewMode": "chat",
  "threePN": {
    "problem": true,
    "progress": false,
    "next": false,
    "outputs": false
  },
  "activeWorkflowId": null,
  "workflowOpen": {
    "artistic": false,
    "technical": false,
    "operational": false
  }
}
```

## Event contract

### `MODE_SELECT(mode)`

Input: `chat | app`

Effects:
- selected button gets active styling;
- root toggles app-mode equivalent;
- Chat mode shows Copiloto header/message;
- App mode shows `Hoje` / `WIP 1 · 3PN` header;
- card/workflow state is preserved;
- aria-live announces current view.

### `THREE_PN_SECTION_TOGGLE(section)`

Effects:
- toggles only requested section;
- does not auto-close sibling sections;
- updates `aria-expanded`;
- chevron follows state.

### `WORKFLOW_TOGGLE(id)`

Effects:
- toggles selected workflow body;
- does not start workflow;
- updates `aria-expanded`.

### `WORKFLOW_START(id)`

Effects in exact order:
1. prevent workflow-header toggle caused by CTA click;
2. reset all workflows to idle visual state;
3. set `activeWorkflowId=id`;
4. force selected workflow `open=true`;
5. set selected status to `running`;
6. CTA text => `Workflow iniciado ✓`;
7. right-side state => `Em andamento`;
8. first workflow task marker => active orange;
9. reveal active workflow notice;
10. announce `Workflow iniciado. A tarefa 1 agora é a próxima ação.`

## State table

| Component | State | Required visual | Required behavior |
|---|---|---|---|
| Mode button | inactive | transparent + muted text | selectable |
| Mode button | active | text-color background + inverse text | current view |
| 3PN section | closed | row only | opens on activation |
| 3PN section | open | body visible | closes on activation |
| Good Path | idle closed | neutral border | opens |
| Good Path | idle open | neutral border + tasks | closes or starts |
| Good Path | running | orange border/icon/status | remains open after start |
| CTA | idle | dark/inverse primary | starts workflow |
| CTA | running | orange + white | confirmation label |
| First workflow task | idle | dashed neutral circle | no special state |
| First workflow task | selected workflow running | solid orange circle | represents next action |
| Active notice | hidden | not rendered/displayed | before first start |
| Active notice | visible | orange-soft surface | names selected workflow |

## Copy after workflow start

### Artistic
`Workflow ativo: Cartografia do Intervalo`

### Technical
`Workflow ativo: Authentication Migration`

### Operational
`Workflow ativo: Abertura da Unidade`

Second line is invariant:
`A primeira tarefa foi posicionada como próxima ação do 3PN.`

## Interaction constraints

- CTA click must not collapse the card.
- Starting a second workflow must visually reset the first.
- Opening/closing one Good Path must not change active state.
- Switching Chat/Gestor must not reset open accordions or active workflow.
- There is no drag gesture in the approved pattern.
- There is no long-press behavior.
- There is no hover-only affordance.

## Product integration mapping

The prototype uses local state. In the product:
- opening/closing remains ephemeral UI state;
- `WORKFLOW_START` may become a persisted command;
- UI must use optimistic/pending behavior without altering approved geometry;
- successful mutation must resolve to the same `running` visual state;
- failed mutation must revert to idle and announce the error.
