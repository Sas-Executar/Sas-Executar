# Agent Handoff · Implementar 3PN + Good Path sem drift

## Mission

Implementar no app EXECUTAR o padrão visual/interativo aprovado em `docs/design-system/3pn-good-path/`, preservando 100% da experiência de `reference/prototype.html`.

## Before coding

Read, in this order:

1. repository root `AGENTS.md`;
2. `docs/design-system/3pn-good-path/README.md`;
3. `MASTER_INDEX.md`;
4. `reference/prototype.html`;
5. `TOKENS.md`;
6. `DESIGN_SYSTEM.md`;
7. `DESIGN_HANDOFF.md`;
8. `INTERACTIONS_STATES.md`;
9. `RESPONSIVE_ACCESSIBILITY.md`;
10. `DATA_CONTRACT.md`;
11. `IMPLEMENTATION_ACCEPTANCE.md`;
12. `VISUAL_REGRESSION_CHECKLIST.md`.

Before altering app code, also obey all mandatory repository onboarding references listed by root `AGENTS.md`.

## Implementation objective

Create reusable production components for:

- 3PN card;
- 3PN accordion section;
- Outputs row;
- Good Path workflow card;
- workflow task row;
- workflow CTA;
- active workflow notice;
- Chat/Gestor context switch.

The components must be data-driven according to `DATA_CONTRACT.md`.

## Non-goals

Do not:
- redesign;
- rename 3PN concepts;
- replace accordions with tabs;
- move Good Paths to another page;
- replace exact approved tokens silently;
- add animations, gradients, shadows or decorative icons;
- start workflows on card-open;
- alter existing auth/tenant/infrastructure architecture;
- remove or bypass existing PWA/offline constraints.

## Integration behavior

### Chat
The component is rendered as an operational response/object inside Copiloto context, with Chat header/message framing.

### Task Manager
The same 3PN + Good Path component is rendered under the Task Manager framing. Component state and product identity remain the same.

### Workflow start
Production implementation may persist a workflow instance, but the UI resolution must exactly match:

- selected workflow stays open;
- selected workflow gets orange running visual;
- CTA => `Workflow iniciado ✓`;
- state label => `Em andamento`;
- first task is highlighted as next action;
- previous running card resets in this selector pattern;
- success is announced.

## Suggested component boundary

```text
ThreePNGoodPathExperience
├── ModeSwitcher
├── ContextHeader
├── ThreePNCard
│   ├── ThreePNSection
│   └── OutputRow
├── GoodPathZone
│   └── GoodPathWorkflowCard[]
│       ├── WorkflowTaskRow[]
│       └── WorkflowCTA
└── ActiveWorkflowNotice
```

This is a suggested code boundary, not authorization to change DOM/visual composition.

## Test requirements

Minimum:
- component/state tests for all events in `INTERACTIONS_STATES.md`;
- keyboard/ARIA checks;
- mobile 320/390 and desktop regression captures;
- workflow start success/failure test;
- state preservation across Chat/Gestor switch;
- visual comparison against `reference/prototype.html`.

## Done definition

Do not mark done until every gate in `IMPLEMENTATION_ACCEPTANCE.md` passes.

If a technical constraint conflicts with the reference, stop that specific deviation and document it. Do not silently approximate the design.
