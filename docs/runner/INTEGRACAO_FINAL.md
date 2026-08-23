# Integração final · provisionamento e produção

## Decisão vigente · AWS autorizada em 23/08/2026

A direção Supabase abaixo foi substituída por autorização explícita posterior. A integração canônica agora é:

1. alterar o plano AWS de `FREE` para `PAID`, pois o plano gratuito só aceita Aurora Express fora de VPC e com gateway de internet obrigatório; depois aplicar `infra/aws/template.yaml` na conta `250892133959`, região `sa-east-1`, pelo workflow `.github/workflows/aws-infra.yml` e pelo role OIDC já configurado no repositório;
2. manter Aurora PostgreSQL Serverless v2 em sub-redes privadas, sem entrada pública em `5432`, com RDS Data API e credenciais no Secrets Manager;
3. executar as migrations versionadas de `infra/aws/migrations/` e o smoke real de duas organizações por `scripts/aws/`;
4. manter evidências em S3 privado, criptografado, versionado e separado pelo identificador da organização Clerk;
5. entregar credenciais temporárias ao runtime Vercel por OIDC, sem chaves AWS estáticas e sem `DATABASE_URL` fictícia;
6. sincronizar os ARNs e nomes de recursos como variáveis de servidor do preview, publicar novamente e validar login, persistência, isolamento, upload/download e reload;
7. preservar Clerk como autoridade de identidade e considerar o material Supabase apenas uma fonte de migração auditável.

O gate de integração só passa depois de CloudFormation, migrations, smoke RLS e deployment Vercel reais ficarem verdes. Produção continua sendo um gate separado.

## Política de execução

O desenvolvimento do produto, do domínio e do Copiloto pode avançar com adaptadores locais e testes sem serviços externos. A falta de secrets, instalação de dependências, CI hospedado ou deployment Vercel não bloqueia a implementação verificável localmente.

Essas pendências continuam bloqueando produção, sincronização em nuvem e qualquer declaração de gate de integração aprovado.

Antes de executar ações externas, obter autorização explícita para iniciar a
integração final. A autorização AWS foi registrada em 23/08/2026 para esta
entrega; cobranças adicionais, produção e operações destrutivas continuam
exigindo escopo explícito.

## Registro histórico Supabase — não executar como direção atual

1. Sem uma autorização nominal posterior, criar um **novo projeto Supabase dedicado ao SaaS EXECUTAR** quando começar a integração final.
2. Em 22/08/2026, o responsável autorizou expressamente a exceção restrita ao
   projeto existente `executar-scanner-v1`, referência
   `aaaftocmuiztyxdgclqt`, organização `gfpmsqshqaftvjzrrarl`, região
   `sa-east-1`. Nenhum outro projeto existente está autorizado.
3. Preservar todas as tabelas, os registros, as policies e o bucket anteriores
   do scanner; criar somente recursos aditivos `executar_*` e o bucket privado
   `executar-evidencias`. Reutilizar esse projeto não cria um novo projeto nem
   gera cobrança de provisionamento.
4. Configurar Clerk como autoridade de identidade, organizações, memberships e sessões.
5. Integrar Clerk pela opção oficial de autenticação de terceiros; usar o
   `accessToken` da sessão Clerk, não o fluxo antigo de JWT compartilhado.
6. Adaptar os pacotes existentes `packages/database` e `packages/storage`; não criar um segundo starter.
7. Com o CLI Supabase disponível, executar
   `supabase migration new executar_multi_tenant` e usar o conteúdo de
   `docs/runner/sql/EXECUTAR_SUPABASE_TEMPLATE.sql` na migration gerada pelo
   comando oficial; o template versionado ainda não representa migration aplicada.
8. Aplicar Postgres, RLS, Storage privado e Realtime com vínculo ao
   `clerk_org_id`; validar a migration real, grants e advisors.
9. Executar testes reais de SELECT, INSERT, UPDATE, DELETE e Storage entre
   organizações distintas; registrar as duas organizações e a evidência.
10. Só então conectar o estado local-first do produto ao repositório remoto usando
   eventos versionados, identificadores idempotentes e reconciliação explícita de
   conflitos. O contrato está em `apps/app/lib/executar/integration-contract.ts`;
   a implementação PostgREST/RPC está em
   `apps/app/lib/executar/remote-persistence.ts`, com sessão Clerk derivada no
   servidor em `apps/app/lib/executar/server-persistence.ts` e rotas
   `/api/executar/state`, `/api/executar/approvals` e
   `/api/executar/evidence`.
11. Configurar a integração oficial Clerk → Supabase antes de considerar a RPC
   utilizável por usuários reais; testes SQL com claims simuladas comprovam RLS
   e transação, mas não substituem JWT Clerk aceito pelo projeto.
12. Evidências usam upload autenticado ao bucket privado, download por uma rota
   protegida no servidor e o prefixo `organização/projeto/entrega/arquivo`.
   A migration `20260822201910_executar_evidence_and_collaboration_projection`
   projeta evidências, comentários e leituras nas tabelas definitivas dentro
   da mesma transação operacional, sem contornar RLS ou autoria Clerk.

## Demais itens da integração final

- A configuração pública conhecida de produção está versionada em
  `apps/app/.env.production`: URL, referência e chave publishable do projeto
  Supabase autorizado, URLs públicas derivadas de `VERCEL_URL` e rotas públicas
  do Clerk. O arquivo aceita exclusivamente chaves `NEXT_PUBLIC_` sem segredo.
- Depois de importar o repositório na Vercel com Root Directory `apps/app`,
  cadastrar no painel da Vercel `CLERK_SECRET_KEY` e
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, cujo valor público ainda não está
  disponível neste repositório. A integração Clerk pelo Vercel Marketplace pode
  provisionar automaticamente ambas. `CLERK_WEBHOOK_SECRET` só é necessário
  quando o webhook de organizações for habilitado.
- O runtime operacional usa PostgREST/RPC com chave publishable, sessão Clerk e
  RLS. Ele não usa o cliente Prisma/Neon do starter: `DATABASE_URL` e
  `DIRECT_URL` são opcionais e só devem ser configurados se algum módulo futuro
  realmente passar a acessar PostgreSQL diretamente.
- Aplicar o escopo de Production e Preview deliberadamente. Preview não deve
  receber, por padrão, acesso ao banco de produção.
- Nunca adicionar `sb_secret_*`, `service_role`, senha do banco,
  `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN` ou qualquer chave `sk_*` ao arquivo
  versionado. Segredos permanecem no painel da Vercel ou em `.env.local`.
- Sincronizar e instalar dependências sem duplicar infraestrutura existente.
- Verificar autorização **e disponibilidade real do runner** do GitHub Actions;
  reexecução autorizada não basta quando os jobs falham sem steps/logs.
- Corrigir política, disponibilidade ou faturamento do runner conforme a causa
  confirmada na conta; só então executar instalação, typecheck, lint, testes e
  build completos até obter CI verde.
- Validar login, organizações e tenant ativo com Clerk real.
- Validar sincronização entre aparelhos e recuperação offline.
- O Copiloto com IA usa o pacote `@repo/ai` já presente no monorepo, o Vercel AI
  Gateway e o modelo padrão `openai/gpt-5.6-luna`; `EXECUTAR_AI_MODEL` permite
  selecionar outro modelo `provedor/modelo` existente. Em deployment Vercel, o
  Gateway usa o token OIDC da própria plataforma: não criar chave OpenAI nem
  adicionar credenciais ao repositório. A integração real está na rota
  `/api/executar/copilot` com `ToolLoopAgent`, `InferAgentUIMessage`, esquemas
  estritos e `createAgentUIStreamResponse`. Inferência real só fica aprovada
  após deployment funcional e uma chamada autenticada efetivamente concluída.
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
- Os templates preparatórios `docs/runner/mobile/eas.template.json` e
  `docs/runner/mobile/app.config.template.json` definem Android APK interno,
  Android App Bundle para Google Play, iOS para App Store, credenciais remotas e
  Clerk como autoridade. Eles não criam um app, não comprovam assinatura e não
  substituem contas Apple Developer, Google Play Console ou EAS.
- Definir preços públicos apenas depois da decisão comercial e da integração
  Stripe; evitar checkout fictício ou alegações de disponibilidade inexistente.
- Conectar notificações, colaboração e cobrança quando houver um caso funcional verificável.
- Executar build, deployment, smoke tests e observabilidade na Vercel.
- Preservar o PR em draft enquanto os checks externos obrigatórios não passarem.

## Fila canônica da integração

A sequência e os gates executáveis estão em
`apps/app/lib/executar/readiness.ts`. A ordem material é:

1. Validar a sessão/organização Clerk e a execução efetiva do runner Actions.
2. Confirmar exclusivamente o projeto Supabase autorizado
   `aaaftocmuiztyxdgclqt` e configurar Clerk como terceiro confiável.
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
- **Gate de integração:** Supabase explicitamente autorizado, RLS/Storage, Clerk real, CI e deployment verificados com serviços reais.
- **Gate de produção:** integração aprovada, segurança, disponibilidade, custo e experiência final demonstrados.

A aprovação de um gate de código nunca implica aprovação automática de integração ou produção.

## Handoff Git → Vercel

1. Importar `Sas-Executar/Sas-Executar` e selecionar `apps/app` como Root Directory.
2. Manter o framework Next.js e o fluxo de build do monorepo detectados pela
   Vercel.
3. Cadastrar as duas variáveis Clerk listadas acima ou instalar Clerk pelo
   Vercel Marketplace. Não cadastrar URL Prisma apenas para atender um scaffold
   que a aplicação operacional não utiliza.
4. Disparar o deployment pela sincronização Git.
5. Validar login Clerk, organização ativa, gravação no Supabase, reload e
   isolamento entre organizações antes de aprovar o Gate de integração.

Referências: [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
e [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Para IA sem chave dedicada, consultar
[AI Gateway OIDC](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc).
Para distribuição, consultar [EAS Build](https://docs.expo.dev/eas/json/).
