# AUTORIZAÇÃO AUTÔNOMA · EXECUÇÃO EM 4 ONDAS

## Mandato

O Product Owner autoriza o Codex a executar integralmente as quatro ondas de `docs/runner/PLANO_SAAS_4_ONDAS.md`, sem confirmações intermediárias, preservando validações técnicas, segurança, rastreabilidade e gates objetivos.

Esta autorização cobre planejamento operacional, implementação, correções, testes, documentação, branches, commits, push, Pull Requests, resolução de conflitos e deployments de Preview. Promoção para produção somente pode ocorrer quando o checklist canônico estiver integralmente satisfeito no mesmo SHA.

Aprovações obrigatórias da plataforma, credenciais ausentes, cobrança real e operações externas irreversíveis não podem ser contornadas. Nesses casos, concluir todo o trabalho independente e registrar um único bloqueio consolidado.

## Autoridade concedida

O Codex pode:

- criar branches coerentes e Pull Requests;
- criar, editar, mover e remover arquivos dentro do repositório;
- instalar ou atualizar dependências compatíveis;
- executar scripts, migrations não destrutivas, builds, lint, typecheck e testes;
- corrigir bugs, dívida técnica, segurança e inconsistências encontradas;
- criar commits pequenos, rastreáveis e com evidências;
- resolver conflitos das PRs relacionadas;
- atualizar ADRs, schemas, contratos, runbooks, inventários e relatórios;
- criar deployments de Preview;
- avançar para a onda seguinte quando o gate de código passar, separando gate local, integração e produção;
- continuar até concluir as quatro ondas ou atingir bloqueio externo real.

Não pedir confirmação para decisões mecânicas, reversíveis ou já definidas. Não interpretar autonomia como permissão para omitir testes.

## Decisões D1–D8

1. **D1 — P0:** Master PRD, invariantes e execução das quatro ondas estão aprovados para desenvolvimento.
2. **D2 — arquitetura:** permanece vigente o Full SaaS definido no repositório: Clerk, AWS em `sa-east-1`, Aurora PostgreSQL privado via RDS Data API, RLS, S3, IAM/OIDC, Secrets Manager, CloudWatch, Stripe, Vercel AI SDK, MCP, Expo e Vercel.
3. **D3 — autoridade:** Clerk governa identidade/tenant; o runtime EXECUTAR governa o estado canônico. Drive, Linear e MCP são adaptadores externos.
4. **D4 — PR 22:** aprovada como referência de design, preservando `NO VISUAL DRIFT`.
5. **D5 — PR 28:** autorizada a resolução de conflitos e integração depois da comprovação do Gate 0.
6. **D6 — MCP:** `FASE2-SPEC` é especificação preparatória. A Fase 2 pode iniciar após revisão e resolução técnica dos 52 itens.
7. **D7 — granularidade:** um workflow deve estar vinculado a um entregável; máximo de 72 ações e alvo de 15 minutos por ação.
8. **D8 — contratos:** JSON oficial versionado no repositório; evidências grandes armazenadas por referência com ID, origem, integridade e auditoria.

## Fonte de verdade e precedência

1. Segurança, isolamento de tenant e integridade dos dados.
2. Instrução explícita mais recente do usuário.
3. `AGENTS.md`.
4. Este documento e decisões D1–D8.
5. `docs/runner/PLANO_SAAS_4_ONDAS.md`.
6. `docs/runner/RUNNER_CODEX.md`.
7. PWA preservada e comportamento funcional comprovado.
8. Documentação técnica restante.

## Execução

### Onda 1 — Fundação SaaS

Reutilizar o next-forge existente; preservar a PWA; implementar Clerk, organizações, IaC AWS, Aurora Data API, RLS, S3, CI, observabilidade, CSP, rate limiting e testes de isolamento multi-tenant.

### Onda 2 — Produto operacional

Portar domínio, dependências, fila, foco, conclusão, evidências, capacidade e ciclos. Implementar árvore canônica, persistência, local-first, sincronização, S3, Stripe, responsividade, acessibilidade e equivalência funcional.

### Onda 3 — Copiloto, Agent-007 e MCP

Implementar command boundary server-owned, preview/aprovação/apply atômicos e idempotentes, Copiloto conectado ao estado real, comandos operacionais, auditoria, avaliações, limites e ferramentas MCP segregadas por risco e tenant.

### Onda 4 — Colaboração, mobile e GTM

Implementar colaboração útil, notificações, Expo, autenticação mobile, evidências, pipelines Android/iOS, PWA instalável, onboarding, preços, analytics, observabilidade, privacidade, rollback e checklist de produção.

## Regras obrigatórias

- Nunca desenvolver diretamente na `main`.
- Preservar `NO VISUAL DRIFT` e a PWA até equivalência comprovada.
- Não declarar sucesso sem código, testes, evidência e SHA.
- Não usar mocks para esconder falhas de integração.
- Não expor secrets nem dados pessoais.
- Não executar exclusão irreversível ou migração destrutiva de produção.
- Toda escrita multi-tenant deve provar isolamento.
- Nenhum status externo `Done` altera o estado canônico sem DoD, evidência e verificação.
- Se faltar segredo, criar `.env.example`, validação, adaptador e teste local; continuar o restante.
- Cada onda termina com Resultado, Mudanças, Testes, Gate, Bloqueios e Próximo.

## Critério final

Uma onda passa somente com código executável, testes verdes, documentação atualizada e evidências no mesmo SHA. Produção exige todos os blockers convertidos em READY, golden path E2E, rollback/recovery e sign-off.