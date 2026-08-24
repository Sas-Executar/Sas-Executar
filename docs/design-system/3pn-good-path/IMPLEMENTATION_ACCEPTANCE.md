# Implementation Acceptance · 3PN + Good Path

A feature só pode ser considerada equivalente ao protótipo quando todos os gates abaixo passarem.

## Gate A · Structure

- [ ] Existe um único `ThreePNCard` principal.
- [ ] Ordem: Problema → Progresso → Próximo passo → Outputs.
- [ ] Problema inicia aberto.
- [ ] Existe a seção `Abrir um Good Path` abaixo do 3PN.
- [ ] Ordem dos workflows: Artistic → Technical → Operational.
- [ ] Cada workflow contém exatamente as tarefas fornecidas pelo payload.
- [ ] Cada workflow possui CTA de início dentro do corpo expandido.

## Gate B · Visual fidelity

- [ ] Colors match `TOKENS.md` exactly.
- [ ] Main max-width = 1040px.
- [ ] Desktop stage = `1.5fr / .75fr`, gap 18px.
- [ ] Shell radius = 26px.
- [ ] 3PN radius = 20px.
- [ ] Good Path radius = 18px.
- [ ] Orange accent = `#ff5a16`.
- [ ] Status, line, panel and dark/light surfaces match exact tokens.
- [ ] Typography hierarchy and letter spacing match reference.
- [ ] No shadow, gradient, glow or new decorative treatment is introduced.

## Gate C · Interaction fidelity

- [ ] Chat/Gestor switch changes only context header, not card state.
- [ ] 3PN sections toggle independently.
- [ ] Good Path header opens/closes tasks without starting workflow.
- [ ] CTA does not collapse workflow.
- [ ] Starting a workflow forces it open.
- [ ] Starting one workflow resets previous running workflow.
- [ ] Running workflow gets orange border/icon/status/CTA.
- [ ] First task marker becomes active orange.
- [ ] Active notice appears with correct workflow name.
- [ ] `aria-live` announces start success.

## Gate D · Responsive fidelity

- [ ] At <=760px, stage becomes one column.
- [ ] Segmented control becomes full width.
- [ ] Workflow status text is hidden, chevron retained.
- [ ] 3PN body indent changes to 16px.
- [ ] Workflow icon becomes 38px.
- [ ] No document-level horizontal scroll at 320px.

## Gate E · Accessibility

- [ ] All interactive rows are native buttons or equivalent accessible controls.
- [ ] `aria-expanded` is correct.
- [ ] Keyboard Enter/Space works.
- [ ] Focus remains visible.
- [ ] No hover-only action.
- [ ] Reduced-motion preference is respected.
- [ ] Workflow start retains focus on initiating CTA.

## Gate F · Product integration

- [ ] Component receives structured data; content is not hardcoded inside behavior logic.
- [ ] UI-only state remains local/ephemeral.
- [ ] Workflow start can call product mutation without changing approved UI geometry.
- [ ] Pending state prevents duplicate start.
- [ ] Failure reverts running visual state and announces error.
- [ ] Agent-triggered state changes follow existing authorization/audit rules of the repository.
- [ ] Existing PWA/offline behavior is not regressed.

## Gate G · Evidence

Required before merge:

1. Desktop screenshot: Chat mode, no workflow active.
2. Desktop screenshot: one Good Path open.
3. Desktop screenshot: workflow running.
4. Desktop screenshot: Gestor mode preserving state.
5. Mobile screenshot <=390px.
6. Mobile screenshot <=320px or narrowest supported harness.
7. Keyboard navigation recording/checklist.
8. Reduced-motion verification.
9. Visual diff against `reference/prototype.html`.

## Pass / fail rule

- **PASSOU**: Gates A–G complete with no unapproved visual/interaction deviation.
- **NÃO PASSOU**: any structural, visual, state, responsive or accessibility mismatch remains.

## Forbidden substitutions

The following are explicitly not equivalent without Design approval:

- tabs instead of accordion rows;
- modal-only outputs;
- separate page for Good Paths;
- only one workflow visible at a time via carousel;
- blue/purple accent replacing orange;
- card shadows added for depth;
- different rounded-corner system;
- moving Good Paths above the 3PN;
- auto-starting workflow when header opens;
- multiple workflows simultaneously marked running in this pattern;
- resetting state when Chat/Gestor toggles.
