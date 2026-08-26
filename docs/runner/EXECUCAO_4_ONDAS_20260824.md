# Execução autônoma · quatro ondas · 2026-08-24

Este registro é versionado junto ao código e aos testes que comprova. Para cada
onda, o SHA de evidência é o commit que contém a respectiva seção e os arquivos
citados. Evidência externa só é marcada como aprovada quando provém do serviço
real; teste local não substitui integração, piloto nem sign-off.

## Onda 1 · fundação e segurança

### Implementado

- preservação integral da PWA em `/legado/sprint-operacional/`;
- CSP, Permissions Policy e Referrer Policy no runtime web;
- rate limit por organização e ator nas mutações operacionais e colaboração;
- fallback local fechado quando Upstash não está configurado;
- webhook Clerk sem log de payload pessoal;
- cron histórico degrada sem `DATABASE_URL`, mantendo Aurora Data API canônica;
- matriz executável de 32 etapas para código, integração, produção e mobile;
- checklist final reescrito para Clerk + AWS + S3 + Vercel OIDC;
- workflow AWS apontado à branch autorizada desta execução.

### Evidência no mesmo SHA

- `tests/onda-1/*.test.mjs` e `tests/ondas/*.test.mjs`: 344/344 passaram;
- `tests/ondas/production-readiness.test.mjs`: gates, RLS, conta/região,
  piloto, CSP, rate limit, privacidade e degradação do cron;
- `git diff --check`: passou;
- baseline visual preservada sem alteração em
  `apps/app/public/legado/sprint-operacional/`.

### Gate objetivo

- Código local da Onda 1: **PASSOU**.
- Integração real da Onda 1: **NÃO PASSOU** enquanto Actions no SHA, Clerk com
  duas organizações, AWS `PAID`, CloudFormation, Aurora, RLS, S3 e OIDC não
  tiverem evidência externa verde.

## Onda 2 · produto, sincronização e cobrança

### Implementado

- produto local-first, sincronização por revisão e conflito otimista preservados;
- evidências privadas mantidas no modelo canônico S3 por organização;
- Stripe deixa de procurar `stripeCustomerId` em usuário individual;
- checkout, assinatura e cancelamento derivam somente uma organização Clerk;
- direito de cobrança é armazenado em `privateMetadata.billing` da organização;
- eventos divergentes, sem tenant ou repetidos são recusados/ignorados.

### Evidência no mesmo SHA

- `tests/ondas/billing-organization.test.mjs` cobre tenant, cancelamento e replay;
- suíte de produto existente cobre persistência, offline, revisão, conflito,
  evidência e recusa de outro tenant.

### Gate objetivo

- Código local da Onda 2: **PASSOU** com 348/348 testes consolidados.
- Integração real da Onda 2: **NÃO PASSOU** até sincronização real entre dois
  aparelhos e Stripe real por organização serem comprovados.

## Onda 3 · Copiloto, Agent-007 e MCP

### Implementado

- Copiloto preserva estado canônico, orçamento e aprovação humana;
- Agent-007 inicia run Aurora antes de cada ferramenta;
- idempotência determinística inclui organização, projeto, revisão, tool e args;
- lock transacional por projeto impede execução concorrente silenciosa;
- gravação e aprovação são efeitos reservados e finalizados no ledger;
- replay concluído devolve o resultado gravado; run ativo/falho não repete efeito;
- lease expirada marca run abandonado como falho e libera recovery controlado;
- migration aditiva mantém `security invoker`, RLS e contexto Clerk.
- pacote `@repo/mcp` fixa autoridade Clerk, escopos e aprovação sem declarar o
  transporte remoto como ativo; registry operacional contém as 15 tools.

### Evidência no mesmo SHA

- `tests/ondas/agent-runtime-ledger.test.mjs` cobre sucesso, replay,
  concorrência lógica, falha de efeito e wiring Aurora;
- `infra/aws/migrations/004_agent_007_runtime.sql` contém as funções runtime;
- suíte Agent-007 existente preserva catálogo, política, bindings e projeções.

### Gate objetivo

- Código local da Onda 3: **PASSOU** com 353/353 testes consolidados.
- Integração real da Onda 3: **NÃO PASSOU** até AI Gateway e MCP autenticado
  executarem no Preview real com ledger Aurora comprovado.

## Onda 4 · colaboração, mobile e GTM

### Implementado

- colaboração, menções, notificações e projeção mobile permanecem isoladas;
- canal `/contact` agora envia via Resend, valida entrada e limita abuso;
- páginas locais de privacidade e termos descrevem o runtime sem falsa vigência;
- landing, disponibilidade/preços e analytics permanecem transparentes;
- runbooks de lançamento, piloto, suporte, rollback e recovery versionados;
- CLI `production-gate.mjs` produz decisão objetiva e retorna falha em `NO-GO`;
- workflow CI inventaria somente integrações canônicas AWS/Clerk/Vercel/Stripe;
- decisão posterior adiciona `apps/mobile` como scaffold Expo SDK 57 somente
  leitura, com Tamagui, controles SwiftUI no iOS e contrato compartilhado;
- ativação de escritas, distribuição EAS e lojas permanece bloqueada porque os
  predecessores reais ainda não passaram.

### Evidência no mesmo SHA

- `tests/ondas/gtm-operations.test.mjs` executa o gate e valida GTM/recovery;
- `tests/ondas/mcp-authority.test.mjs` valida tenant, scopes e aprovação;
- `operations/gtm/evidence.local.json` contém somente evidência local verificável;
- React revisado para ação de servidor, acessibilidade e bundle menor no contato;
- suíte Node consolidada: **359/359** testes passaram;
- Turbo typecheck: **22/22** tarefas passaram para app, API, web, MCP e pagamentos;
- builds Next.js de app, API e web: **7/7** tarefas passaram, incluindo os três
  testes Vitest dos aplicativos;
- Ultracite/Biome: **zero erros**; 17 avisos preexistentes de symlinks quebrados
  em `operations/native/anthropic/` permanecem inventariados;
- `git diff --check`: passou e a PWA preservada não contém diff contra `main`.

### Gate objetivo

- Código local da Onda 4: **PASSOU**.
- CI e Preview hospedados: pendentes da publicação do SHA desta branch.
- Gate 4 real: **NÃO PASSOU**; preço, serviços reais, E2E, recovery, piloto,
  mobile, zero CRITICAL e sign-off continuam pendentes.

## Regra de decisão

Produção e GTM permanecem `NO-GO` até Gate 4 `PASSOU`, incluindo piloto real de
sete dias, zero CRITICAL, recovery/rollback comprovados e sign-off humano.
