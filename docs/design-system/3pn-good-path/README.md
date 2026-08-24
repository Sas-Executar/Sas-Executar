# EXECUTAR · 3PN + Good Path Design Handoff

Status: **CANONICAL DESIGN HANDOFF / NO VISUAL DRIFT**

Este diretório descreve, congela e entrega para engenharia o componente **3PN + Good Path Workflows** validado no protótipo interativo da conversa.

## Regra principal

A implementação deve reproduzir o protótipo canônico de `reference/prototype.html` com fidelidade visual e comportamental. Este pacote não autoriza redesign, simplificação visual, troca de nomenclatura ou reinterpretação do fluxo.

## Metodologia usada

O handoff segue os workflows oficiais do repositório `anthropics/knowledge-work-plugins`:

- `design/skills/design-system/SKILL.md`
- `design/skills/design-handoff/SKILL.md`
- referência upstream observada: commit `16d1ab59994b6ab9a9066f063f4264c76eff9dc8`

Aplicação do workflow:

1. Design System: tokens, componentes, variantes, props, estados e acessibilidade.
2. Design Handoff: layout, medidas, responsividade, interações, motion, conteúdo, edge cases e critérios de QA.
3. Referência canônica: HTML/CSS/JS do protótipo aprovado.
4. Contrato de dados: shape mínimo para 3PN, outputs e Good Path.
5. Critérios de aceite: checklist contra drift visual e funcional.

## Arquitetura conceitual

### Card 3PN
Unidade de contexto e execução que mantém juntos:

- **Problema** — por que a unidade existe.
- **Progresso** — o que aconteceu até agora.
- **Próximo passo** — próxima ação verificável.
- **Núcleo** — outputs, evidências e contexto.

### Good Path
Porta de entrada para um workflow reutilizável. Cada Good Path:

- abre/fecha para inspeção;
- mostra as tarefas antes da execução;
- informa quantidade/tipo;
- possui CTA `Iniciar workflow →`;
- ao iniciar, torna-se `Em andamento`;
- posiciona a primeira tarefa como próxima ação do 3PN.

## Variantes canônicas incluídas

- Good Path · Artistic — `Cartografia do Intervalo`
- Good Path · Technical — `Authentication Migration`
- Good Path · Operational — `Abertura da Unidade`

## Navegação do diretório

Leia primeiro `MASTER_INDEX.md` e depois `IMPLEMENTATION_ACCEPTANCE.md` antes de qualquer alteração de código.
