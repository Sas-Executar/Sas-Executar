# MASTER INDEX · 3PN + Good Path

## 00 · Entrada
- `README.md` — objetivo, escopo e regra de fidelidade.
- `MASTER_INDEX.md` — mapa do handoff.

## 01 · Design System
- `DESIGN_SYSTEM.md` — componentes, variantes, props e composição.
- `TOKENS.md` — cores, tipografia, spacing, radius, borders e motion.

## 02 · Handoff de Engenharia
- `DESIGN_HANDOFF.md` — especificação completa de layout e comportamento.
- `INTERACTIONS_STATES.md` — estados, eventos e transições.
- `RESPONSIVE_ACCESSIBILITY.md` — breakpoints, teclado, ARIA e foco.

## 03 · Dados
- `DATA_CONTRACT.md` — contrato de dados para 3PN, outputs e workflows.
- `reference/content.json` — conteúdo canônico do protótipo.

## 04 · Implementação / QA
- `IMPLEMENTATION_ACCEPTANCE.md` — gates para considerar a implementação equivalente.
- `VISUAL_REGRESSION_CHECKLIST.md` — checklist 1:1.
- `AGENT_HANDOFF.md` — instruções para o próximo agente/engenheiro.

## 05 · Fonte de verdade visual
- `reference/prototype.html` — referência visual/interativa canônica.

## Ordem de leitura recomendada

1. `README.md`
2. `reference/prototype.html`
3. `TOKENS.md`
4. `DESIGN_SYSTEM.md`
5. `DESIGN_HANDOFF.md`
6. `INTERACTIONS_STATES.md`
7. `RESPONSIVE_ACCESSIBILITY.md`
8. `DATA_CONTRACT.md`
9. `IMPLEMENTATION_ACCEPTANCE.md`
10. `VISUAL_REGRESSION_CHECKLIST.md`
11. `AGENT_HANDOFF.md`

## Regra de precedência

Em caso de divergência:

1. comportamento aprovado no protótipo;
2. `reference/prototype.html`;
3. valores de `TOKENS.md`;
4. documentação textual deste diretório;
5. convenções genéricas do código existente.

Nenhuma convenção técnica deve alterar a aparência ou o modelo mental aprovado sem revisão explícita de Design.
