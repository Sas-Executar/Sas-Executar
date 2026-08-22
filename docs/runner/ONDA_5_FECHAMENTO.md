# Onda 5 · fechamento verificável das quatro ondas

A Onda 5 é uma etapa adicional de fechamento autorizada após o plano original de
quatro ondas. Seu objetivo é eliminar pendências implementáveis no repositório,
materializar os contratos finais e impedir que serviços não verificados sejam
confundidos com entregas prontas.

## Fundação de dados preparada

O template `sql/EXECUTAR_SUPABASE_TEMPLATE.sql` contém nove recursos
multi-tenant para organizações Clerk, projetos, entregas, dependências,
evidências, eventos, aprovações, comentários e leituras de notificação.

- Chaves primárias e estrangeiras compostas mantêm organização e projeto na
  mesma referência; predecessores não podem apontar para outro tenant.
- Todas as tabelas expostas recebem RLS habilitada e obrigatória, policies
  separadas de SELECT, INSERT, UPDATE e DELETE, permissões explícitas para
  `authenticated` e remoção de acesso de `anon`.
- O JWT Clerk aceita os formatos moderno `o.id` e legado `org_id`; a aplicação
  não cria membership paralelo nem usa metadata editável pelo usuário.
- Policies de UPDATE usam `USING` e `WITH CHECK`; colunas de tenant, filtros e
  chaves estrangeiras relevantes possuem índices.
- Autoria, aprovação e confirmação de leitura usam o `sub` da sessão Clerk;
  leituras são privadas por usuário e eventos de auditoria não podem ser
  alterados ou excluídos pela role `authenticated`.
- O bucket de evidências é privado, limitado a 2,5 MB e isolado pelo prefixo da
  organização em SELECT, INSERT, UPDATE e DELETE.
- Eventos possuem revisão idempotente, ator, trilha humana e publicação
  Realtime; aprovações concluídas exigem o identificador do aprovador.
- O arquivo original permanece como **template**. Em 22/08/2026, após
  autorização nominal do responsável, as migrations oficiais
  `20260822153100_executar_multi_tenant.sql` e
  `20260822153334_executar_clerk_identity_hardening.sql` foram aplicadas
  exclusivamente no projeto legado autorizado `executar-scanner-v1`
  (`aaaftocmuiztyxdgclqt`). As 34 tabelas e o bucket anteriores foram
  preservados integralmente.
- O projeto legado já permitia sessões anônimas autenticadas. As policies
  novas bloqueiam explicitamente `is_anonymous` e exigem um sujeito Clerk
  `user_*`; o advisor voltou aos mesmos 35 alertas legados, sem qualquer
  alerta novo nas tabelas EXECUTAR.

## Contratos de integração sem dependências novas

`apps/app/lib/executar/integration-contract.ts` entrega:

- diagnóstico das variáveis necessárias exibindo somente nomes/presença, nunca
  valores ou tokens;
- rejeição explícita de secret, service-role ou chave privada em `NEXT_PUBLIC_`;
- criação injetável do cliente Supabase com URL do projeto novo ou somente do
  legado nominalmente autorizado, chave
  publicável e `accessToken` derivado diretamente da sessão Clerk;
- caminho de evidência `organização/projeto/entrega/arquivo`, com bloqueio de
  outro tenant, entrega externa e path traversal;
- transformação do estado canônico em lote de projetos, entregas, dependências
  e eventos idempotentes, sem cadastro de membros ou plano duplicado.

Esses contratos não instalam o SDK, não configuram ambientes e não fazem
requisições a projetos externos.

## Matriz executável de fechamento

`apps/app/lib/executar/readiness.ts` organiza 26 etapas em um grafo acíclico de
dependências para as Ondas 1–4 e o fechamento final.

- Gates separados: **código**, **integração**, **produção** e **mobile**.
- Evidência local somente aprova código; serviços, runners e aprovação humana
  exigem evidências compatíveis, datadas e associadas à organização correta.
- Supabase existente sem autorização nominal, projeto sem identificação,
  identidade paralela e isolamento sem SELECT/INSERT/UPDATE/DELETE/Storage são
  recusados. A exceção não autoriza outros projetos existentes.
- Runner/CI só podem passar com steps efetivamente executados; jobs falhados
  com zero steps são classificados sem inventar a causa administrativa.
- Quando o runner passou a executar, seu primeiro erro real revelou que o
  pacote formado somente por configurações TypeScript herdava indevidamente o
  tsconfig da raiz; a tarefa sem fontes foi removida para não analisar o
  monorepo inteiro com JSX desabilitado.
- O pacote de dados existente agora gera seu cliente Prisma antes do próprio
  typecheck, evitando imports inexistentes sem adicionar infraestrutura.
- O pacote de notificações usa o construtor tipado Knock v1 e permanece
  desativado quando sua chave não foi configurada.
- O design system preserva seus wrappers e aparência, ajustando os tipos de
  gráficos ao Recharts v3 e os painéis acessíveis às primitivas da versão 4.
- A restauração de colaboração preserva os campos dinâmicos no type guard e
  mantém o isolamento de organização sem enfraquecer a tipagem TypeScript.
- O lint mantém suas regras sobre código produtivo; a micro-otimização de
  expressões regulares é dispensada somente nos testes operacionais.
- Produção e Android/iOS permanecem bloqueados pelos predecessores reais.
- A fila inicial aponta sessão Clerk real e runner Actions como próximos itens
  externos; eles dependem de autorização explícita para a integração final.

## Verificação local

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
node --test tests/ondas/onda-5.test.mjs
node --check apps/app/lib/executar/readiness.ts
node --check apps/app/lib/executar/integration-contract.ts
```

Os testes abrangem grafo, gates, isolamento de tenant, qualidade de evidência,
diagnóstico do runner, segurança de variáveis, sessão Clerk, projeto Supabase
novo ou legado nominalmente autorizado, caminho de evidência, exportação
canônica, migrations oficiais e os contratos SQL/RLS/Storage.

Resultado local verificado: **274 testes aprovados, 0 falhas**, incluindo
**72 testes específicos da Onda 5**.

Homologação remota verificada no PostgreSQL real: duas organizações, nove
tabelas, SELECT/INSERT/UPDATE/DELETE, policies de Storage, bloqueio de sessões
anônimas, rejeição de sujeitos externos ao Clerk, eventos imutáveis e
integridade de aprovações. A transação de teste foi encerrada com rollback.

## Gates reais

- Gate de código da Onda 5: **PASSOU**, com 274 testes locais verdes.
- Fundação Supabase/RLS/Storage: **PASSOU** no projeto explicitamente
  autorizado, preservando o scanner anterior.
- Gate de integração: **NÃO PASSOU** até Clerk de terceiros, persistência
  remota e sincronização real terem evidência verificada.
- Gate de produção: **NÃO PASSOU** até CI verde, Vercel, smoke tests e
  observabilidade serem comprovados.
- Gate mobile: **NÃO PASSOU**; `apps/mobile` continua proibido antes dos gates
  web, sincronização, isolamento e sessão móvel.

Nenhum projeto Supabase novo foi criado e nenhuma cobrança de provisionamento
foi iniciada. O deployment Vercel permanece pendente porque a equipe conectada
não apresenta um projeto acessível para vínculo, configuração ou publicação.
