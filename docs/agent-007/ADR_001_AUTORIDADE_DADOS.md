# ADR-001 · Autoridade de dados e sincronização

**Estado:** proposto
**Data:** 24/08/2026
**Escopo:** Agent-007 no SaaS EXECUTAR

## Contexto

O handoff descreve Drive como control center, Linear como estado ao vivo e
documentos/CSVs como espelhos. O repositório canônico, porém, já travou uma
arquitetura SaaS AWS e implementa estado operacional por organização, revisão,
eventos e persistência remota. Manter as duas leituras como autoridades
simultâneas produziria split-brain.

## Decisão

### Autoridades canônicas

| Dado | Autoridade | Observação |
|---|---|---|
| identidade, sessão, organização e membros | Clerk | IDs nunca vêm do modelo |
| definição de projeto/entrega/DoD/dependências | Aurora PostgreSQL | escrita transacional e isolada por organização |
| estado, foco, progresso, revisão e eventos | Aurora PostgreSQL | um writer lógico por operação |
| bytes de evidência | S3 privado | metadados e vínculo ficam no estado/banco |
| contratos e migrations | GitHub neste repositório | revisão por PR e CI |
| fila, bloqueios, calendário, progresso e painéis | derivados | nunca editáveis como autoridade |

O local-first do navegador é cache/outbox sujeito a reconciliação. Não é
autoridade definitiva depois da sincronização.

### Drive e Linear

Drive e Linear entram como adaptadores. Um binding deve declarar:

- organização e projeto proprietários;
- provedor, recurso externo e chave lógica estável;
- direção autorizada: `import`, `export` ou `projection`;
- campos autorizados e política de conflito;
- cursor/versão externos e último run confirmado;
- estado do binding e data da última verificação.

Não haverá sincronização bidirecional genérica. Um conector não pode promover
uma entrega a `DONE` sem passar pelo domínio e pela política de conclusão.

### Escrita e idempotência

Toda escrita relevante recebe:

```text
run_id          identifica a execução ponta a ponta
operation_id    identifica um efeito atômico
idempotency_key impede repetição do mesmo efeito
expectedRevision aplica compare-and-set no estado
actor           usuário/serviço responsável
approval_id     obrigatório quando a ferramenta exige aprovação
```

O `operation_id` atual baseado em organização, projeto e revisão permanece
válido para eventos canônicos. Rotinas e conectores acrescentam `run_id` e uma
chave por efeito externo.

### Fluxo de reconciliação

1. autenticar e resolver organização/projeto no servidor;
2. ler revisão canônica e binding autorizado;
3. normalizar a entrada externa sem escrever;
4. calcular diff e validar invariantes;
5. pedir aprovação quando aplicável;
6. reservar/registrar o run e suas chaves idempotentes;
7. efetivar a mutação canônica com revisão esperada;
8. realizar efeitos externos autorizados;
9. registrar confirmação ou falha recuperável;
10. gerar projeção a partir da revisão confirmada.

Conflito de revisão interrompe a escrita. Não existe “last write wins” entre
fontes diferentes.

### Falhas parciais

- falha antes do commit canônico: estado não muda;
- falha depois do commit e antes do efeito externo: run fica recuperável e o
  replay usa a mesma chave;
- confirmação externa divergente: binding fica `degraded`, sem declarar
  sucesso;
- conector indisponível: projeções indicam desatualização; não inventam estado;
- evidência sem upload confirmado: não conta para conclusão.

## Contrato de projeção

Uma projeção sempre carrega `organizationId`, `projectId`, `sourceRevision`,
`projectionId`, `schemaVersion`, `kind` e `generatedAt`. Ela contém somente
dados necessários à superfície e nunca bytes privados de evidência. Renderer e
templates não recebem credencial nem porta de escrita.

## Segurança e privacidade

- RLS/autoridade são aplicadas no servidor, não somente na UI;
- caminhos S3 começam por organização/projeto/entrega validados;
- traces registram ações/resultados observáveis, não raciocínio privado;
- o modelo não escolhe tenant, projeto, aprovação ou revisão;
- dados externos são minimizados antes de entrar em prompt, log ou dataset.

## Consequências

### Positivas

- elimina a ambiguidade Drive × Linear × app;
- preserva o core e a infraestrutura já implementados;
- possibilita replay e auditoria ponta a ponta;
- mantém renderers intercambiáveis e sem estado.

### Custos

- conectores precisam de bindings e políticas explícitas;
- migrações do protocolo baseado em Drive exigem preview e confirmação;
- runs/efeitos adicionam persistência e observabilidade;
- o Gate 0 precisa ser aprovado antes da implementação.

## Alternativas rejeitadas

1. **Drive como banco principal do SaaS:** rejeitado por contrariar a
   arquitetura AWS canônica e os requisitos transacionais/multi-tenant.
2. **Linear como autoridade de estado:** rejeitado porque não aplica sozinho
   DoD, evidência, verificação e aprovação.
3. **Sincronização bidirecional last-write-wins:** rejeitada por perda silenciosa
   e impossibilidade de auditoria.
4. **Estado do agente separado:** rejeitado porque cria uma segunda verdade.

## Condição de aceite

O ADR é aceito quando a equipe confirmar explicitamente AWS como autoridade,
Drive/Linear como adaptadores e compare-and-set + idempotência como política de
escrita. Após aceite, implementações divergentes devem ser migradas por ADR
subsequente, nunca implicitamente.
