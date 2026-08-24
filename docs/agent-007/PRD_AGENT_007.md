# PRD · Agent-007 Copiloto EXECUTAR

**Versão:** 0.1.0
**Estado:** proposta para o Gate 0
**Data:** 24/08/2026
**Owner:** produto EXECUTAR

## 1. Problema

Uma pessoa solo precisa transformar intenção em execução diária sem manter
manualmente uma segunda base, aprender estados técnicos ou confiar em respostas
que não correspondem ao trabalho persistido. O Copiloto atual já opera parte do
domínio canônico, mas o handoff de validação acrescenta requisitos de
onboarding, conectores, rotina, projeção visual e piloto que ainda não possuem
um contrato único de produto.

## 2. Objetivo

Entregar um Copiloto que percorra, com rastreabilidade, a jornada:

`identidade → autoridade → comando → leitura → estado derivado → ação → escrita → evidência → projeção`.

O produto deve manter “Próximo 1 por vez”, respeitar dependências, impedir
conclusões inválidas, pedir aprovação humana para escritas relevantes e usar a
mesma autoridade de estado do aplicativo.

## 3. Não objetivos do MVP

- criar outro backend, auth, monorepo ou estado do Copiloto;
- tornar Drive ou Linear fontes concorrentes do estado canônico;
- reescrever a PWA preservada ou ampliar a UI antes do Gate 0/Onda 1;
- construir mobile, CRM, ERP ou integrações genéricas antecipadamente;
- persistir raciocínio privado do modelo;
- permitir que templates ou documentos recalcularem estado.

## 4. Usuários e jobs

### Usuário primário

Pessoa ou pequena equipe autenticada por Clerk, trabalhando dentro de uma
organização e de um projeto EXECUTAR.

### Jobs principais

1. começar do zero, migrar um plano ou conectar uma fonte existente;
2. perguntar o que fazer agora e receber uma resposta baseada no estado real;
3. registrar progresso e evidência sem perder contexto;
4. concluir somente quando a política de conclusão estiver satisfeita;
5. replanejar apenas o subgrafo afetado;
6. fechar e reabrir o dia com replay seguro;
7. emitir uma projeção visual sem criar uma nova fonte de verdade.

## 5. Princípios de produto

- **Estado único:** Aurora PostgreSQL é a autoridade operacional; S3 guarda
  bytes privados de evidência; Clerk é a autoridade de identidade e tenant.
- **Derivação:** fila, bloqueios, progresso e projeções são calculados.
- **Aprovação:** ações relevantes não são efetivadas pelo modelo sozinho.
- **Determinismo:** regras vivem no domínio, não no prompt nem na UI.
- **Local-first seguro:** mudanças locais carregam revisão e reconciliam sem
  sobrescrita silenciosa.
- **Privacidade por padrão:** somente eventos observáveis e minimizados.
- **Renderer sem estado:** `executar-design` consome uma projeção versionada.

## 6. Requisitos funcionais

### RF-01 · Autoridade e contexto

O servidor deve resolver `organizationId`, `userId`, `projectId` e revisão sem
aceitar esses valores do modelo. Conectores externos recebem bindings
autorizados e nunca alteram o tenant ativo.

### RF-02 · Estado e dependências

O núcleo mantém entregas, dependências tipadas, foco único, progresso,
evidências, eventos e revisão. Estados derivados usam o catálogo:
`BACKLOG_VALIDATED`, `READY`, `DOING`, `VERIFY`, `DONE` e `BLOCKED`.

### RF-03 · Política de conclusão

Uma entrega só entra em `DONE` quando:

1. está liberada e em foco;
2. possui DoD definido e satisfeito conforme a política do projeto;
3. possui evidência válida;
4. a evidência está verificada;
5. a ação relevante recebeu aprovação humana vigente.

Enquanto o runtime não validar todos os cinco itens, GAP-001 permanece
`PARCIAL`.

### RF-04 · Comandos

O catálogo mínimo inclui `/bomdia`, `/agora`, `/situacao` (alias de
`/estado`), `/estado`, `/fechardia`, `/replanejamento`, `/mapa`, `/evidencia`
e `/bloqueio`. Cada comando possui input, output, efeitos e testes.

### RF-05 · Idempotência e replay

Toda rotina ou escrita externa recebe `run_id`, `operation_id`, revisão
esperada e chave idempotente. Reexecução não duplica eventos, entregas,
evidências ou artefatos. Conflitos interrompem o run com diagnóstico
recuperável.

### RF-06 · Onboarding e importação

O usuário escolhe uma intenção: começar do zero, migrar arquivo, conectar base
existente ou abrir novo projeto. A importação faz descoberta, normalização,
preview, confirmação e relatório de rejeições antes da escrita.

### RF-07 · Drive e Linear

Drive e Linear são adaptadores opcionais. No MVP, servem como fontes de
importação, destinos de exportação/projeção ou sistemas vinculados sob política
explícita. Não substituem automaticamente a autoridade AWS nem habilitam
sincronização bidirecional irrestrita.

### RF-08 · Rotina diária

`/bomdia`, fechamento e rollover executam sobre dados persistidos. Devem
suportar acionamento manual, agendamento posterior, lock, replay, log de
efeitos e falha segura.

### RF-09 · Projeção e renderer

O serviço converte uma revisão canônica em payload conforme
`projection-contract.v1`. App, Mapa-OS, Prisma, Workbook e Showroom consomem
somente esse payload. Templates não escrevem no estado.

### RF-10 · Evidência e auditoria

Eventos registram ator, ferramenta, tenant, projeto, revisão, correlação,
resultado e aprovação quando aplicável. Evidências privadas permanecem no S3
e projeções não expõem bytes/base64.

## 7. Requisitos não funcionais

- isolamento de organização em toda leitura e escrita;
- controle otimista de concorrência e zero sobrescrita silenciosa;
- limite de passos, tool calls, payload e tamanho de plano;
- erros observáveis sem credenciais ou raciocínio privado;
- artefatos físicos offline, com cores preservadas e QR decodificável;
- acessibilidade e linguagem pt-BR orientada à ação;
- CI obrigatório para contratos, domínio, typecheck, lint, testes e build.

## 8. Métricas e lançamento

- zero transições inválidas no piloto;
- zero writes ou artefatos duplicados;
- 100% de `DONE` conforme a política de conclusão;
- 100% dos cenários P0 em `PASS` antes do piloto;
- falha de conector sempre explícita e recuperável;
- 100% das ações externas correlacionadas a um `run_id`;
- piloto de sete dias sem perda silenciosa ou split-brain.

## 9. Dependências

- domínio atual em `apps/app/lib/executar`;
- Clerk, Aurora Data API, RLS, S3 e IAM/OIDC definidos no plano SaaS;
- Vercel AI SDK e manifesto MCP existentes;
- aprovação do ADR e dos dois contratos deste Gate 0.

## 10. Critério do Gate 0

O Gate 0 passa quando PRD, ADR, state contract, projection contract, política
de dados e matriz E2E forem aprovados por revisão humana, estiverem cobertos por
testes de consistência e não contradisserem o plano SaaS canônico.
