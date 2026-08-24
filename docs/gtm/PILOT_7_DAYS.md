# Piloto real de sete dias

## Entrada

- Preview candidato e CI no mesmo SHA;
- duas organizações Clerk, ao menos dois usuários por organização;
- Aurora, S3, Stripe test mode, AI Gateway, MCP, Liveblocks e Knock ativos;
- owner operacional, canal de suporte e rollback de aplicação ensaiado;
- consentimento e textos legais revisados.

## Roteiro

| Dia | Fluxo mínimo | Evidência |
| --- | --- | --- |
| 1 | login, organização, projeto e primeira entrega | sessões e eventos por tenant |
| 2 | foco, progresso, reload e segundo aparelho | revisões sem perda/duplicação |
| 3 | evidência, download e tentativa cross-tenant | S3/RLS e negativas 403 |
| 4 | Copiloto, aprovação e replay Agent-007 | run/effects ledger |
| 5 | Stripe, MCP, colaboração e notificações | eventos dos serviços reais |
| 6 | falha controlada, backup/restore e rollback | tempos e artefatos recuperados |
| 7 | golden path final e entrevista | trace E2E e sign-off dos pilotos |

## Critérios de parada

- qualquer vazamento entre tenants, perda de estado ou segredo exposto;
- pagamento aplicado à organização errada;
- ação relevante sem aprovação humana;
- rollback ou restore não reproduzível;
- achado CRITICAL aberto.

Interrupção reinicia a contagem somente depois da correção e de novo baseline.
Teste automatizado ou sessão sintética não conta como dia de piloto real.
