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

Estado: em execução.

## Onda 3 · Copiloto, Agent-007 e MCP

Estado: aguardando predecessores locais da Onda 2.

## Onda 4 · colaboração, mobile e GTM

Estado: aguardando predecessores locais das Ondas 2 e 3.

## Regra de decisão

Produção e GTM permanecem `NO-GO` até Gate 4 `PASSOU`, incluindo piloto real de
sete dias, zero CRITICAL, recovery/rollback comprovados e sign-off humano.
