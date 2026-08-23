# AGENTS.md · EXECUTAR Sprint Operacional

Este repositório é o produto `Sas-Executar/Sas-Executar`, base canônica do SaaS EXECUTAR.

A PWA original foi migrada de `Executar-26/Sprint-Operacional` para `apps/app/public/legado/sprint-operacional/` e permanece como referência funcional até existir equivalência comprovada.

O responsável pela próxima etapa de desenvolvimento é o Codex. Antes de alterar qualquer código, leia integralmente:

1. `docs/runner/README.md`
2. `docs/runner/PLANO_SAAS_4_ONDAS.md`
3. `docs/runner/RUNNER_CODEX.md`
4. `docs/runner/USER_MESSAGE_CODEX.md`
5. `README.md`
6. o código atual da PWA em `apps/app/public/legado/sprint-operacional/` (`index.html`, `app.css`, `app.js`, `data.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`);
7. `docs/runner/INVENTARIO_LEGADO.md`;
8. `docs/runner/PWA_ORIGINAL.md`;
9. o starter existente em `apps/app`, `packages/auth`, `packages/database`, `packages/storage`, `packages/observability`, `packages/security` e `packages/rate-limit`.

## Regra principal

O produto atual é uma referência funcional válida e não deve ser descartado. Preserve o modelo mental e a experiência já aprovados:

- Visão Geral.
- Foco com “Próximo 1 por vez”.
- Fila apenas do que já pode começar.
- “Ainda não pode” para dependências bloqueantes.
- Calendário de resultados e ciclos de 72 horas.
- Caminho visual das dependências.
- Evidências.
- funcionamento PWA/offline.

A evolução para SaaS deve substituir infraestrutura frágil, não reinventar o produto.

## Fundação decidida

A direção arquitetural é:

- `next-forge` já existente neste repositório como chassis SaaS/monorepo; não reinicializar nem criar um segundo starter.
- Next.js para aplicação web.
- Clerk para identidade, organizações, membros, convites e sessões.
- AWS em `sa-east-1`: Aurora PostgreSQL privado com RDS Data API, RLS, S3 privado, IAM/OIDC, Secrets Manager e CloudWatch.
- Stripe para cobrança e direitos de acesso.
- Vercel AI SDK para Copiloto/agentes.
- MCP para ferramentas e integrações.
- colaboração em tempo real somente onde trouxer valor operacional.
- Expo para Android e iOS quando a base web estiver validada.
- Vercel para publicação.

## Prioridade vigente: infraestrutura AWS transversal

- O IaC canônico fica em `infra/aws/` e deve ser aplicado pelo workflow `.github/workflows/aws-infra.yml`, reutilizando o OIDC GitHub já autorizado.
- O Aurora não recebe entrada pública em `5432`: runtimes Vercel usam credenciais temporárias OIDC e RDS Data API. Não use `DATABASE_URL` fictícia para mascarar indisponibilidade.
- Evidências ficam em bucket S3 privado, criptografado e particionado pelo identificador da organização Clerk.
- Clerk permanece a autoridade de identidade e tenant; RLS é a última barreira no PostgreSQL e toda integração deve provar isolamento com duas organizações reais.
- O adaptador e as migrations Supabase permanecem somente como fonte legada auditável. Não são a infraestrutura canônica nem autorização para provisionar outro projeto.
- Continue as ondas de produto e Copiloto quando faltarem secrets, CI hospedado ou deployment Vercel, desde que o código possa ser validado localmente.
- Reutilize Clerk, o starter e adaptadores locais isolados por organização até a integração real.
- Distinga explicitamente gate de código, gate de integração e gate de produção; testes locais não comprovam RLS, sincronização em nuvem nem deployment.
- O checklist canônico de provisionamento está em `docs/runner/INTEGRACAO_FINAL.md`.

## Restrições

- Não fazer reescrita visual radical.
- Não mudar nomenclatura orientada à ação sem necessidade.
- Não introduzir infraestrutura paralela quando o starter já resolver o problema.
- Não duplicar autenticação/membership no banco se Clerk já for autoridade para isso.
- Não remover o PWA atual antes de a versão sucessora reproduzir os fluxos essenciais.
- Não iniciar aplicativo móvel antes do Gate Web/SaaS estar aprovado tecnicamente.
- Não criar microserviços prematuramente.
- Não criar CRM, ERP ou marketplace como aplicações separadas: são módulos de domínio futuros do mesmo produto.
- Toda escrita multi-tenant deve ser testada contra vazamento entre organizações.
- Toda ferramenta de agente que modifica estado deve ter autorização explícita, trilha de auditoria e aprovação humana quando o efeito for relevante/irreversível.

## Forma de trabalho

Trabalhe em ondas e por dependência real. Não crie dezenas de microfases. O plano canônico possui 4 ondas.

Cada onda deve terminar com:

1. código executável;
2. testes relevantes verdes;
3. documentação mínima atualizada;
4. lista objetiva do que foi concluído;
5. riscos/bloqueios reais;
6. gate da onda marcado como PASSOU ou NÃO PASSOU.

Se faltar segredo externo, credencial ou ação de console, implemente todo o código possível, gere `.env.example`, descreva exatamente o campo necessário e continue as entregas das ondas seguintes que não dependerem dele.
