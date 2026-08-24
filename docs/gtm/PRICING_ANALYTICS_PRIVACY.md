# Preços, analytics e dados

## Preço

Nenhum valor comercial foi aprovado. A página `/pricing` permanece honesta e o
Stripe só pode receber produtos/preços depois de decisão sobre moeda, impostos,
trial, limites de IA, cancelamento, reembolso e suporte. Direito pertence à
organização Clerk, nunca ao usuário individual.

## Funil mínimo

| Evento | Finalidade | Identificador permitido |
| --- | --- | --- |
| landing_view | alcance | agregado Vercel |
| contact_submitted | intenção | correlation ID, sem mensagem |
| organization_activated | ativação | Clerk org ID no backend |
| first_delivery_completed | valor inicial | org, projeto e revisão |
| subscription_active | conversão | org, price e status |
| support_opened | operação | ticket/correlation ID |

Não enviar texto de evidência, mensagem do Copiloto, token, e-mail ou nome para
analytics de produto. Google Analytics é opcional; Vercel Analytics já está no
provider. A taxonomia precisa ser confirmada no Preview antes do piloto.

## Privacidade

As páginas locais `/legal/privacy` e `/legal/terms` descrevem o comportamento
atual e estão marcadas como pré-GTM. Revisão jurídica, retenção e processo formal
de titular são blockers explícitos do Gate 4.
