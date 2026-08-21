# Integração final · provisionamento e produção

## Política de execução

O desenvolvimento do produto, do domínio e do Copiloto pode avançar com adaptadores locais e testes sem serviços externos. A falta de projeto Supabase, secrets, instalação de dependências, CI hospedado ou deployment Vercel não bloqueia a implementação verificável localmente.

Essas pendências continuam bloqueando produção, sincronização em nuvem e qualquer declaração de gate de integração aprovado.

Antes de executar ações externas, obter autorização explícita para iniciar a
integração final. Essa autorização precisa cobrir o projeto Supabase novo, a
instalação de dependências, a configuração de credenciais e ambientes, os
serviços conectados, os runners e o deployment Vercel. A Onda 5 organiza essas
ações, mas não configura recursos externos por presunção.

## Supabase: projeto obrigatoriamente novo

1. Criar um **novo projeto Supabase dedicado ao SaaS EXECUTAR** quando começar a integração final.
2. Não reutilizar, alterar ou inferir projetos Supabase existentes.
3. Configurar Clerk como autoridade de identidade, organizações, memberships e sessões.
4. Integrar Clerk pela opção oficial de autenticação de terceiros; usar o
   `accessToken` da sessão Clerk, não o fluxo antigo de JWT compartilhado.
5. Adaptar os pacotes existentes `packages/database` e `packages/storage`; não criar um segundo starter.
6. Com o CLI Supabase disponível, executar
   `supabase migration new executar_multi_tenant` e usar o conteúdo de
   `docs/runner/sql/EXECUTAR_SUPABASE_TEMPLATE.sql` na migration gerada pelo
   comando oficial; o template versionado ainda não representa migration aplicada.
7. Aplicar Postgres, RLS, Storage privado e Realtime com vínculo ao
   `clerk_org_id`; validar a migration real, grants e advisors.
8. Executar testes reais de SELECT, INSERT, UPDATE, DELETE e Storage entre
   organizações distintas; registrar as duas organizações e a evidência.
9. Só então conectar o estado local-first do produto ao repositório remoto usando
   eventos versionados, identificadores idempotentes e reconciliação explícita de
   conflitos; o adaptador inicial está em
   `apps/app/lib/executar/integration-contract.ts`.

## Demais itens da integração final

- Configurar secrets e variáveis de ambiente no projeto Vercel correto.
- Sincronizar e instalar dependências sem duplicar infraestrutura existente.
- Verificar autorização **e disponibilidade real do runner** do GitHub Actions;
  reexecução autorizada não basta quando os jobs falham sem steps/logs.
- Corrigir política, disponibilidade ou faturamento do runner conforme a causa
  confirmada na conta; só então executar instalação, typecheck, lint, testes e
  build completos até obter CI verde.
- Validar login, organizações e tenant ativo com Clerk real.
- Validar sincronização entre aparelhos e recuperação offline.
- Escolher provedor/modelo e conectar AI SDK real somente na integração final,
  aproveitando os contratos existentes `ToolLoopAgent`, `InferAgentUIMessage`,
  `inputSchema`, `DefaultChatTransport` e `toUIMessageStreamResponse`.
- Executar as ferramentas do agente no servidor com autoridade Clerk, contexto
  derivado da sessão e limites reais de etapas/chamadas.
- Persistir e validar aprovações humanas no servidor antes de concluir entrega,
  remover dados ou substituir plano; a proteção local não substitui autenticação
  e autorização remotas.
- Conectar MCP autenticado sem aceitar organização, projeto, revisão ou
  confirmação humana indicados pelo modelo.
- Ativar `LIVEBLOCKS_SECRET` e validar salas `${clerk_org_id}:${project_id}`,
  presença, comentários e menções entre membros reais de uma mesma organização;
  provar que outro tenant não obtém acesso.
- Configurar `KNOCK_SECRET_API_KEY`, `NEXT_PUBLIC_KNOCK_API_KEY` e
  `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID`, criando apenas workflows operacionais com
  destinatário validado pelo Clerk.
- Criar `apps/mobile` com Expo e EAS somente após web em produção,
  sincronização remota, isolamento multi-tenant e autenticação Clerk móvel
  estarem aprovados.
- Definir preços públicos apenas depois da decisão comercial e da integração
  Stripe; evitar checkout fictício ou alegações de disponibilidade inexistente.
- Conectar notificações, colaboração e cobrança quando houver um caso funcional verificável.
- Executar build, deployment, smoke tests e observabilidade na Vercel.
- Preservar o PR em draft enquanto os checks externos obrigatórios não passarem.

## Fila canônica da integração

A sequência e os gates executáveis estão em
`apps/app/lib/executar/readiness.ts`. A ordem material é:

1. Validar a sessão/organização Clerk e a execução efetiva do runner Actions.
2. Criar o projeto Supabase **novo** e configurar Clerk como terceiro confiável.
3. Gerar a migration oficial, aplicar o template e provar isolamento entre duas
   organizações para banco e Storage.
4. Conectar persistência, sincronização, aprovações autenticadas, cobrança e
   integrações operacionais aos pacotes `@repo/*` já existentes.
5. Executar CI hospedado verde, deployment Vercel, smoke tests e observabilidade.
6. Somente depois de web, sincronização, isolamento e sessão móvel aprovados,
   iniciar `apps/mobile` com Expo/EAS.

Nunca usar teste local como evidência de RLS hospedada, nem aceitar reexecução
autorizada como prova de runner funcional quando o job possui zero steps.

## Gates

- **Gate de código:** domínio, interface, dependências, evidências, isolamento local e Copiloto aprovados por testes locais.
- **Gate de integração:** Supabase novo, RLS/Storage, Clerk real, CI e deployment verificados com serviços reais.
- **Gate de produção:** integração aprovada, segurança, disponibilidade, custo e experiência final demonstrados.

A aprovação de um gate de código nunca implica aprovação automática de integração ou produção.
