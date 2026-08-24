# Integração final · AWS, Vercel e produção

## Autoridade vigente

- Identidade e tenant: Clerk Organizations.
- Estado canônico: runtime EXECUTAR em Aurora PostgreSQL privado.
- Acesso ao banco: RDS Data API; nunca abrir `5432` nem inventar `DATABASE_URL`.
- Evidências: S3 privado, criptografado, versionado e particionado por `clerk_org_id`.
- Runtime Vercel → AWS: credenciais temporárias por OIDC.
- Supabase, Neon e Vercel Blob: material histórico auditável, não runtime canônico.
- Região e conta autorizadas: `sa-east-1`, conta `250892133959`.

O checklist executável atual está em
`apps/app/lib/executar/production-readiness.ts`. O arquivo histórico
`apps/app/lib/executar/readiness.ts` e as migrations `supabase/` permanecem
somente para auditoria da transição anterior.

## Ordem obrigatória

1. Confirmar sessão e organização Clerk reais.
2. Confirmar GitHub Actions com steps executados e todos os checks verdes.
3. Alterar a conta AWS para `PAID` se o comando
   `aws freetier get-account-plan-state` ainda retornar outro plano.
4. Aplicar `infra/aws/template.yaml` pelo workflow
   `.github/workflows/aws-infra.yml`, usando o role OIDC já autorizado.
5. Executar todas as migrations de `infra/aws/migrations/` pela Data API.
6. Executar `scripts/aws/smoke-data-api.mjs` com duas organizações e comprovar
   SELECT, INSERT, UPDATE, DELETE e isolamento do S3.
7. Sincronizar no Preview apenas os nomes/ARNs de runtime: `AWS_REGION`,
   `AWS_ROLE_ARN`, `AURORA_DATABASE`, `AURORA_RESOURCE_ARN`,
   `AURORA_RUNTIME_SECRET_ARN` e `EVIDENCE_BUCKET`.
8. Publicar Preview no mesmo SHA e validar login, organização, persistência,
   reload, offline/reconciliação, upload/download e conflito otimista.
9. Validar Stripe por organização, AI Gateway, MCP autenticado, Liveblocks e
   Knock com serviços reais.
10. Executar golden path E2E, backup/restore, rollback, observabilidade,
    privacidade e piloto real de sete dias.
11. Iniciar Expo/EAS somente depois de web, sincronização, isolamento e sessão
    Clerk móvel aprovados.
12. Promover produção somente com zero CRITICAL e sign-off humano.

## Variáveis do aplicativo

### Obrigatórias para identidade real

```env
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

### Obrigatórias para persistência AWS real

```env
AWS_REGION=sa-east-1
AWS_ROLE_ARN=
AURORA_DATABASE=executar
AURORA_RESOURCE_ARN=
AURORA_RUNTIME_SECRET_ARN=
EVIDENCE_BUCKET=
```

### Integrações condicionais

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
LIVEBLOCKS_SECRET=
KNOCK_SECRET_API_KEY=
NEXT_PUBLIC_KNOCK_API_KEY=
NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

O Copiloto usa Vercel AI Gateway e OIDC da plataforma. Não adicionar chave
OpenAI ao repositório. `EXECUTAR_AI_MODEL` aceita outro identificador
`provedor/modelo` quando necessário.

## Gates objetivos

### Gate de código

- PWA e `NO VISUAL DRIFT` preservados.
- Typecheck, lint, testes e build verdes.
- CSP, rate limit, isolamento local, aprovações e ledger cobertos por testes.
- Produto, Copiloto, colaboração e GTM degradam com clareza sem segredos.

### Gate de integração

- Clerk real e duas organizações.
- CloudFormation, Aurora Data API, migrations, RLS e S3 reais.
- Sincronização entre aparelhos sem duplicação silenciosa.
- Stripe, AI Gateway, MCP, Liveblocks e Knock reais.
- GitHub Actions e Preview Vercel `READY` no mesmo SHA.

### Gate de produção

- Golden path E2E completo.
- Logs/métricas/alertas sem erro CRITICAL.
- Backup, restore e rollback comprovados.
- Termos e privacidade correspondem ao comportamento real.
- Piloto de sete dias com usuários reais.
- Zero CRITICAL e sign-off final.

### Gate mobile

- Gate de produção web aprovado.
- Sessão Clerk compatível com Expo.
- Mesmo estado canônico e isolamento comprovados.
- Builds Android e iOS reproduzíveis pelo EAS.

## Estado atual verificável

- O código local pode avançar sem serviços externos.
- A PWA legada permanece executável em `/legado/sprint-operacional/`.
- O Preview não deve receber acesso ao ambiente de produção por padrão.
- Produção e mobile permanecem bloqueados enquanto qualquer predecessor da
  matriz canônica estiver `NÃO PASSOU`.

## Rollback e recovery

- Aplicação: promover somente um Preview validado; rollback aponta novamente o
  alias para o deployment anterior, sem rebuild.
- Banco: migrations são aditivas e versionadas; mudanças destrutivas exigem
  plano separado. Validar restauração a partir de snapshot Aurora antes de GTM.
- Evidências: versionamento S3 e bloqueio público permanecem ativos; validar
  recuperação de uma versão anterior sem cruzar prefixos de tenant.
- Infraestrutura: `DeletionProtection` do Aurora e retenção de bucket/snapshots
  impedem que a remoção da stack apague dados silenciosamente.
