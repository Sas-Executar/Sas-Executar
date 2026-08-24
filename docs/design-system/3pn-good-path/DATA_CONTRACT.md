# Data Contract · 3PN + Good Path

## Principle

UI state and product data are separate. The renderer must be able to reproduce the approved component from structured data without embedding product copy inside component logic.

## ThreePNCard

```ts
type ThreePNCard = {
  id: string;
  sprintId: string;
  status: "in_progress" | "ready_for_review" | "done";
  title: string;
  description: string;
  progress: {
    completed: number;
    total: number;
  };
  sections: {
    problem: RichContent;
    progress: RichContent;
    next: RichContent;
  };
  outputs: OutputArtifact[];
};
```

## OutputArtifact

```ts
type OutputArtifact = {
  id: string;
  name: string;
  subtitle?: string;
  kind: "spec" | "structured" | "file" | "link";
  href?: string;
};
```

## GoodPathWorkflow

```ts
type GoodPathWorkflow = {
  id: string;
  kind: "artistic" | "technical" | "operational";
  label: string;
  name: string;
  subtitle: string;
  tasks: WorkflowTask[];
};
```

## WorkflowTask

```ts
type WorkflowTask = {
  id: string;
  order: number;
  text: string;
};
```

## Runtime workflow state

```ts
type WorkflowRuntimeState = {
  openById: Record<string, boolean>;
  activeWorkflowId: string | null;
  startStatusById: Record<
    string,
    "idle" | "starting" | "running" | "error"
  >;
};
```

## Canonical sample payload

```json
{
  "card": {
    "id": "EXE-214",
    "sprintId": "SPRINT-001",
    "status": "in_progress",
    "title": "Validar proposta central",
    "description": "Transformar uma intenção aberta em uma unidade verificável de execução, com evidência e output acessível.",
    "progress": { "completed": 2, "total": 3 },
    "sections": {
      "problem": "O usuário perde contexto quando a tarefa vira apenas uma linha. O card deve manter problema, progresso, próximo passo e evidência juntos.",
      "progress": "Concluído: público prioritário e dor principal. Em andamento: validar o resultado prometido.",
      "next": "Agora: testar o card em um fluxo real e anexar evidência objetiva."
    },
    "outputs": [
      {
        "id": "spec",
        "name": "3PN-card-spec.md",
        "subtitle": "Especificação · v0.1",
        "kind": "spec"
      },
      {
        "id": "structured",
        "name": "card-flow-output.json",
        "subtitle": "Output estruturado",
        "kind": "structured"
      }
    ]
  },
  "workflows": [
    {
      "id": "artistic",
      "kind": "artistic",
      "label": "Good Path · Artistic",
      "name": "Cartografia do Intervalo",
      "subtitle": "Exploração → prototipagem → seleção conceitual",
      "tasks": [
        { "id": "art-1", "order": 1, "text": "Reunir referências e materiais ligados a silêncio, deslocamento e repetição." },
        { "id": "art-2", "order": 2, "text": "Organizar o material em núcleos de linguagem por atmosfera, contraste e recorrência." },
        { "id": "art-3", "order": 3, "text": "Criar três protótipos de pequena escala para testar combinações." },
        { "id": "art-4", "order": 4, "text": "Testar os protótipos por conceito, duração, acesso e relação com o espaço." },
        { "id": "art-5", "order": 5, "text": "Selecionar os componentes essenciais pela força conceitual." }
      ]
    },
    {
      "id": "technical",
      "kind": "technical",
      "label": "Good Path · Technical",
      "name": "Authentication Migration",
      "subtitle": "Auditoria → implementação → staging",
      "tasks": [
        { "id": "tec-1", "order": 1, "text": "Revisar autenticação atual usando código, logs, contratos e testes existentes." },
        { "id": "tec-2", "order": 2, "text": "Modelar o fluxo alvo relacionando frontend, API, Supabase, cookies e segurança." },
        { "id": "tec-3", "order": 3, "text": "Implementar sessões persistentes preservando contas existentes e rotas públicas." },
        { "id": "tec-4", "order": 4, "text": "Criar testes unitários, integrados e ponta a ponta para os fluxos críticos." },
        { "id": "tec-5", "order": 5, "text": "Validar a solução em staging comparando comportamento antes e depois." }
      ]
    },
    {
      "id": "operational",
      "kind": "operational",
      "label": "Good Path · Operational",
      "name": "Abertura da Unidade",
      "subtitle": "Pré-operação → sistemas → treinamento",
      "tasks": [
        { "id": "ops-1", "order": 1, "text": "Consolidar licenças, contratos, escalas e requisitos de abertura." },
        { "id": "ops-2", "order": 2, "text": "Desenhar a jornada operacional do cliente ponta a ponta." },
        { "id": "ops-3", "order": 3, "text": "Definir níveis mínimos de estoque e validar reposição." },
        { "id": "ops-4", "order": 4, "text": "Preparar acessos, sistemas, terminais e integrações." },
        { "id": "ops-5", "order": 5, "text": "Treinar a equipe com prática supervisionada e simulações." }
      ]
    }
  ]
}
```

## Derived UI values

Never persist presentation-only strings when they can be derived:
- workflow count = `workflows.length`;
- task count = `workflow.tasks.length`;
- progress ratio = `completed / total`;
- running status label = derived from runtime state;
- active notice name = derived from active workflow.

## Validation rules

- `progress.total >= 1`.
- `0 <= completed <= total`.
- workflow IDs unique.
- task IDs unique inside workflow.
- task `order` contiguous starting at 1.
- `name`, `label`, `subtitle`, `text` must never render as blank/undefined.
- active workflow id must resolve to a workflow in current data.

## Persistence boundary

Ephemeral:
- section open/closed;
- Good Path open/closed;
- selected Chat/Gestor view.

Persistable product state:
- active workflow instance;
- task completion;
- workflow start timestamp/actor;
- generated outputs/evidences;
- audit trail required by existing product rules for state-changing agent tools.
