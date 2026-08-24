# Checklist de lançamento EXECUTAR

## Regra de decisão

GTM só recebe `GO` quando todos os gates de
`apps/app/lib/executar/production-readiness.ts` estiverem `PASSOU`. Um Preview
`READY`, quatro ondas locais ou um build verde isolado não autorizam venda nem
produção.

| Nível | Resultado exigido | Estado em 2026-08-24 |
| --- | --- | --- |
| Código | build, lint, typecheck e testes verdes | aguardando CI no SHA final |
| Integração | Clerk, AWS, S3, Stripe, MCP e Vercel reais | NÃO PASSOU |
| Produto | golden path e NO VISUAL DRIFT | local preservado; E2E real pendente |
| Segurança | RLS, tenant isolation, CSP, rate limit e secrets | código pronto; prova real pendente |
| Operação | logs, métricas, alertas, backup e rollback | NÃO PASSOU |
| Mercado | landing, onboarding, preços, analytics e suporte | parcial; preço e canais reais pendentes |
| Validação | piloto real de sete dias | NÃO INICIADO |
| Decisão | zero CRITICAL e sign-off final | NÃO PASSOU |

## Artefatos obrigatórios do Gate 4

- SHA único do código, CI e Preview;
- gravação ou trace do golden path com duas organizações;
- relatório RLS/S3 cobrindo SELECT, INSERT, UPDATE e DELETE;
- evento Stripe por organização e replay de webhook;
- initialize, tools/list e tools/call do MCP autenticado;
- entrega Liveblocks e Knock sem cruzamento de tenant;
- relatório de erros/métricas e teste de alerta;
- identificadores de snapshot restaurado, objeto S3 recuperado e deployment
  Vercel revertido;
- diário do piloto com sete dias corridos e usuários reais;
- lista de achados com `criticalCount = 0` e sign-off humano.

## Bloqueio mobile

`apps/mobile` só pode ser criado depois de web, sincronização, isolamento e
sessão Clerk móvel passarem. Até lá, os templates em `docs/runner/mobile/` são
o único preparo autorizado.
