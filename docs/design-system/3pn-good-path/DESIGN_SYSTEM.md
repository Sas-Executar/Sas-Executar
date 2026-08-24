# Design System · 3PN + Good Path

## Description

O padrão combina um **Card 3PN** de contexto operacional com **Good Path Workflow Cards** acionáveis. O mesmo padrão aparece em dois contextos: Chat do Copiloto e Gestor de Tarefas.

A composição aprovada é única. Mudanças de layout, nomes, hierarquia visual, cores, radius, CTA ou comportamento exigem revisão de Design.

## Component inventory

| Component | Purpose | Variants |
|---|---|---|
| `ModeSwitcher` | Alternar o enquadramento Chat/Gestor | `chat`, `app` |
| `ChatContextHeader` | Identificar Copiloto e contexto | padrão |
| `TaskListHeader` | Cabeçalho do Gestor | padrão |
| `ThreePNCard` | Unidade de contexto e execução | `in-progress` |
| `ThreePNSection` | Linha expansível do 3PN | `problem`, `progress`, `next`, `outputs` |
| `StatusPill` | Estado do card | `in-progress` |
| `ProgressBar` | Progresso 2/3 | determinístico |
| `OutputRow` | Artefato/saída ligada ao card | `spec`, `structured` |
| `GoodPathZone` | Grupo de workflows disponíveis | padrão |
| `GoodPathWorkflowCard` | Entrada reutilizável de workflow | `artistic`, `technical`, `operational` |
| `WorkflowTaskRow` | Etapa interna do workflow | `idle`, `active-first` |
| `WorkflowCTA` | Iniciar workflow | `idle`, `running` |
| `ActiveWorkflowNotice` | Feedback após iniciar workflow | `hidden`, `visible` |
| `ArchitectureSidePanel` | Explica o modelo 3PN | padrão |
| `GoodPathSidePanel` | Explica o papel do Good Path | padrão |

## Component: ThreePNCard

### Description

Card principal. Deve ser legível sem expansão e permitir inspeção de cada camada sem navegar para outra tela.

### Properties

| Property | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | Ex.: `EXE-214` |
| `sprintId` | string | yes | Ex.: `SPRINT-001` |
| `status` | enum | yes | Canônico atual: `in-progress` |
| `title` | string | yes | Canônico: `Validar proposta central` |
| `description` | string | yes | Máx. recomendado 180 caracteres |
| `progress.completed` | integer | yes | Canônico: `2` |
| `progress.total` | integer | yes | Canônico: `3` |
| `problem` | rich text | yes | Expansível |
| `progressContent` | rich text | yes | Expansível |
| `next` | rich text | yes | Expansível |
| `outputs` | array | yes | Pode ser vazio em runtime, mas protótipo possui 2 |

### States

| State | Visual | Behavior |
|---|---|---|
| Default | card fechado parcialmente; `Problema` aberto | demais seções fechadas |
| Section open | corpo da seção visível | chevron gira 90° |
| Section closed | apenas linha + summary | toque abre |
| In progress | pill laranja suave | sem bloqueio de interação |

### Do
- Preservar card como unidade única.
- Manter `Problema`, `Progresso`, `Próximo passo`, `Outputs` na mesma ordem.
- Permitir abrir cada seção independentemente.

### Don't
- Não converter em tabs.
- Não mover Outputs para modal obrigatório.
- Não esconder o progresso 2/3.
- Não trocar a terminologia 3PN.

## Component: GoodPathWorkflowCard

### Description

Card compacto que representa um workflow reutilizável. Antes de iniciar, o usuário pode abrir e inspecionar todas as tarefas.

### Variants

| Variant | Label | Name | Task count |
|---|---|---|---:|
| `artistic` | Good Path · Artistic | Cartografia do Intervalo | 5 |
| `technical` | Good Path · Technical | Authentication Migration | 5 |
| `operational` | Good Path · Operational | Abertura da Unidade | 5 |

### Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `kind` | `artistic \| technical \| operational` | — | Define rótulo e ícone textual |
| `name` | string | — | Nome do workflow |
| `subtitle` | string | — | Três fases resumidas |
| `tasks` | WorkflowTask[] | — | Canônico: 5 |
| `open` | boolean | false | Expande tarefas |
| `status` | `idle \| running` | idle | Muda borda/CTA/status |

### States

| State | Visual | Behavior |
|---|---|---|
| Idle/closed | borda neutra, ícone neutro | header abre |
| Idle/open | tarefas + CTA visíveis | header fecha |
| Running/open | borda laranja, ícone laranja, status `Em andamento` | permanece aberto |
| Running first task | primeira task com marcador laranja sólido | próxima ação do 3PN |

### CTA contract

`Iniciar workflow →`

Ao clicar:
1. interrompe propagação para não fechar o card;
2. remove `running` dos outros Good Paths;
3. marca o escolhido como `running` e `open`;
4. altera CTA para `Workflow iniciado ✓`;
5. altera status para `Em andamento`;
6. mostra `ActiveWorkflowNotice`;
7. posiciona a primeira task como próxima ação do 3PN;
8. anuncia feedback em região `aria-live`.

## Component: ModeSwitcher

### Variants

- `Chat`: mostra `ChatContextHeader` e mensagem do Copiloto.
- `Gestor`: esconde contexto do Chat e mostra `TaskListHeader` com `Hoje` e `WIP 1 · 3PN`.

O componente 3PN + Good Path abaixo não muda de estrutura ao alternar o modo.

## Composition rule

A ordem canônica é:

1. header da experiência;
2. Card 3PN;
3. bloco `Abrir um Good Path`;
4. Artistic;
5. Technical;
6. Operational;
7. feedback de workflow ativo;
8. `aria-live` de status.

Na largura desktop, a experiência principal fica à esquerda e os dois painéis explicativos à direita. Em mobile, tudo vira uma coluna única.
